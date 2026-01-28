from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import json
import uuid
import time
from datetime import datetime, timedelta

# Internal Imports
from database import get_session
from models import Order, Customer, AdminUser, SystemSetting, PaymentGateway, StoreSettings
from dependencies import get_current_user, oauth2_scheme, get_current_admin
from notifications import send_order_notifications, send_shipping_notifications
from rapidshyp_utils import rapidshyp_client
import razorpay
import traceback

router = APIRouter()

# --- Schemas ---
class OrderItem(BaseModel):
    productId: str
    productName: str
    variantId: Optional[str] = None
    variantName: Optional[str] = None
    quantity: int
    price: float

class OrderCreate(BaseModel):
    items: Optional[List[OrderItem]] = None
    # For single product checkout
    productId: Optional[str] = None
    variantId: Optional[str] = None
    quantity: Optional[int] = None
    
    amount: float
    name: str
    email: str
    contact: str
    address: str
    city: str
    state: Optional[str] = "Rajasthan" # Default to avoid validation error, but should be passed
    pincode: str
    couponCode: Optional[str] = None
    discount: Optional[float] = 0.0
    paymentMethod: str # 'cod' or 'online'
    codCharges: Optional[float] = 0.0
    isCartCheckout: Optional[bool] = False

import os

class ServiceabilityItem(BaseModel):
    itemReferenceId: Optional[str] = "default"
    skuId: Optional[str] = "default"

class ServiceabilityCheck(BaseModel):
    pickup_pincode: Optional[str] = None
    delivery_pincode: Optional[str] = None
    pincode: Optional[str] = None # Frontend sends 'pincode'
    weight: float = 0.5
    value: float = 1000.0
    mode: str = "COD"
    items: Optional[List[ServiceabilityItem]] = [] # For per-item check

class ShipOrderRequest(BaseModel):
    pickup_location: Optional[str] = None # Revert to None to force auto-resolution via API
    length: float = 10.0
    breadth: float = 10.0
    height: float = 5.0
    weight: float = 0.5 # kg

class ReturnRequest(BaseModel):
    items: List[dict] # {sku, quantity, reason_code}
    pickup_address: dict # {name, phone, address, pincode...}
    reason_code: str = "OTHER"

# --- Helper ---
def get_order_by_id_flexible(session: Session, order_id_input: str) -> Optional[Order]:
    """
    Try to find an order by ID, handling potential missing prefixes.
    1. Exact match
    2. With 'ORD-' prefix
    3. As Integer (Legacy)
    """
    # 1. Exact Match
    order = session.exec(select(Order).where(Order.order_id == order_id_input)).first()
    if order: return order
    
    # 2. Try adding prefix if not present
    if not order_id_input.startswith("ORD-"):
        prefixed_id = f"ORD-{order_id_input}"
        order = session.exec(select(Order).where(Order.order_id == prefixed_id)).first()
        if order: return order
        
    # 3. Try integer ID (Legacy)
    if order_id_input.isdigit():
        try:
            o_id = int(order_id_input)
            order = session.get(Order, o_id)
            if order: return order
        except:
            pass
            
    return None

def calculate_tax_breakdown(total_amount: float, state: str):
    """
    Calculate GST for Artificial Jewellery (HSN 7117 - 3%).
    Taxable Value = Total / 1.03
    GST Amount = Total - Taxable Value
    
    If State == Rajasthan (Intra-state):
        CGST = 1.5%, SGST = 1.5%
    Else (Inter-state):
        IGST = 3%
    """
    taxable_value = round(total_amount / 1.03, 2)
    gst_amount = round(total_amount - taxable_value, 2)
    
    # Normalize state string for comparison
    state_norm = state.strip().lower() if state else ""
    is_rajasthan = "rajasthan" in state_norm
    
    breakdown = {
        "hsn_code": "7117",
        "taxable_value": taxable_value,
        "cgst_amount": 0.0,
        "sgst_amount": 0.0,
        "igst_amount": 0.0,
        "state": state
    }
    
    if is_rajasthan:
        breakdown["cgst_amount"] = round(gst_amount / 2, 2)
        breakdown["sgst_amount"] = round(gst_amount / 2, 2)
    else:
        breakdown["igst_amount"] = gst_amount
        
    return breakdown

# --- Routes ---

