from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict
from datetime import datetime

# Internal Imports
from database import get_session
from models import Address, Wishlist, Product, Customer, OrderReturn
from dependencies import get_current_user

router = APIRouter()

# --- Wishlist ---

@router.get("/api/wishlist", response_model=List[Dict])
def get_wishlist(
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get user's wishlist with product details"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    customer_id = current_user.id
    wishlist_items = session.exec(
        select(Wishlist).where(Wishlist.customer_id == customer_id)
    ).all()
    
    # Fetch product details
    result = []
    for item in wishlist_items:
        product = session.get(Product, item.product_id)
        if product:
            result.append({
                "id": item.id,
                "product_id": item.product_id,
                "added_at": item.added_at.isoformat(),
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "price": product.price,
                    "image": product.image,
                    "category": product.category,
                    "metal": product.metal,
                    "premium": product.premium
                }
            })
    
    return result

@router.post("/api/wishlist")
def add_to_wishlist(
    product_id: str,
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Add product to wishlist"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    customer_id = current_user.id
    
    # Check if product exists
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if already in wishlist
    existing = session.exec(
        select(Wishlist).where(
            Wishlist.customer_id == customer_id,
            Wishlist.product_id == product_id
        )
    ).first()
    
    if existing:
        return {"message": "Already in wishlist", "id": existing.id}
    
    # Add to wishlist
    wishlist_item = Wishlist(
        customer_id=customer_id,
        product_id=product_id
    )
    session.add(wishlist_item)
    session.commit()
    session.refresh(wishlist_item)
    
    return {
        "message": "Added to wishlist",
        "id": wishlist_item.id,
        "product_id": product_id
    }

@router.delete("/api/wishlist/{product_id}")
def remove_from_wishlist(
    product_id: str,
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Remove product from wishlist"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    customer_id = current_user.id
    
    wishlist_item = session.exec(
        select(Wishlist).where(
            Wishlist.customer_id == customer_id,
            Wishlist.product_id == product_id
        )
    ).first()
    
    if not wishlist_item:
        raise HTTPException(status_code=404, detail="Item not in wishlist")
    
    session.delete(wishlist_item)
    session.commit()
    
    return {"message": "Removed from wishlist"}

@router.post("/api/wishlist/sync")
def sync_wishlist(
    product_ids: List[str],
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Sync local wishlist to server (merge on login)"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    customer_id = current_user.id
    added_count = 0
    
    for product_id in product_ids:
        # Check if already exists
        existing = session.exec(
            select(Wishlist).where(
                Wishlist.customer_id == customer_id,
                Wishlist.product_id == product_id
            )
        ).first()
        
        if not existing:
            # Verify product exists
            product = session.get(Product, product_id)
            if product:
                wishlist_item = Wishlist(
                    customer_id=customer_id,
                    product_id=product_id
                )
                session.add(wishlist_item)
                added_count += 1
    
    session.commit()
    return {"message": f"Synced {added_count} items to wishlist"}

# --- Address ---

@router.get("/api/addresses", response_model=List[Address])
def get_addresses(
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get all addresses for current user"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    addresses = session.exec(
        select(Address)
        .where(Address.customer_id == current_user.id)
        .order_by(Address.is_default.desc(), Address.created_at.desc())
    ).all()
    
    return addresses

@router.post("/api/addresses", response_model=Address)
def add_address(
    address_data: Address,
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Add new address"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # If this is the first address or marked as default, unset other defaults
    if address_data.is_default:
        existing_defaults = session.exec(
            select(Address).where(
                Address.customer_id == current_user.id,
                Address.is_default == True
            )
        ).all()
        
        for addr in existing_defaults:
            addr.is_default = False
            session.add(addr)
    
    # Create new address
    new_address = Address(
        customer_id=current_user.id,
        label=address_data.label,
        full_name=address_data.full_name,
        phone=address_data.phone,
        address_line1=address_data.address_line1,
        address_line2=address_data.address_line2,
        city=address_data.city,
        state=address_data.state,
        pincode=address_data.pincode,
        country=address_data.country or "India",
        is_default=address_data.is_default,
        address_type=address_data.address_type or "both"
    )
    
    session.add(new_address)
    session.commit()
    session.refresh(new_address)
    
    return new_address

@router.put("/api/addresses/{address_id}", response_model=Address)
def update_address(
    address_id: int,
    address_data: Address,
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update existing address"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    address = session.get(Address, address_id)
    if not address or address.customer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # If setting as default, unset others
    if address_data.is_default and not address.is_default:
        existing_defaults = session.exec(
            select(Address).where(
                Address.customer_id == current_user.id,
                Address.is_default == True
            )
        ).all()
        
        for addr in existing_defaults:
            addr.is_default = False
            session.add(addr)
    
    # Update fields
    address.label = address_data.label
    address.full_name = address_data.full_name
    address.phone = address_data.phone
    address.address_line1 = address_data.address_line1
    address.address_line2 = address_data.address_line2
    address.city = address_data.city
    address.state = address_data.state
    address.pincode = address_data.pincode
    address.country = address_data.country or "India"
    address.is_default = address_data.is_default
    address.address_type = address_data.address_type
    address.updated_at = datetime.utcnow()
    
    session.add(address)
    session.commit()
    session.refresh(address)
    
    return address

@router.delete("/api/addresses/{address_id}")
def delete_address(
    address_id: int,
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Delete address"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    address = session.get(Address, address_id)
    if not address or address.customer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Address not found")
    
    session.delete(address)
    session.commit()
    
    return {"message": "Address deleted successfully"}


@router.put("/api/addresses/{address_id}/default")
def set_default_address(
    address_id: int,
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Set address as default"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    address = session.get(Address, address_id)
    if not address or address.customer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Unset all other defaults
    existing_defaults = session.exec(
        select(Address).where(
            Address.customer_id == current_user.id,
            Address.is_default == True
        )
    ).all()
    
    for addr in existing_defaults:
        addr.is_default = False
        session.add(addr)
    
    # Set this as default
    address.is_default = True
    session.add(address)
    session.commit()
    session.refresh(address)
    
    return address

@router.get("/api/customer/returns", response_model=List[OrderReturn])
def get_customer_returns(
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get customer's return requests"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    returns = session.exec(
        select(OrderReturn)
        .where(OrderReturn.customer_id == current_user.id)
        .order_by(OrderReturn.created_at.desc())
    ).all()
    
    return returns


from models import Order
from pydantic import BaseModel
from typing import Optional, List
import json
import os
import requests

class ReturnRequest(BaseModel):
    order_id: str
    reason: str
    description: Optional[str] = None
    items: Optional[list] = None  # List of item indices to return (for partial returns)
    images: Optional[List[str]] = None  # Image URLs from customer

@router.post("/api/customer/returns")
def create_return_request(
    return_data: ReturnRequest,
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Create a new return request"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find the order
    order = session.exec(
        select(Order).where(Order.order_id == return_data.order_id)
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verify order belongs to this customer (by email or user_id)
    if order.user_id:
        # If order has user_id, it must match current user's supabase ID
        # Note: current_user.id is the customer table ID, not supabase UUID
        # For now, check email match
        if order.email != current_user.email:
            raise HTTPException(status_code=403, detail="Order does not belong to you")
    else:
        if order.email != current_user.email:
            raise HTTPException(status_code=403, detail="Order does not belong to you")
    
    # Check if order is delivered
    if order.status.lower() not in ['delivered', 'completed']:
        raise HTTPException(status_code=400, detail="Return request can only be made for delivered orders")
    
    # Check 7-day return window
    if order.updated_at:
        days_since_delivery = (datetime.utcnow() - order.updated_at).days
        if days_since_delivery > 7:
            raise HTTPException(status_code=400, detail="Return window has expired (7 days from delivery)")
    
    # Check if return already exists for this order
    existing_return = session.exec(
        select(OrderReturn).where(OrderReturn.order_id == return_data.order_id)
    ).first()
    
    if existing_return:
        raise HTTPException(status_code=400, detail=f"Return request already exists. Status: {existing_return.status}")
    
    # Calculate refund amount (full amount for now, or partial if items specified)
    refund_amount = order.total_amount
    return_items = return_data.items or []
    
    # If specific items are specified, calculate partial refund
    if return_items:
        try:
            order_items = json.loads(order.items_json) if order.items_json else []
            partial_total = 0
            selected_items = []
            for idx in return_items:
                if 0 <= idx < len(order_items):
                    item = order_items[idx]
                    partial_total += item.get('price', 0) * item.get('quantity', 1)
                    selected_items.append(item)
            refund_amount = partial_total
            return_items = selected_items
        except:
            pass
    
    # Create return request
    new_return = OrderReturn(
        order_id=return_data.order_id,
        customer_id=current_user.id,
        reason=return_data.reason,
        description=return_data.description,
        status="pending",
        refund_amount=refund_amount,
        refund_method="original",
        return_items=json.dumps(return_items) if return_items else "[]"
    )
    
    session.add(new_return)
    session.commit()
    session.refresh(new_return)
    
    # --- Send Telegram Notification ---
    try:
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        chat_id = os.getenv("TELEGRAM_CHAT_ID")
        frontend_url = os.getenv("FRONTEND_URL", "https://varahajewels.in")
        
        if bot_token and chat_id:
            # Parse order items for product details
            order_items = []
            try:
                order_items = json.loads(order.items_json) if order.items_json else []
            except:
                pass
            
            product_names = ", ".join([item.get('name', 'Product') for item in order_items]) or "N/A"
            
            # Image links
            image_links = ""
            if return_data.images:
                for i, img in enumerate(return_data.images[:5]):  # Max 5 images
                    image_links += f"\n📷 [Image {i+1}]({img})"
            
            # Reason labels
            reason_labels = {
                "defective": "🔴 Product Defective/Damaged",
                "wrong_item": "🟠 Wrong Item Received",
                "not_as_expected": "🟡 Product Not As Expected",
                "size_issue": "🔵 Size/Fit Issue",
                "quality": "🟣 Quality Not Satisfactory",
                "changed_mind": "⚪ Customer Changed Mind",
                "other": "⚫ Other Reason"
            }
            
            reason_text = reason_labels.get(return_data.reason, return_data.reason)
            
            message = (
                f"🔄 *RETURN REQUEST RECEIVED*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n\n"
                f"📦 *Order ID:* `{order.order_id}`\n"
                f"👤 *Customer:* {order.customer_name}\n"
                f"📍 *Address:* {order.address}, {order.city} - {order.pincode}\n\n"
                f"🏷️ *Product(s):* {product_names}\n"
                f"💰 *Order Value:* ₹{order.total_amount}\n\n"
                f"📋 *Reason:* {reason_text}\n"
            )
            
            if return_data.description:
                message += f"📝 *Details:* {return_data.description}\n"
            
            if image_links:
                message += f"\n*Product Images:*{image_links}\n"
            
            message += f"\n━━━━━━━━━━━━━━━━━━━━━━\n"
            message += f"💵 *Refund Amount:* ₹{refund_amount}\n\n"
            
            # Inline keyboard for approve/reject
            keyboard = {
                "inline_keyboard": [
                    [
                        {"text": "✅ View in CMS", "url": f"{frontend_url}/admin/returns"}
                    ]
                ]
            }
            
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "Markdown",
                "reply_markup": keyboard,
                "disable_web_page_preview": False
            }
            
            requests.post(url, json=payload, timeout=10)
            print(f"Telegram notification sent for return request {new_return.id}")
    except Exception as e:
        print(f"Failed to send Telegram notification: {str(e)}")
    
    return {
        "message": "Return request submitted successfully",
        "return_id": new_return.id,
        "status": new_return.status,
        "refund_amount": new_return.refund_amount
    }

