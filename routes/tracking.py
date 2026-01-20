"""
Tracking routes for RapidShyp order tracking.
Handles webhooks, public tracking, and customer tracking endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from typing import Optional
from datetime import datetime
import json
import hashlib
import os

from database import get_session
from models import Order
from rapidshyp_utils import rapidshyp_client

router = APIRouter()

# Secret for generating tracking tokens
TRACKING_SECRET = os.getenv("TRACKING_SECRET", "varaha_track_secret_2026")

def generate_tracking_token(order_id: str) -> str:
    """Generate a secure token for public tracking URL."""
    data = f"{order_id}_{TRACKING_SECRET}"
    return hashlib.sha256(data.encode()).hexdigest()[:16]

def verify_tracking_token(order_id: str, token: str) -> bool:
    """Verify the tracking token."""
    expected = generate_tracking_token(order_id)
    return token == expected

# Status mapping: RapidShyp status -> Varaha step
RAPIDSHYP_STATUS_MAP = {
    "ORDER_PLACED": "ordered",
    "PICKUP_SCHEDULED": "packed",
    "PICKUP_GENERATED": "packed",
    "READY_TO_SHIP": "packed",
    "MANIFESTED": "packed",
    "PICKED_UP": "shipped",
    "IN_TRANSIT": "in_transit",
    "REACHED_DESTINATION_HUB": "in_transit",
    "OUT_FOR_DELIVERY": "out_for_delivery",
    "DELIVERED": "delivered",
    "RTO_INITIATED": "rto",
    "RTO_DELIVERED": "rto_delivered",
    "CANCELLED": "cancelled"
}

@router.post("/api/webhook/rapidshyp")
async def rapidshyp_webhook(request: Request, session: Session = Depends(get_session)):
    """
    Webhook endpoint for RapidShyp status updates.
    RapidShyp sends nested payload with records[].shipment_details[].track_scans[]
    """
    try:
        payload = await request.json()
        print(f"[WEBHOOK] Received RapidShyp update")
        
        # Handle RapidShyp's nested structure
        records = payload.get("records") or []
        
        if not records:
            # Fallback to flat structure (old format)
            awb = payload.get("awb") or payload.get("awb_number")
            order_id = payload.get("order_id") or payload.get("seller_order_id")
            status = payload.get("status") or payload.get("current_status")
            
            if not awb and not order_id:
                return {"status": "ignored", "reason": "no_records"}
            
            records = [{
                "seller_order_id": order_id,
                "shipment_details": [{
                    "awb": awb,
                    "shipment_status": status,
                    "track_scans": payload.get("scans") or []
                }]
            }]
        
        updated_orders = []
        
        for record in records:
            seller_order_id = record.get("seller_order_id")
            shipments = record.get("shipment_details") or []
            
            for shipment in shipments:
                awb = shipment.get("awb")
                shipment_status = shipment.get("shipment_status") or shipment.get("current_tracking_status_code")
                courier_name = shipment.get("courier_name")
                track_scans = shipment.get("track_scans") or []
                
                # Find order by AWB or seller_order_id
                order = None
                if awb:
                    order = session.exec(select(Order).where(Order.awb_number == awb)).first()
                if not order and seller_order_id:
                    order = session.exec(select(Order).where(Order.order_id == seller_order_id)).first()
                
                if not order:
                    print(f"[WEBHOOK] Order not found for AWB={awb}, OrderID={seller_order_id}")
                    continue
                
                # Map RapidShyp status codes to Varaha status
                status_code_map = {
                    "PSH": "packed",
                    "PUC": "shipped",
                    "SPD": "shipped",
                    "INT": "in_transit",
                    "RAD": "in_transit",
                    "OFD": "out_for_delivery",
                    "DEL": "delivered",
                    "DELIVERED": "delivered",
                    "RTO": "rto",
                    "RTO_INT": "rto",
                    "RTO_OFD": "rto",
                    "RTO_DEL": "rto_delivered",
                    "UND": "undelivered"
                }
                
                # Get status from shipment_status or latest scan
                varaha_status = order.status
                if shipment_status:
                    varaha_status = status_code_map.get(shipment_status.upper(), 
                                    RAPIDSHYP_STATUS_MAP.get(shipment_status.upper(), order.status))
                
                # Convert track_scans to our format
                tracking_history = []
                for scan in track_scans:
                    tracking_history.append({
                        "status": scan.get("scan", ""),
                        "location": scan.get("scan_location", ""),
                        "timestamp": scan.get("scan_datetime", ""),
                        "status_code": scan.get("rapidshyp_status_code", "")
                    })
                
                # Update order
                order.status = varaha_status
                order.tracking_data = json.dumps(tracking_history)
                if courier_name:
                    order.courier_name = courier_name
                
                # Update status_history
                try:
                    status_hist = json.loads(order.status_history or "[]")
                except:
                    status_hist = []
                
                status_hist.append({
                    "status": varaha_status,
                    "timestamp": datetime.utcnow().isoformat(),
                    "comment": f"RapidShyp: {shipment_status}"
                })
                order.status_history = json.dumps(status_hist)
                
                session.add(order)
                updated_orders.append(order.order_id)
                
                print(f"[WEBHOOK] Order {order.order_id} updated to status: {varaha_status}")
                
                # Trigger notifications for key statuses
                try:
                    from notifications import send_tracking_notification
                    if varaha_status in ["shipped", "out_for_delivery", "delivered"]:
                        send_tracking_notification(order, varaha_status)
                except Exception as e:
                    print(f"[WEBHOOK] Notification error: {e}")
        
        session.commit()
        
        return {"status": "success", "updated_orders": updated_orders}
        
    except Exception as e:
        print(f"[WEBHOOK] Error processing webhook: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@router.get("/api/orders/{order_id}/track")
def get_order_tracking(order_id: str, session: Session = Depends(get_session)):
    """
    Get tracking information for an order (requires authentication in production).
    """
    order = session.exec(select(Order).where(Order.order_id == order_id)).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Parse tracking data
    try:
        tracking_history = json.loads(order.tracking_data or "[]")
    except:
        tracking_history = []
    
    # Determine current step
    current_step = get_tracking_step(order.status)
    
    return {
        "order_id": order.order_id,
        "awb_number": order.awb_number,
        "courier_name": order.courier_name or "RapidShyp",
        "current_status": order.status,
        "current_step": current_step,
        "tracking_history": tracking_history,
        "tracking_token": generate_tracking_token(order.order_id),
        "estimated_delivery": get_estimated_delivery(order),
        "order_date": order.created_at.isoformat() if order.created_at else None
    }

@router.get("/api/track/{order_id}/{token}")
def public_track_order(order_id: str, token: str, session: Session = Depends(get_session)):
    """
    Public tracking endpoint - no login required.
    Token-based authentication for email/SMS links.
    """
    if not verify_tracking_token(order_id, token):
        raise HTTPException(status_code=403, detail="Invalid tracking link")
    
    order = session.exec(select(Order).where(Order.order_id == order_id)).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Parse tracking data
    try:
        tracking_history = json.loads(order.tracking_data or "[]")
    except:
        tracking_history = []
    
    current_step = get_tracking_step(order.status)
    
    # Return limited info for public view
    return {
        "order_id": order.order_id,
        "awb_number": order.awb_number,
        "courier_name": order.courier_name or "RapidShyp",
        "current_status": order.status,
        "current_step": current_step,
        "steps": get_steps_info(order),
        "tracking_history": tracking_history[-10:],  # Last 10 scans
        "order_date": order.created_at.isoformat() if order.created_at else None,
        "customer_name": order.customer_name.split()[0] if order.customer_name else ""  # Only first name
    }

@router.get("/api/orders/{order_id}/refresh-tracking")
def refresh_tracking(order_id: str, session: Session = Depends(get_session)):
    """
    Manually fetch latest tracking from RapidShyp API.
    Fallback when webhook is delayed.
    """
    order = session.exec(select(Order).where(Order.order_id == order_id)).first()
    
    if not order or not order.awb_number:
        raise HTTPException(status_code=404, detail="Order or AWB not found")
    
    # Call RapidShyp API
    result = rapidshyp_client.track_order(awb=order.awb_number)
    
    if result.get("status") == "error":
        return {"status": "error", "message": "Failed to fetch tracking"}
    
    # Update tracking data
    scans = result.get("scans") or result.get("tracking_data") or []
    current_status = result.get("current_status") or result.get("status")
    
    if scans:
        order.tracking_data = json.dumps(scans)
    
    if current_status:
        varaha_status = RAPIDSHYP_STATUS_MAP.get(current_status.upper(), order.status)
        order.status = varaha_status
    
    session.add(order)
    session.commit()
    
    return {"status": "success", "order_id": order.order_id, "tracking_data": scans}

def get_tracking_step(status: str) -> int:
    """Map status to stepper step number (1-6)."""
    step_map = {
        "pending": 1,
        "ordered": 1,
        "packed": 2,
        "shipped": 3,
        "in_transit": 4,
        "out_for_delivery": 5,
        "delivered": 6
    }
    return step_map.get(status, 1)

def get_estimated_delivery(order) -> Optional[str]:
    """Calculate estimated delivery based on order date."""
    if not order.created_at:
        return None
    from datetime import timedelta
    est = order.created_at + timedelta(days=5)
    return est.strftime("%d %b %Y")

def get_steps_info(order) -> list:
    """Get step-by-step info for stepper UI."""
    current_step = get_tracking_step(order.status)
    
    steps = [
        {
            "step": 1,
            "title": "Ordered",
            "description": "Order confirmed",
            "completed": current_step >= 1,
            "active": current_step == 1,
            "date": order.created_at.strftime("%d %b, %I:%M %p") if order.created_at else None
        },
        {
            "step": 2,
            "title": "Packed",
            "description": "Varaha craftsmen have packed your piece",
            "completed": current_step >= 2,
            "active": current_step == 2,
            "date": None
        },
        {
            "step": 3,
            "title": "Shipped",
            "description": f"AWB: {order.awb_number}" if order.awb_number else "Your piece is on the way",
            "completed": current_step >= 3,
            "active": current_step == 3,
            "date": None
        },
        {
            "step": 4,
            "title": "In Transit",
            "description": "Package moving through courier network",
            "completed": current_step >= 4,
            "active": current_step == 4,
            "date": None
        },
        {
            "step": 5,
            "title": "Out for Delivery",
            "description": "Your package is out for delivery today",
            "completed": current_step >= 5,
            "active": current_step == 5,
            "date": None
        },
        {
            "step": 6,
            "title": "Delivered",
            "description": "Package delivered successfully",
            "completed": current_step >= 6,
            "active": current_step == 6,
            "date": None
        }
    ]
    
    return steps