@router.post("/api/create-cod-order")
def create_cod_order(order_data: OrderCreate, background_tasks: BackgroundTasks, token: Optional[str] = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    # Extract User ID from Supabase Token
    user_id = None
    user_email = None
    
    try:
        from supabase_utils import init_supabase
        s_client = init_supabase()
        if token and s_client:
            user_data_sb = s_client.auth.get_user(token)
            if user_data_sb and user_data_sb.user:
                user_id = user_data_sb.user.id  # This is the UUID
                # user_email = user_data_sb.user.email
                # print(f"DEBUG: Creating order for User UUID: {user_id}") 
                pass
    except Exception as e:
        # print(f"DEBUG: Supabase Token Check Failed: {e}")
        # Allow order creation without user_id for guest checkout
        pass

    # Guest Handling: Ensure Customer Exists
    if not user_id:
        existing_cust = session.exec(select(Customer).where(Customer.email == order_data.email)).first()
        if not existing_cust:
            # Create Guest Customer
            new_guest = Customer(
                full_name=order_data.name,
                email=order_data.email,
                provider="guest",
                is_active=True
            )
            session.add(new_guest)
            session.commit()

    # Calculate Tax
    tax_data = calculate_tax_breakdown(order_data.amount, order_data.state)

    # Generate Order ID
    order_id_str = f"ORD-{int(time.time())}"
    
    items_list = []
    if order_data.items:
        items_list = [item.dict() for item in order_data.items]
    else:
         items_list = [{
            "productId": order_data.productId,
            "productName": "Direct Product", # Ideally fetch name
            "variantId": order_data.variantId,
            "quantity": order_data.quantity,
            "price": order_data.amount / order_data.quantity if order_data.quantity else 0
        }]

    # Calculate Total Amount including COD charges
    final_amount = order_data.amount
    if order_data.codCharges:
        final_amount += order_data.codCharges

    new_order = Order(
        order_id=order_id_str,
        customer_name=order_data.name,
        email=order_data.email,
        phone=order_data.contact,
        address=order_data.address,
        city=order_data.city,
        pincode=order_data.pincode,
        total_amount=final_amount,
        payment_method="cod",
        status="pending",
        user_id=uuid.UUID(user_id) if user_id else None,
        items_json=json.dumps(items_list),
        
        # Tax Fields
        state=order_data.state,
        hsn_code=tax_data["hsn_code"],
        taxable_value=tax_data["taxable_value"],
        cgst_amount=tax_data["cgst_amount"],
        sgst_amount=tax_data["sgst_amount"],
        igst_amount=tax_data["igst_amount"],
        
        status_history=json.dumps([{
            "status": "pending",
            "timestamp": datetime.utcnow().isoformat(),
            "comment": "Order placed via COD"
        }])
    )
    
    session.add(new_order)
    session.commit()
    session.refresh(new_order)
    
    # Notify
    background_tasks.add_task(send_order_notifications, new_order.dict())
    
    return {"ok": True, "orderId": new_order.order_id}

@router.post("/api/create-checkout-session")
def create_checkout_session(order_data: OrderCreate, token: Optional[str] = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    # 1. Find Active Gateway
    gateway = session.exec(select(PaymentGateway).where(PaymentGateway.is_active == True)).first()
    
    if not gateway:
        raise HTTPException(status_code=400, detail="No active payment gateway found. Please contact support.")

    # AUTH CHECK: Put user_id in notes if logged in
    user_id = None
    try:
        from supabase_utils import init_supabase
        s_client = init_supabase()
        if token and s_client:
            user_data_sb = s_client.auth.get_user(token)
            if user_data_sb and user_data_sb.user:
                user_id = str(user_data_sb.user.id)
    except:
        pass

    creds = json.loads(gateway.credentials_json)

    # 2. Initialize Provider
    if gateway.provider == "razorpay":
        try:
            client = razorpay.Client(auth=(creds.get("key_id"), creds.get("key_secret")))
            
            notes = {
                "email": order_data.email,
                "phone": order_data.contact
            }
            if user_id:
                notes["user_id"] = user_id
            
            data = {
                "amount": int(order_data.amount * 100), # Amount in paise
                "currency": "INR",
                "receipt": f"rcpt_{int(time.time())}",
                "notes": notes
            }
            
            razorpay_order = client.order.create(data=data)
            
            return {
                "id": razorpay_order['id'],
                "orderId": razorpay_order['id'], # Added alias for frontend compatibility
                "amount": razorpay_order['amount'],
                "currency": razorpay_order['currency'],
                "key": creds.get("key_id"), 
                "name": "Varaha Jewels",
                "description": "Payment for Order",
                "prefill": {
                    "name": order_data.name,
                    "email": order_data.email,
                    "contact": order_data.contact
                },
                "theme": {
                    "color": "#B8860B"
                },
                "provider": "razorpay"
            }
        except Exception as e:
            print(f"Razorpay Error: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Gateway Error: {str(e)}")
    
    elif gateway.provider == "phonepe":
        try:
            import requests
            
            # Get credentials - Support both v1 (salt_key) and v2 (client_secret) formats
            client_id = creds.get("client_id") or creds.get("merchant_id")
            client_secret = creds.get("client_secret") or creds.get("salt_key")
            client_version = creds.get("client_version", "1")
            environment = creds.get("environment", "SANDBOX").upper()
            
            if not client_id or not client_secret:
                raise HTTPException(status_code=500, detail="PhonePe credentials not configured properly")
            
            # API URLs for v2 Standard Checkout
            # Reference: https://developer.phonepe.com/docs/pg-checkout-standard/
            if environment == "PRODUCTION":
                auth_url = "https://api.phonepe.com/apis/identity-manager/v1/oauth/token"
                pay_url = "https://api.phonepe.com/apis/pg/checkout/v2/pay"
            else:
                # Sandbox/UAT environment
                auth_url = "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token"
                pay_url = "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay"
            
            print(f"DEBUG PhonePe: Environment={environment}, AuthURL={auth_url}")
            print(f"DEBUG PhonePe: ClientID={client_id[:8]}..., ClientVersion={client_version}")
            
            # Frontend URL for redirect
            frontend_url = os.getenv("FRONTEND_URL", "https://varahajewels.in")
            backend_url = os.getenv("BACKEND_URL", "https://backend.varahajewels.in")
            
            # Step 1: Get OAuth Access Token
            auth_response = requests.post(
                auth_url,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={
                    "client_id": client_id,
                    "client_version": client_version,
                    "client_secret": client_secret,
                    "grant_type": "client_credentials"
                },
                timeout=30
            )
            
            auth_data = auth_response.json()
            print(f"PhonePe Auth Response: {auth_data}")
            
            if not auth_data.get("access_token"):
                error_msg = auth_data.get("message") or auth_data.get("error_description") or "Failed to get access token"
                raise HTTPException(status_code=400, detail=f"PhonePe Auth: {error_msg}")
            
            access_token = auth_data["access_token"]
            
            # Step 2: Create Payment Request
            merchant_order_id = f"ORD-{int(time.time())}-{uuid.uuid4().hex[:6]}"
            amount_in_paise = int(order_data.amount * 100)
            
            pay_payload = {
                "merchantOrderId": merchant_order_id,
                "amount": amount_in_paise,
                "expireAfter": 1200,  # 20 minutes
                "metaInfo": {
                    "udf1": order_data.email,
                    "udf2": order_data.contact
                },
                "paymentFlow": {
                    "type": "PG_CHECKOUT",
                    "message": f"Payment for Order {merchant_order_id}",
                    "merchantUrls": {
                        "redirectUrl": f"{frontend_url}/payment-callback?orderId={merchant_order_id}"
                    }
                }
            }
            
            pay_response = requests.post(
                pay_url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"O-Bearer {access_token}"
                },
                json=pay_payload,
                timeout=30
            )
            
            pay_data = pay_response.json()
            print(f"PhonePe Pay Response: {pay_data}")
            
            if pay_data.get("orderId") and pay_data.get("redirectUrl"):
                return {
                    "provider": "phonepe",
                    "orderId": merchant_order_id,
                    "phonepeOrderId": pay_data.get("orderId"),
                    "redirectUrl": pay_data.get("redirectUrl"),
                    "amount": amount_in_paise,
                    "currency": "INR"
                }
            else:
                error_msg = pay_data.get("message") or "Payment initiation failed"
                print(f"PhonePe Error: {pay_data}")
                raise HTTPException(status_code=400, detail=f"PhonePe: {error_msg}")
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"PhonePe Error: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"PhonePe Gateway Error: {str(e)}")
    
    raise HTTPException(status_code=400, detail=f"Provider {gateway.provider} not implemented completely.")


@router.post("/api/phonepe/callback")
def phonepe_callback(payload: Dict[str, Any], background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """
    PhonePe Server-to-Server Callback
    Called by PhonePe when payment status changes
    """
    try:
        import hashlib
        import base64
        
        # Get active PhonePe gateway
        gateway = session.exec(select(PaymentGateway).where(PaymentGateway.provider == "phonepe")).first()
        if not gateway:
            raise HTTPException(status_code=400, detail="PhonePe gateway not configured")
        
        creds = json.loads(gateway.credentials_json)
        salt_key = creds.get("salt_key")
        salt_index = creds.get("salt_index", "1")
        
        # Verify callback signature
        x_verify = payload.get("x-verify") or payload.get("X-VERIFY", "")
        response_base64 = payload.get("response", "")
        
        if response_base64:
            # Verify signature
            expected_checksum = hashlib.sha256((response_base64 + "/pg/v1/status" + salt_key).encode()).hexdigest() + "###" + salt_index
            
            # Decode response
            response_json = base64.b64decode(response_base64).decode()
            response_data = json.loads(response_json)
            
            print(f"PhonePe Callback Data: {response_data}")
            
            if response_data.get("code") == "PAYMENT_SUCCESS":
                transaction_id = response_data.get("data", {}).get("merchantTransactionId")
                phonepe_txn_id = response_data.get("data", {}).get("transactionId")
                
                # TODO: Create order in database similar to Razorpay callback
                # For now, log success
                print(f"PhonePe Payment SUCCESS: TxnID={transaction_id}, PhonePeTxnID={phonepe_txn_id}")
                
                return {"status": "success", "message": "Payment received"}
            else:
                print(f"PhonePe Payment Status: {response_data.get('code')}")
                return {"status": "received", "code": response_data.get("code")}
        
        return {"status": "received"}
        
    except Exception as e:
        print(f"PhonePe Callback Error: {traceback.format_exc()}")
        return {"status": "error", "message": str(e)}


@router.get("/api/phonepe/status/{transaction_id}")
def check_phonepe_status(transaction_id: str, session: Session = Depends(get_session)):
    """
    Check PhonePe payment status using v2 OAuth API
    Called by frontend to verify payment after redirect
    """
    try:
        import requests
        
        # Get active PhonePe gateway
        gateway = session.exec(select(PaymentGateway).where(PaymentGateway.provider == "phonepe")).first()
        if not gateway:
            raise HTTPException(status_code=400, detail="PhonePe gateway not configured")
        
        creds = json.loads(gateway.credentials_json)
        
        # Get v2 OAuth credentials
        client_id = creds.get("client_id") or creds.get("merchant_id")
        client_secret = creds.get("client_secret") or creds.get("salt_key")
        client_version = creds.get("client_version", "1")
        environment = creds.get("environment", "SANDBOX").upper()
        
        if not client_id or not client_secret:
            raise HTTPException(status_code=500, detail="PhonePe credentials not configured properly")
        
        # API URLs based on environment
        if environment == "PRODUCTION":
            auth_url = "https://api.phonepe.com/apis/identity-manager/v1/oauth/token"
            status_url = f"https://api.phonepe.com/apis/pg/checkout/v2/order/{transaction_id}/status"
        else:
            auth_url = "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token"
            status_url = f"https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/{transaction_id}/status"
        
        print(f"DEBUG PhonePe Status: Checking order {transaction_id}")
        print(f"DEBUG PhonePe Status: Environment={environment}, URL={status_url}")
        
        # Step 1: Get OAuth Access Token
        auth_response = requests.post(
            auth_url,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "client_id": client_id,
                "client_version": client_version,
                "client_secret": client_secret,
                "grant_type": "client_credentials"
            },
            timeout=30
        )
        
        auth_data = auth_response.json()
        print(f"DEBUG PhonePe Status Auth: {auth_data}")
        
        if not auth_data.get("access_token"):
            error_msg = auth_data.get("message") or auth_data.get("error_description") or "Auth failed"
            return {
                "success": False,
                "status": "AUTH_FAILED",
                "message": f"PhonePe Auth: {error_msg}"
            }
        
        access_token = auth_data["access_token"]
        
        # Step 2: Check Order Status
        status_response = requests.get(
            status_url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"O-Bearer {access_token}"
            },
            timeout=30
        )
        
        response_data = status_response.json()
        print(f"DEBUG PhonePe Status Response: {response_data}")
        
        # Parse v2 response format
        state = response_data.get("state", "").upper()
        
        if state == "COMPLETED":
            return {
                "success": True,
                "status": "SUCCESS",
                "transactionId": transaction_id,
                "amount": response_data.get("amount"),
                "paymentDetails": response_data.get("paymentDetails", {})
            }
        elif state in ["PENDING", "INITIATED"]:
            return {
                "success": False,
                "status": "PENDING",
                "message": "Payment is being processed"
            }
        elif state == "FAILED":
            return {
                "success": False,
                "status": "FAILED",
                "message": response_data.get("errorMessage") or "Payment failed"
            }
        else:
            return {
                "success": False,
                "status": response_data.get("state", "UNKNOWN"),
                "message": response_data.get("errorMessage") or "Payment status unknown"
            }
            
    except Exception as e:
        print(f"PhonePe Status Check Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/phonepe/confirm-order")
def confirm_phonepe_order(payload: Dict[str, Any], background_tasks: BackgroundTasks, token: Optional[str] = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    """
    Confirm PhonePe payment and create order in database
    Called by frontend after successful payment redirect
    """
    try:
        import requests
        
        transaction_id = payload.get("transaction_id") or payload.get("orderId")
        order_data = payload.get("order_data", {})
        
        if not transaction_id:
            raise HTTPException(status_code=400, detail="Transaction ID required")
        
        if not order_data:
            raise HTTPException(status_code=400, detail="Order data required")
        
        # Check if order already exists to prevent duplicates
        existing_order = session.exec(select(Order).where(Order.order_id == transaction_id)).first()
        if existing_order:
            print(f"DEBUG PhonePe: Order {transaction_id} already exists")
            return {"ok": True, "orderId": existing_order.order_id, "message": "Order already exists"}
        
        # Get active PhonePe gateway
        gateway = session.exec(select(PaymentGateway).where(PaymentGateway.provider == "phonepe")).first()
        if not gateway:
            raise HTTPException(status_code=400, detail="PhonePe gateway not configured")
        
        creds = json.loads(gateway.credentials_json)
        client_id = creds.get("client_id") or creds.get("merchant_id")
        client_secret = creds.get("client_secret") or creds.get("salt_key")
        client_version = creds.get("client_version", "1")
        environment = creds.get("environment", "SANDBOX").upper()
        
        # API URLs based on environment
        if environment == "PRODUCTION":
            auth_url = "https://api.phonepe.com/apis/identity-manager/v1/oauth/token"
            status_url = f"https://api.phonepe.com/apis/pg/checkout/v2/order/{transaction_id}/status"
        else:
            auth_url = "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token"
            status_url = f"https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/{transaction_id}/status"
        
        # Get OAuth Token
        auth_response = requests.post(
            auth_url,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "client_id": client_id,
                "client_version": client_version,
                "client_secret": client_secret,
                "grant_type": "client_credentials"
            },
            timeout=30
        )
        
        auth_data = auth_response.json()
        if not auth_data.get("access_token"):
            raise HTTPException(status_code=400, detail="PhonePe authentication failed")
        
        access_token = auth_data["access_token"]
        
        # Check Payment Status
        status_response = requests.get(
            status_url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"O-Bearer {access_token}"
            },
            timeout=30
        )
        
        response_data = status_response.json()
        print(f"DEBUG PhonePe Confirm: Status Response = {response_data}")
        
        state = response_data.get("state", "").upper()
        
        if state != "COMPLETED":
            return {
                "ok": False,
                "status": state,
                "message": response_data.get("errorMessage") or "Payment not completed"
            }
        
        # Payment is VERIFIED - Now create order
        print(f"DEBUG PhonePe: Payment verified, creating order {transaction_id}")
        
        # Extract user_id from token if available
        user_id = None
        try:
            if token:
                from supabase_utils import init_supabase
                s_client = init_supabase()
                if s_client:
                    user_data_sb = s_client.auth.get_user(token)
                    if user_data_sb and user_data_sb.user:
                        user_id = user_data_sb.user.id
                        print(f"DEBUG PhonePe: Linked to User UUID: {user_id}")
        except Exception as e:
            print(f"DEBUG PhonePe: Token check failed: {e}")
        
        # Guest handling
        if not user_id:
            existing_cust = session.exec(select(Customer).where(Customer.email == order_data.get('email'))).first()
            if not existing_cust:
                new_guest = Customer(
                    full_name=order_data.get('name'),
                    email=order_data.get('email'),
                    provider="guest",
                    is_active=True
                )
                session.add(new_guest)
                session.commit()
        
        # Prepare items
        items = order_data.get('items', [])
        if not items and order_data.get('productId'):
            items = [{
                "productId": order_data.get('productId'),
                "productName": "Direct Product",
                "variantId": order_data.get('variantId'),
                "quantity": order_data.get('quantity'),
                "price": order_data.get('amount')
            }]
        
        # Calculate Tax
        state_input = order_data.get('state', '')
        tax_data = calculate_tax_breakdown(order_data.get('amount', 0), state_input)
        
        # Create Order
        new_order = Order(
            order_id=transaction_id,
            customer_name=order_data.get('name'),
            email=order_data.get('email'),
            phone=order_data.get('contact'),
            address=order_data.get('address'),
            city=order_data.get('city'),
            pincode=order_data.get('pincode'),
            total_amount=order_data.get('amount'),
            payment_method="online",
            status="paid",
            email_status="pending",
            user_id=uuid.UUID(user_id) if user_id else None,
            items_json=json.dumps(items),
            state=state_input,
            hsn_code=tax_data["hsn_code"],
            taxable_value=tax_data["taxable_value"],
            cgst_amount=tax_data["cgst_amount"],
            sgst_amount=tax_data["sgst_amount"],
            igst_amount=tax_data["igst_amount"],
            status_history=json.dumps([{
                "status": "paid",
                "timestamp": datetime.utcnow().isoformat(),
                "comment": f"Payment via PhonePe. TxnID: {transaction_id}"
            }])
        )
        
        session.add(new_order)
        session.commit()
        session.refresh(new_order)
        
        # Send notifications
        background_tasks.add_task(send_order_notifications, new_order.dict())
        
        print(f"DEBUG PhonePe: Order {new_order.order_id} created successfully")
        
        return {
            "ok": True,
            "orderId": new_order.order_id,
            "amount": new_order.total_amount
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"PhonePe Confirm Order Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/update-order-status")
def update_order_status_callback(payload: Dict[str, Any], background_tasks: BackgroundTasks, token: Optional[str] = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    try:
        # Verify Razorpay Signature for Security
        # 1. Get Payment Data
        razorpay_payment_id = payload.get("razorpay_payment_id")
        razorpay_order_id = payload.get("razorpay_order_id")
        razorpay_signature = payload.get("razorpay_signature")
        order_data = payload.get("order_data")
        
        if not order_data or not razorpay_payment_id or not razorpay_order_id or not razorpay_signature:
             raise HTTPException(status_code=400, detail="Missing payment data")

        # 2. Get Active Gateway Secret
        gateway = session.exec(select(PaymentGateway).where(PaymentGateway.is_active == True)).first()
        if not gateway or gateway.provider != "razorpay":
            raise HTTPException(status_code=500, detail="Active gateway configuration error")
        
        creds = json.loads(gateway.credentials_json)
        key_secret = creds.get("key_secret")

        # 3. Verify Signature
        try:
            client = razorpay.Client(auth=(creds.get("key_id"), key_secret))
            
            params_dict = {
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            }
            
            # This will raise SignatureVerificationError if fails
            client.utility.verify_payment_signature(params_dict)
            
        except Exception as e:
            print(f"Signature Verification Failed: {e}")
            raise HTTPException(status_code=400, detail="Invalid Payment Signature")
             
        # Create the actual order in DB now that payment is VERIFIED
        # Or update if we created it as 'awaiting_payment' earlier.
        # Logic: Create new order as 'paid'
        
        # Extract User ID if passed (frontend might need to pass it, or we rely on creating guest)
        # Ideally frontend calls this with Auth token, but Razorpay callback might be public.
        # For now, let's assume we create it based on payload data.
        
        items = order_data.get('items', [])
        if not items and order_data.get('productId'):
            items = [{
                "productId": order_data.get('productId'),
                "productName": "Direct Product",
                "variantId": order_data.get('variantId'),
                "quantity": order_data.get('quantity'),
                "price": order_data.get('amount')
            }]

        # --- LOGIC UPDATE: Prioritize Logged-in User ---
        user_id = None
        
        # 1. Try to get User ID from Token (If request came from Frontend with Auth)
        try:
            if token:
                from supabase_utils import init_supabase
                s_client = init_supabase()
                if s_client:
                    user_data_sb = s_client.auth.get_user(token)
                    if user_data_sb and user_data_sb.user:
                        user_id = user_data_sb.user.id
                        print(f"DEBUG: Order linked to Logged-in User UUID: {user_id}")
        except Exception as e:
            print(f"DEBUG: Token check failed in callback: {e}")

        # 2. Fallback: Try to get user_id from Razorpay Notes (Secure - set during checkout session)
        if not user_id:
            try:
                # Fetch the order from Razorpay to get the notes
                # client is already initialized above
                rzp_order_details = client.order.fetch(razorpay_order_id)
                if rzp_order_details and 'notes' in rzp_order_details:
                     notes_uid = rzp_order_details['notes'].get('user_id')
                     if notes_uid:
                         user_id = notes_uid
                         print(f"DEBUG: Found user_id in Razorpay Notes: {user_id}")
            except Exception as e:
                print(f"DEBUG: Failed to fetch Razorpay notes: {e}")

        # 3. Guest Handling: Create Guest Customer if no user_id found (same as COD flow)
        if not user_id:
            existing_cust = session.exec(select(Customer).where(Customer.email == order_data.get('email'))).first()
            if not existing_cust:
                # Create Guest Customer - DO NOT link order to any user_id
                new_guest = Customer(
                    full_name=order_data.get('name'),
                    email=order_data.get('email'),
                    provider="guest",
                    is_active=True
                )
                session.add(new_guest)
                session.commit()
                # print(f"DEBUG: Created Guest Customer for email: [MASKED]")
            # NOTE: Do NOT set user_id from email match - this is a guest order
            # Order will have user_id=None which is correct for guest checkout
            print(f"DEBUG: Guest Order - user_id will be None")
        
        # Calculate Tax
        state_input = order_data.get('state', '')
        # If state not in order_data, try to extract from address? No, assume frontend sends it.
        # Fallback to empty string which defaults to IGST
        tax_data = calculate_tax_breakdown(order_data.get('amount'), state_input)

        new_order = Order(
            order_id=f"ORD-{razorpay_order_id}" if razorpay_order_id else f"ORD-{int(time.time())}",
            customer_name=order_data.get('name'),
            email=order_data.get('email'),
            phone=order_data.get('contact'),
            address=order_data.get('address'),
            city=order_data.get('city'),
            pincode=order_data.get('pincode'),
            total_amount=order_data.get('amount'),
            payment_method="online",
            status="paid",
            email_status="pending", # Explicitly set default
            user_id=uuid.UUID(user_id) if user_id else None,
            items_json=json.dumps(items),
            
            # Tax Fields
            state=state_input,
            hsn_code=tax_data["hsn_code"],
            taxable_value=tax_data["taxable_value"],
            cgst_amount=tax_data["cgst_amount"],
            sgst_amount=tax_data["sgst_amount"],
            igst_amount=tax_data["igst_amount"],
            
            status_history=json.dumps([{
                "status": "paid",
                "timestamp": datetime.utcnow().isoformat(),
                "comment": f"Payment Successful. Ref: {razorpay_payment_id}"
            }])
        )
        
        session.add(new_order)
        session.commit()
        session.refresh(new_order)
        
        background_tasks.add_task(send_order_notifications, new_order.dict())
        
        return {"ok": True, "orderId": new_order.order_id}

    except Exception as e:
        print(f"CRITICAL API ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=f"DEBUG ERROR: {str(e)}")


@router.post("/api/orders", response_model=Order)
def create_order(order: Order, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    try:
        session.add(order)
        session.commit()
        session.refresh(order)
        
        # Send notifications in background
        background_tasks.add_task(send_order_notifications, order.dict())
        
        return order
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api/orders", response_model=List[Order])
def read_orders(current_user: AdminUser = Depends(get_current_admin), session: Session = Depends(get_session)):
    orders = session.exec(select(Order)).all()
    return orders

@router.get("/api/customer/orders", response_model=List[Order])
def read_my_orders(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    user_id = None
    
    # Get user_id from Supabase Token (ONLY way to identify user)
    try:
        from supabase_utils import init_supabase
        s_client = init_supabase()
        if s_client:
            user_data = s_client.auth.get_user(token)
            if user_data and user_data.user:
                user_id = user_data.user.id  # UUID string
                print(f"DEBUG: Supabase User UUID: {user_id}")
    except Exception as e:
        print(f"DEBUG: Supabase token check failed: {e}")
            
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token. Please login again.")

    # Fetch Orders ONLY by user_id (UUID) - Strict user isolation
    orders = []
    
    print(f"DEBUG: Fetching orders ONLY for User UUID: {user_id}")
    try:
        orders = session.exec(
            select(Order)
            .where(Order.user_id == uuid.UUID(user_id))
            .order_by(Order.created_at.desc())
        ).all()
        print(f"DEBUG: Found {len(orders)} orders for this user")
    except Exception as e:
        print(f"DEBUG: UUID query error: {e}")
        orders = []

    return orders

@router.get("/api/orders/{order_id}", response_model=Order)
def read_order(order_id: str, session: Session = Depends(get_session)):
    order = get_order_by_id_flexible(session, order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# --- RapidShyp Integration Routes ---

@router.post("/api/admin/orders/{order_id}/ship")
def ship_order(order_id: str, ship_req: ShipOrderRequest, background_tasks: BackgroundTasks, current_user: AdminUser = Depends(get_session), session: Session = Depends(get_session)):
    # Find order
    order = get_order_by_id_flexible(session, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.shipping_id:
         raise HTTPException(status_code=400, detail="Order already shipped")

    # Prepare data for RapidShyp
    # Parse items
    try:
        items = json.loads(order.items_json)
    except:
        items = []

    # Check RapidShyp Toggle from StoreSettings
    store_settings = session.get(StoreSettings, 1)
    rapidshyp_enabled = store_settings.rapidshyp_enabled.lower() == "true" if store_settings and store_settings.rapidshyp_enabled else False

    if not rapidshyp_enabled:
        # Simulate Shipment
        print("RapidShyp Disabled: Simulating Shipment")
        mock_shipment_id = f"MOCK-SHIP-{int(time.time())}"
        mock_awb = f"MOCK-AWB-{int(time.time())}"
        order.shipping_id = mock_shipment_id
        order.awb_number = mock_awb
        order.courier_name = "Mock Courier"
        order.status = "Shipped"
        
        status_update = {"status": "Shipped", "timestamp": datetime.utcnow().isoformat(), "comment": "Order shipped via Mock Courier"}
        status_history = json.loads(order.status_history) if order.status_history else []
        status_history.append(status_update)
        order.status_history = json.dumps(status_history)
        
        session.add(order)
        session.commit()
        session.refresh(order)
        
        # Trigger shipping notification email
        background_tasks.add_task(send_shipping_notifications, order.dict())
        print(f"DEBUG: Shipping notification triggered for mock shipment {mock_shipment_id}")
            
        return {"ok": True, "shipment": {"shipmentId": mock_shipment_id, "awb": mock_awb, "courierName": "Mock Courier"}}

    # Prepare data for RapidShyp
    order_data = {
        "orderId": order.order_id,
        "orderDate": order.created_at.strftime("%Y-%m-%d"),
        "customer_name": order.customer_name,
        "email": order.email,
        "phone": order.phone,
        "address": order.address,
        "city": order.city,
        "pincode": order.pincode,
        "state": "Maharashtra", # TODO: Store state in Order model or extract from address
        "items": items,
        "payment_method": order.payment_method.upper(), # COD or PREPAID
        "total_amount": order.total_amount,
        "length": ship_req.length,
        "breadth": ship_req.breadth,
        "height": ship_req.height,
        "weight": ship_req.weight
    }
    
    # Resolve Pickup Location if it's a pincode
    final_pickup_location = ship_req.pickup_location
    
    # If generic or pincode provided, try to auto-resolve
    if not final_pickup_location or (isinstance(final_pickup_location, str) and final_pickup_location.isdigit()):
        print(f"DEBUG: Auto-resolving pickup location. Input: '{final_pickup_location}'")
        try:
             locations_resp = rapidshyp_client.get_pickup_locations()
             # print(f"DEBUG: Locations API Response: {locations_resp}") # Too verbose?
             
             if locations_resp.get("data"):
                 locations = locations_resp.get("data")
                 print(f"DEBUG: Found {len(locations)} locations from API.")
                 for l in locations:
                     print(f"DEBUG: Location candidate: Name='{l.get('pickup_location_nickname')}', Pin='{l.get('pin_code')}'")

                 # 1. Try to match pincode if input is pincode
                 if final_pickup_location and final_pickup_location.isdigit():
                     for loc in locations:
                         if str(loc.get("pin_code")) == str(final_pickup_location):
                             final_pickup_location = loc.get("pickup_location_nickname")
                             print(f"Resolved pincode {ship_req.pickup_location} to name: {final_pickup_location}")
                             break
                 
                 # 2. If still numeric or None, use ENV pincode match
                 if not final_pickup_location or final_pickup_location.isdigit():
                     env_pincode = os.getenv("PICKUP_PINCODE")
                     print(f"DEBUG: Checking ENV pincode: {env_pincode}")
                     if env_pincode:
                         for loc in locations:
                             if str(loc.get("pin_code")) == str(env_pincode):
                                 final_pickup_location = loc.get("pickup_location_nickname")
                                 print(f"Resolved ENV pincode {env_pincode} to name: {final_pickup_location}")
                                 break
                 
                 # 3. Last fallback: Use the first available location
                 if not final_pickup_location or (isinstance(final_pickup_location, str) and final_pickup_location.isdigit()):
                     final_pickup_location = locations[0].get("pickup_location_nickname")
                     print(f"Fallback to first available location: {final_pickup_location}")
             else:
                 print("DEBUG: No locations found in 'data' field of response.")
        except Exception as e:
            print(f"Warning: Failed to fetch pickup locations: {e}")
            print(traceback.format_exc())

    # Call Wrapper API
    try:
        response = rapidshyp_client.create_forward_order_wrapper(order_data, pickup_location=final_pickup_location)
        
        # Check for Pickup Address Error specifically
        if response.get("status") == "FAILED" and "Pickup address not found" in str(response.get("remarks")):
            print("Pickup Address Not Found. Attempting to fetch valid locations...")
            locations_resp = rapidshyp_client.get_pickup_locations()
            if locations_resp.get("data"):
                locations = locations_resp.get("data")
                print(f"Available Locations: {[l.get('pickup_location_nickname') for l in locations]}")
                
                valid_location = locations[0].get("pickup_location_nickname") # Default to first
                
                # Retry with new location
                print(f"Retrying with valid location: {valid_location}")
                response = rapidshyp_client.create_forward_order_wrapper(order_data, pickup_location=valid_location)
            else:
                print("No pickup locations found in RapidShyp account.")
                
        # Final check if it still failed
        if response.get("status") == "FAILED":
             error_msg = response.get("remarks", "Unknown Error")
             
             # If still address error, fetch and show available
             if "Pickup address" in str(error_msg):
                 try:
                     loc_resp = rapidshyp_client.get_pickup_locations()
                     avail_locs = [l.get('pickup_location_nickname') for l in loc_resp.get('data', [])]
                     error_msg += f". AVAILABLE LOCATIONS: {', '.join(avail_locs)}"
                 except: 
                     pass
                     
             raise HTTPException(status_code=400, detail=f"RapidShyp Error: {error_msg}")

    except HTTPException as he:
        raise he
    except Exception as e:
        print("CRITICAL: RapidShyp Wrapper Exception")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"RapidShyp Client Error: {str(e)}")
    
    if response.get("status") == "SUCCESS" or response.get("orderCreated"):
        # Extract Shipment Details
        shipments = response.get("shipment", [])
        if shipments:
            sh = shipments[0]
            order.shipping_id = sh.get("shipmentId")
            order.awb_number = sh.get("awb")
            order.courier_name = sh.get("courierName")
            order.label_url = sh.get("labelURL")
            order.manifest_url = sh.get("manifestURL")
            
            # Update Status
            order.status = "Shipped"
            
            # Append to history
            history = json.loads(order.status_history)
            history.append({
                "status": "Shipped",
                "timestamp": datetime.utcnow().isoformat(),
                "comment": f"Shipped via {order.courier_name}. AWB: {order.awb_number}"
            })
            order.status_history = json.dumps(history)
            
            session.add(order)
            session.commit()
            session.refresh(order)
            
            # Trigger notification
            background_tasks.add_task(send_shipping_notifications, order.dict()) 
            
            return {"ok": True, "shipment": sh}
    
    print(f"RapidShyp Error: {response}")
    raise HTTPException(status_code=400, detail=f"Failed to create shipment: {response.get('remarks') or response}")

@router.get("/api/orders/{order_id}/track")
def track_order_endpoint(order_id: str, session: Session = Depends(get_session)):
    order = get_order_by_id_flexible(session, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order.awb_number:
         return {"status": "Not Shipped", "details": "Order has not been shipped yet."}
         
    tracking_info = rapidshyp_client.track_order(awb=order.awb_number)
    return tracking_info

@router.post("/api/orders/{order_id}/return")
def return_order_endpoint(order_id: str, return_req: ReturnRequest, session: Session = Depends(get_session)):
    # Logic to process return
    pass

@router.post("/api/serviceability")
def check_serviceability(req: ServiceabilityCheck, session: Session = Depends(get_session)):
    # Check Toggle
    store_settings = session.get(StoreSettings, 1)
    rapidshyp_enabled = (store_settings and str(store_settings.rapidshyp_enabled).lower() == "true")

    # Resolve Pincodes
    pickup_pincode = req.pickup_pincode or os.getenv("PICKUP_PINCODE", "302031")
    delivery_pincode = req.delivery_pincode or req.pincode
    
    if not delivery_pincode:
         raise HTTPException(status_code=400, detail="Delivery pincode is required")

    if not delivery_pincode:
         raise HTTPException(status_code=400, detail="Delivery pincode is required")

    # Helper for simple response
    def format_simple_response(available, date_str=None, cod=True):
        return {
            "available": available,
            "date": date_str,
            "cod": cod,
            "message": "Service available" if available else "Service not available"
        }

    # 1. RAPIDSHYP ENABLED
    if rapidshyp_enabled:
        response = rapidshyp_client.check_serviceability(
            pickup_pincode, 
            delivery_pincode, 
            req.weight, 
            req.value, 
            req.mode
        )
        
        if response and (response.get("status") == "success" or str(response.get("status")).lower() == "true"):
            couriers = response.get("serviceable_courier_list", []) or response.get("data", {}).get("serviceable_courier_list", [])
            
            if couriers:
                best_courier = couriers[0]
                edd_str = best_courier.get("edd") # Format: DD-MM-YYYY or YYYY-MM-DD
                
                # Format the date nicely for frontend (e.g., "12 Jan, Fri")
                formatted_date = edd_str
                if edd_str:
                    try:
                        # Try parsing various formats
                        for fmt in ("%Y-%m-%d", "%d-%m-%Y"):
                            try:
                                d = datetime.strptime(edd_str, fmt)
                                formatted_date = d.strftime("%d %b, %a")
                                break
                            except ValueError:
                                continue
                    except:
                        pass
                
                # Check COD
                cod_available = best_courier.get("cod") if "cod" in best_courier else True
                
                return format_simple_response(True, date_str=formatted_date, cod=cod_available)
                
            elif str(response.get("status")).lower() == "success" and not couriers:
                 # Fallback if success but no list? Rare.
                 d = datetime.now() + timedelta(days=5)
                 return format_simple_response(True, date_str=d.strftime("%d %b, %a"), cod=True)
                
        if "data" in response and "edd" in response["data"]:
             return format_simple_response(True, date_str=response["data"]["edd"], cod=True)

        return format_simple_response(False)

    # 2. SIMULATION (RapidShyp Disabled)
    # Check for Flash Delivery from Database
    from models import FlashPincode
    flash_pin_obj = session.exec(select(FlashPincode).where(FlashPincode.pincode == str(delivery_pincode))).first()
    
    if flash_pin_obj:
        return {
            "available": True,
            "date": "Today (2-4 Hrs)",
            "cod": True,
            "message": "⚡ Flash Delivery Available (2-4 Hrs)",
            "is_flash": True
        }

    d = datetime.now() + timedelta(days=5)
    return format_simple_response(True, date_str=d.strftime("%d %b, %a"), cod=True)
