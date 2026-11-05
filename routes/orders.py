from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
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
MAX_QTY_PER_ITEM = 50

class OrderItem(BaseModel):
    productId: str
    productName: Optional[str] = None
    variantId: Optional[str] = None
    variantName: Optional[str] = None
    quantity: int = Field(ge=1, le=MAX_QTY_PER_ITEM)   # 🔒 no zero/negative quantities
    price: Optional[float] = None  # ignored - server uses DB price

class OrderCreate(BaseModel):
    items: Optional[List[OrderItem]] = None
    # For single product checkout
    productId: Optional[str] = None
    variantId: Optional[str] = None
    quantity: Optional[int] = Field(default=None, ge=1, le=MAX_QTY_PER_ITEM)
    
    amount: Optional[float] = 0.0  # ignored - server calculates the amount
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
    codCharges: Optional[float] = 0.0  # ignored - server uses COD_CHARGE
    isCartCheckout: Optional[bool] = False
    phoneProof: Optional[str] = None   # from /api/otp/verify (needed for COD when OTP is switched on)

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

def calculate_prepaid_discount(base_amount: float, payment_method: str, session: Session) -> float:
    """
    Calculate prepaid payment discount.
    Returns discount amount if payment_method is 'online'/'prepaid' and discount is enabled.
    Returns 0 for COD orders.
    """
    # Only apply discount for prepaid/online payments
    if payment_method.lower() not in ['online', 'prepaid']:
        return 0.0
    
    # Fetch prepaid discount settings
    try:
        settings = session.get(StoreSettings, 1)
        if not settings:
            return 0.0
        
        # Check if prepaid discount is enabled
        if not settings.prepaid_discount_enabled:
            return 0.0
        
        # Calculate discount
        discount_percent = settings.prepaid_discount_percent or 0
        discount_amount = round((base_amount * discount_percent) / 100, 2)
        
        print(f"DEBUG Prepaid Discount: {discount_percent}% of ₹{base_amount} = ₹{discount_amount}")
        return discount_amount
        
    except Exception as e:
        print(f"ERROR calculating prepaid discount: {e}")
        return 0.0


def deduct_stock_for_items(items: list, session: Session, order_id: str = ""):
    """
    Deduct stock for each item in the order. Each deduction is one atomic
    UPDATE ... WHERE stock >= quantity, so two shoppers buying the last piece
    at the same moment can never push stock below zero (the loser is skipped
    and the admin gets a Telegram alert). Products with stock = NULL are unlimited.
    items: List of dicts with 'productId' and 'quantity' keys.
    Should be called AFTER order is successfully created.
    """
    from models import Product
    from sqlmodel import update

    for item in items:
        product_id = item.get("productId")
        quantity = item.get("quantity", 1)

        if not product_id:
            continue

        product = session.get(Product, product_id)
        if not product or product.stock is None:
            continue  # unknown product or unlimited stock

        result = session.exec(
            update(Product)
            .where(Product.id == product_id, Product.stock >= quantity)
            .values(stock=Product.stock - quantity)
        )
        if result.rowcount == 0:
            print(f"🚨 OVERSELL BLOCKED: {product_id} insufficient stock for order {order_id}")
            try:
                from notifications import send_telegram_alert
                send_telegram_alert(f"Oversell attempt: {product_id} on order {order_id} - manual review needed")
            except Exception as e:
                print(f"Failed to send telegram alert for oversell: {e}")
            continue
        session.refresh(product)
        print(f"📦 Stock Update: {product_id} -> {product.stock} (deducted {quantity})")

    session.commit()


def recalculate_amount_server_side(items: list, session: Session) -> float:
    """
    🔒 SECURITY: Recalculate total amount from DB product prices.
    Never trust frontend-supplied amounts for order creation.
    Returns the verified total amount.
    """
    from models import Product
    total = 0.0
    for item in items:
        product_id = item.get("productId")
        quantity = item.get("quantity", 1)
        if not product_id:
            continue
        product = session.get(Product, product_id)
        if product:
            price = product.price if product.price is not None else 0
            # Validate: selling price must not exceed MRP
            if product.mrp is not None and price > product.mrp:
                print(f"⚠️ PRICE INTEGRITY: Product {product_id} price ({price}) > MRP ({product.mrp}). Using MRP.")
                price = product.mrp
            total += price * quantity
        else:
            raise HTTPException(status_code=400, detail=f"Product {product_id} not found")
    return round(total, 2)


def validate_coupon_server_side(coupon_code: str, subtotal: float, session: Session, payment_method: Optional[str] = None, items: Optional[list] = None) -> float:
    """
    🔒 SECURITY: Validate coupon on the server side and return the discount amount.
    Returns 0 if coupon is invalid/inactive/empty.
    """
    if not coupon_code or not coupon_code.strip():
        return 0.0

    from models import Coupon
    coupon = session.exec(select(Coupon).where(Coupon.code == coupon_code.strip().upper())).first()
    if not coupon:
        coupon = session.exec(select(Coupon).where(Coupon.code == coupon_code.strip())).first()

    if not coupon or not coupon.is_active:
        return 0.0

    # Enforce the coupon's own payment-method restriction
    restriction = (getattr(coupon, "payment_method_restriction", None) or "none").lower()
    if payment_method and restriction != "none":
        pm = payment_method.lower()
        prepaid_methods = ("prepaid", "online", "razorpay", "phonepe", "upi")
        ok = (
            (restriction == "prepaid_only" and pm in prepaid_methods) or
            (restriction == "upi_only" and pm in ("upi", "phonepe")) or
            (restriction == "cod_only" and pm == "cod")
        )
        if not ok:
            raise HTTPException(status_code=400, detail=f"Coupon {coupon.code} is not valid for this payment method")

    # Check minimum order amount (if set on coupon)
    min_order = getattr(coupon, 'min_order_amount', None)
    if min_order and subtotal < min_order:
        print(f"⚠️ Coupon {coupon.code}: subtotal ₹{subtotal} < min_order ₹{min_order}. Rejecting.")
        return 0.0

    discount = 0.0
    if coupon.discount_type == "percentage":
        discount = round((subtotal * coupon.discount_value) / 100, 2)
    elif coupon.discount_type == "fixed":
        discount = min(coupon.discount_value, subtotal)  # Can't discount more than subtotal
    elif coupon.discount_type == "flat_price":
        discount = max(0, round(subtotal - coupon.discount_value, 2))
    elif coupon.discount_type == "bogo":
        # Buy-One-Get-One: cheaper unit of every pair is free (needs the item list)
        from coupon_rules import bogo_discount
        discount = bogo_discount(items or [])

    # Cap discount: never allow final amount to go below ₹1
    max_allowed_discount = max(0, subtotal - 1)
    if discount > max_allowed_discount:
        print(f"⚠️ Coupon {coupon.code}: discount ₹{discount} capped to ₹{max_allowed_discount} (min final = ₹1)")
        discount = max_allowed_discount

    # Apply max_discount cap if set on coupon
    max_discount = getattr(coupon, 'max_discount', None)
    if max_discount and discount > max_discount:
        discount = max_discount

    return round(discount, 2)


def validate_promotion_restrictions(coupon_code: str, subtotal: float, payment_method: str, items: list, session: Session):
    """
    🔒 SECURITY: Check if a coupon is linked to a Promotion and enforce its restrictions.
    Raises HTTPException if restrictions are violated.
    payment_method: 'cod', 'prepaid', 'upi', 'razorpay', 'phonepe', etc.
    """
    if not coupon_code or not coupon_code.strip():
        return

    from models import Promotion, Product
    promo = session.exec(
        select(Promotion).where(
            Promotion.coupon_code == coupon_code.strip().upper(),
            Promotion.is_active == True
        )
    ).first()
    if not promo:
        # Also try case-sensitive match
        promo = session.exec(
            select(Promotion).where(
                Promotion.coupon_code == coupon_code.strip(),
                Promotion.is_active == True
            )
        ).first()

    if not promo:
        return  # No promotion linked — standard coupon, skip

    # 1. Min Cart Value Check
    if promo.min_cart_value and subtotal < promo.min_cart_value:
        raise HTTPException(
            status_code=400,
            detail=f"This offer requires a minimum cart value of ₹{int(promo.min_cart_value)}. Your cart is ₹{int(subtotal)}."
        )

    # 2. Payment Method Restriction
    pm_restriction = promo.payment_method_restriction or "none"
    if pm_restriction != "none":
        pm_lower = payment_method.lower() if payment_method else ""
        allowed = False
        if pm_restriction == "prepaid_only" and pm_lower in ("prepaid", "razorpay", "phonepe", "upi", "online"):
            allowed = True
        elif pm_restriction == "upi_only" and pm_lower in ("upi", "phonepe"):
            allowed = True
        elif pm_restriction == "cod_only" and pm_lower == "cod":
            allowed = True
        elif pm_restriction == "none":
            allowed = True

        if not allowed:
            restriction_labels = {
                "prepaid_only": "prepaid payments only",
                "upi_only": "UPI payments only",
                "cod_only": "Cash on Delivery only",
            }
            raise HTTPException(
                status_code=400,
                detail=f"This offer is valid for {restriction_labels.get(pm_restriction, pm_restriction)}. Please change your payment method."
            )

    # 3. Category Restriction
    if promo.category_restriction:
        allowed_cats = [c.strip().lower() for c in promo.category_restriction.split(",") if c.strip()]
        if allowed_cats:
            for item in items:
                pid = item.get("productId")
                if not pid:
                    continue
                product = session.get(Product, pid)
                if product:
                    product_cat = (product.category or "").lower()
                    if product_cat and product_cat not in allowed_cats:
                        raise HTTPException(
                            status_code=400,
                            detail=f"This offer is only valid for {', '.join(allowed_cats)} products. '{product.name}' doesn't qualify."
                        )


# --- Routes ---

# Delivery fee rule:
#   order value (after coupon) >= FREE_DELIVERY_MIN -> no fee
#   below that: online payment -> free, COD -> COD_CHARGE
COD_CHARGE = float(os.getenv("COD_CHARGE", "99"))
FREE_DELIVERY_MIN = float(os.getenv("FREE_DELIVERY_MIN", "499"))


def _short_id() -> str:
    return uuid.uuid4().hex[:6].upper()


def build_server_items(order_data, session: Session) -> list:
    """
    🔒 Build the item list from the DB (name + price), never from the browser.
    Accepts an OrderCreate or a plain dict.
    """
    from models import Product
    get = (lambda k, d=None: order_data.get(k, d)) if isinstance(order_data, dict) else (lambda k, d=None: getattr(order_data, k, d))

    raw_items = get("items") or []
    if not raw_items and get("productId"):
        raw_items = [{
            "productId": get("productId"),
            "variantId": get("variantId"),
            "quantity": get("quantity") or 1,
        }]
    if not raw_items:
        raise HTTPException(status_code=400, detail="No items in order")

    items = []
    for it in raw_items:
        if not isinstance(it, dict):
            it = it.dict()
        pid = it.get("productId")
        try:
            qty = int(it.get("quantity") or 1)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid quantity")
        if qty < 1 or qty > MAX_QTY_PER_ITEM:
            raise HTTPException(status_code=400, detail="Invalid quantity")
        product = session.get(Product, pid) if pid else None
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {pid} not found")
        price = product.price if product.price is not None else 0
        if product.mrp is not None and price > product.mrp:
            price = product.mrp
        items.append({
            "productId": product.id,
            "productName": product.name,
            "variantId": it.get("variantId"),
            "variantName": it.get("variantName"),
            "quantity": qty,
            "price": float(price),
        })
    return items


def validate_delivery_state_not_blocked(state: Optional[str], session: Session):
    """Raise 403 if the delivery state is in the blocked regions list."""
    if not state:
        return
    from models import BlockedRegion
    blocked = session.exec(
        select(BlockedRegion).where(BlockedRegion.is_blocked == True)
    ).all()
    blocked_names = {r.region_name.strip().lower() for r in blocked}
    if state.strip().lower() in blocked_names:
        raise HTTPException(
            status_code=403,
            detail=f"We currently do not deliver to {state.strip().title()}. We apologize for the inconvenience."
        )


def check_stock(items: list, session: Session):
    from models import Product
    for item in items:
        product = session.get(Product, item.get("productId"))
        if product and product.stock is not None:
            if product.stock <= 0:
                raise HTTPException(status_code=400, detail=f"{product.name} is out of stock")
            if item["quantity"] > product.stock:
                raise HTTPException(status_code=400, detail=f"{product.name}: only {product.stock} left in stock")


def compute_pricing(items: list, coupon_code: Optional[str], payment_method: str, session: Session, cust: Optional[dict] = None) -> dict:
    """
    🔒 Single source of truth for order amounts.
    payment_method: 'cod' or 'prepaid'
    """
    subtotal = round(sum(i["price"] * i["quantity"] for i in items), 2)
    coupon_code = (coupon_code or "").strip()
    if coupon_code:
        # Expiry / start date / total + per-customer usage limits
        from coupon_rules import check_coupon_rules
        check_coupon_rules(session, coupon_code, (cust or {}).get("email"), (cust or {}).get("contact"))
    coupon_discount = validate_coupon_server_side(coupon_code, subtotal, session, payment_method, items)
    validate_promotion_restrictions(coupon_code, subtotal, payment_method, items, session)
    after_coupon = max(0.0, round(subtotal - coupon_discount, 2))

    prepaid_discount = 0.0
    cod_charge = 0.0
    if payment_method == "cod":
        cod_charge = 0.0 if after_coupon >= FREE_DELIVERY_MIN else COD_CHARGE
    else:
        prepaid_discount = calculate_prepaid_discount(after_coupon, "online", session)

    total = round(max(1.0, after_coupon - prepaid_discount + cod_charge), 2)
    return {
        "subtotal": subtotal,
        "coupon_code": coupon_code.upper() if coupon_discount > 0 else None,
        "coupon_discount": coupon_discount,
        "prepaid_discount": prepaid_discount,
        "cod_charge": cod_charge,
        "total": total,
    }


def _order_payload(session: Session, order) -> dict:
    """Order as a plain dict for notifications.
    Later commits (stock, address) expire the object, and .dict() on an expired
    object is empty - the emails/Telegram then went out with no order id or email."""
    try:
        session.refresh(order)
    except Exception:
        pass
    return order.model_dump()


def _customer_fields(order_data) -> dict:
    get = (lambda k, d=None: order_data.get(k, d)) if isinstance(order_data, dict) else (lambda k, d=None: getattr(order_data, k, d))
    email = (get("email") or "").strip()
    return {
        "name": (get("name") or "").strip(),
        "email": email,
        "contact": (get("contact") or "").strip(),
        "address": (get("address") or "").strip(),
        "city": (get("city") or "").strip(),
        "state": (get("state") or "").strip(),
        "pincode": (get("pincode") or "").strip(),
    }


def _ensure_customer(session: Session, cust: dict, ident: dict):
    """Return the logged-in customer, or find/create a guest customer by email."""
    if ident.get("customer"):
        return ident["customer"]
    if not cust["email"]:
        return None
    existing = session.exec(select(Customer).where(Customer.email == cust["email"])).first()
    if existing:
        return existing
    guest = Customer(full_name=cust["name"] or "Guest", email=cust["email"], phone=cust["contact"], provider="guest", is_active=True)
    session.add(guest)
    session.commit()
    session.refresh(guest)
    return guest


def _auto_save_address(session: Session, customer, cust: dict):
    if not customer or customer.provider == "guest":
        return
    try:
        from models import Address
        existing_addr = session.exec(
            select(Address).where(
                Address.customer_id == customer.id,
                Address.pincode == cust["pincode"],
                Address.address_line1 == cust["address"]
            )
        ).first()
        if not existing_addr:
            has_any_address = session.exec(select(Address).where(Address.customer_id == customer.id)).first()
            session.add(Address(
                customer_id=customer.id,
                label="Home",
                full_name=cust["name"],
                phone=cust["contact"],
                address_line1=cust["address"],
                city=cust["city"],
                state=cust["state"] or "Rajasthan",
                pincode=cust["pincode"],
                is_default=(not has_any_address),
                address_type="both"
            ))
            session.commit()
    except Exception as e:
        session.rollback()
        print(f"⚠️ Address auto-save failed (non-blocking): {e}")


def _create_order_record(session: Session, *, order_id: str, cust: dict, items: list, pricing: dict,
                         payment_method: str, status: str, user_id: Optional[str], comment: str) -> Order:
    tax_data = calculate_tax_breakdown(pricing["total"], cust["state"])
    uid = None
    if user_id:
        try:
            uid = uuid.UUID(str(user_id))
        except ValueError:
            uid = None
    extra = []
    if pricing.get("coupon_discount"):
        extra.append(f"Coupon: {pricing.get('coupon_code')} (-₹{pricing['coupon_discount']})")
    if pricing.get("prepaid_discount"):
        extra.append(f"Prepaid Discount: -₹{pricing['prepaid_discount']}")
    if pricing.get("cod_charge"):
        extra.append(f"COD Charge: +₹{pricing['cod_charge']}")
    order = Order(
        order_id=order_id,
        customer_name=cust["name"],
        email=cust["email"],
        phone=cust["contact"],
        address=cust["address"],
        city=cust["city"],
        pincode=cust["pincode"],
        total_amount=pricing["total"],
        original_amount=pricing["subtotal"],
        discount_amount=round(pricing.get("coupon_discount", 0) + pricing.get("prepaid_discount", 0), 2),
        payment_method=payment_method,
        status=status,
        email_status="pending",
        user_id=uid,
        items_json=json.dumps(items),
        state=cust["state"],
        hsn_code=tax_data["hsn_code"],
        taxable_value=tax_data["taxable_value"],
        cgst_amount=tax_data["cgst_amount"],
        sgst_amount=tax_data["sgst_amount"],
        igst_amount=tax_data["igst_amount"],
        status_history=json.dumps([{
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            "comment": comment + (" | " + " | ".join(extra) if extra else "")
        }])
    )
    session.add(order)
    session.commit()
    session.refresh(order)

    # Count coupon usage (for usage limits)
    if pricing.get("coupon_code") and pricing.get("coupon_discount"):
        try:
            from coupon_rules import record_coupon_usage
            record_coupon_usage(session, pricing["coupon_code"], order.order_id, cust.get("email"), cust.get("contact"))
        except Exception as e:
            session.rollback()
            print(f"⚠️ Coupon usage record failed: {e}")
    return order


def _order_response(order: Order) -> dict:
    from order_access import order_access_key
    return {
        "ok": True,
        "orderId": order.order_id,
        "amount": order.total_amount,
        "accessKey": order_access_key(order.order_id),
    }


@router.post("/api/create-cod-order")
def create_cod_order(order_data: OrderCreate, background_tasks: BackgroundTasks, token: Optional[str] = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    from order_access import resolve_identity
    ident = resolve_identity(token, session)
    cust = _customer_fields(order_data)
    if not cust["email"] or not cust["contact"] or not cust["address"] or not cust["pincode"]:
        raise HTTPException(status_code=400, detail="Please fill all required fields")

    # COD needs a verified mobile number (switched on by TWOFACTOR_API_KEY)
    from routes.phone_otp import require_phone_proof
    require_phone_proof(order_data.phoneProof, cust["contact"], session)

    # 🔒 Everything below is calculated on the server
    items = build_server_items(order_data, session)
    check_stock(items, session)
    validate_delivery_state_not_blocked(order_data.state, session)
    pricing = compute_pricing(items, order_data.couponCode, "cod", session, cust)

    customer = _ensure_customer(session, cust, ident)

    order = _create_order_record(
        session,
        order_id=f"ORD-{int(time.time())}-{_short_id()}",   # unique even for same-second orders
        cust=cust, items=items, pricing=pricing,
        payment_method="cod", status="pending",
        user_id=ident.get("supabase_uid"),
        comment="Order placed via COD",
    )
    deduct_stock_for_items(items, session, order.order_id)
    _auto_save_address(session, customer, cust)
    background_tasks.add_task(send_order_notifications, _order_payload(session, order))
    return _order_response(order)


# ---------------------------------------------------------------------------
# Online payments (Razorpay / PhonePe)
# ---------------------------------------------------------------------------

def _get_gateway(session: Session, provider: str) -> Optional[PaymentGateway]:
    gw = session.exec(select(PaymentGateway).where(PaymentGateway.provider == provider, PaymentGateway.is_active == True)).first()
    if not gw:
        gw = session.exec(select(PaymentGateway).where(PaymentGateway.provider == provider)).first()
    return gw


def _phonepe_urls(creds: dict):
    environment = (creds.get("environment") or "SANDBOX").upper()
    if environment == "PRODUCTION":
        return ("https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
                "https://api.phonepe.com/apis/pg/checkout/v2/pay",
                "https://api.phonepe.com/apis/pg/checkout/v2/order/{}/status")
    return ("https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
            "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay",
            "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/{}/status")


def _phonepe_token(creds: dict) -> str:
    import requests
    client_id = creds.get("client_id") or creds.get("merchant_id")
    client_secret = creds.get("client_secret") or creds.get("salt_key")
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="PhonePe credentials not configured properly")
    auth_url, _, _ = _phonepe_urls(creds)
    auth_data = requests.post(
        auth_url,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "client_id": client_id,
            "client_version": creds.get("client_version", "1"),
            "client_secret": client_secret,
            "grant_type": "client_credentials"
        },
        timeout=30
    ).json()
    if not auth_data.get("access_token"):
        msg = auth_data.get("message") or auth_data.get("error_description") or "Failed to get access token"
        raise HTTPException(status_code=400, detail=f"PhonePe Auth: {msg}")
    return auth_data["access_token"]


def _phonepe_status(creds: dict, merchant_order_id: str) -> dict:
    import requests
    token = _phonepe_token(creds)
    _, _, status_tpl = _phonepe_urls(creds)
    return requests.get(
        status_tpl.format(merchant_order_id),
        headers={"Content-Type": "application/json", "Authorization": f"O-Bearer {token}"},
        timeout=30
    ).json()


def _finalize_pending(session: Session, pending, payment_ref: str, background_tasks: Optional[BackgroundTasks]) -> Order:
    """
    Create the paid order from the server-side PendingCheckout (idempotent).
    Call ONLY after the gateway confirmed the exact amount was paid.
    """
    from models import PendingCheckout
    # Re-read with a row lock so a webhook + browser callback can't double-create
    try:
        pending = session.exec(
            select(PendingCheckout).where(PendingCheckout.gateway_order_id == pending.gateway_order_id).with_for_update()
        ).first() or pending
    except Exception:
        pass

    if pending.order_id:
        existing = session.exec(select(Order).where(Order.order_id == pending.order_id)).first()
        if existing:
            return existing

    if pending.provider == "razorpay":
        order_id = f"ORD-{pending.gateway_order_id.replace('order_', '')}"
    else:
        order_id = pending.gateway_order_id

    existing = session.exec(select(Order).where(Order.order_id == order_id)).first()
    if existing:
        pending.order_id = existing.order_id
        session.add(pending)
        session.commit()
        return existing

    cust = json.loads(pending.order_data_json or "{}")
    items = json.loads(pending.items_json or "[]")
    pricing = {
        "subtotal": pending.subtotal,
        "coupon_code": pending.coupon_code,
        "coupon_discount": pending.coupon_discount,
        "prepaid_discount": pending.prepaid_discount,
        "cod_charge": 0.0,
        "total": pending.amount,
    }
    order = _create_order_record(
        session,
        order_id=order_id, cust=cust, items=items, pricing=pricing,
        payment_method="online", status="paid",
        user_id=pending.user_id,
        comment=f"Payment via {pending.provider.title()}. Ref: {payment_ref}",
    )
    pending.order_id = order.order_id
    session.add(pending)
    session.commit()

    deduct_stock_for_items(items, session, order.order_id)
    try:
        customer = session.exec(select(Customer).where(Customer.email == cust.get("email"))).first()
        _auto_save_address(session, customer, cust)
    except Exception:
        pass

    payload = _order_payload(session, order)
    if background_tasks is not None:
        background_tasks.add_task(send_order_notifications, payload)
    else:
        try:
            send_order_notifications(payload)
        except Exception as e:
            print(f"Notification error: {e}")
    return order


@router.post("/api/create-checkout-session")
def create_checkout_session(order_data: OrderCreate, token: Optional[str] = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    from models import PendingCheckout
    from order_access import resolve_identity

    gateway = session.exec(select(PaymentGateway).where(PaymentGateway.is_active == True)).first()
    if not gateway:
        raise HTTPException(status_code=400, detail="No active payment gateway found. Please contact support.")

    ident = resolve_identity(token, session)
    cust = _customer_fields(order_data)
    if not cust["email"] or not cust["contact"] or not cust["address"] or not cust["pincode"]:
        raise HTTPException(status_code=400, detail="Please fill all required fields")

    # 🔒 Server-side items, stock, and amount (incl. coupon + prepaid discount)
    items = build_server_items(order_data, session)
    check_stock(items, session)
    validate_delivery_state_not_blocked(order_data.state, session)
    pricing = compute_pricing(items, order_data.couponCode, "prepaid", session, cust)
    amount_paise = int(round(pricing["total"] * 100))

    creds = json.loads(gateway.credentials_json or "{}")

    def save_pending(gateway_order_id: str):
        session.add(PendingCheckout(
            gateway_order_id=gateway_order_id,
            provider=gateway.provider,
            order_data_json=json.dumps(cust),
            items_json=json.dumps(items),
            subtotal=pricing["subtotal"],
            coupon_code=pricing["coupon_code"],
            coupon_discount=pricing["coupon_discount"],
            prepaid_discount=pricing["prepaid_discount"],
            amount=pricing["total"],
            amount_paise=amount_paise,
            user_id=ident.get("supabase_uid"),
        ))
        session.commit()

    if gateway.provider == "razorpay":
        key_id = (creds.get("key_id") or "").strip()
        key_secret = (creds.get("key_secret") or "").strip()
        if not key_id or key_id == "undefined" or not key_secret or key_secret == "undefined":
            raise HTTPException(status_code=400, detail="Razorpay credentials are not configured. Please set your Key ID and Key Secret in Admin → Settings → Payment Gateways.")
        try:
            client = razorpay.Client(auth=(key_id, key_secret))
            notes = {"email": cust["email"], "phone": cust["contact"]}
            if ident.get("supabase_uid"):
                notes["user_id"] = ident["supabase_uid"]
            razorpay_order = client.order.create(data={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"rcpt_{int(time.time())}_{_short_id()}",
                "notes": notes,
            })
        except Exception as e:
            print(f"Razorpay Error: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Gateway Error: {str(e)}")

        save_pending(razorpay_order["id"])
        return {
            "id": razorpay_order['id'],
            "orderId": razorpay_order['id'],
            "amount": razorpay_order['amount'],
            "currency": razorpay_order['currency'],
            "key": key_id,
            "name": "Varaha Jewels",
            "description": "Payment for Order",
            "prefill": {"name": cust["name"], "email": cust["email"], "contact": cust["contact"]},
            "theme": {"color": "#B8860B"},
            "provider": "razorpay",
            "pricing": pricing,
        }

    elif gateway.provider == "phonepe":
        import requests
        try:
            frontend_url = os.getenv("FRONTEND_URL", "https://varahajewels.in")
            merchant_order_id = f"ORD-{int(time.time())}-{uuid.uuid4().hex[:6]}"
            access_token = _phonepe_token(creds)
            _, pay_url, _ = _phonepe_urls(creds)
            pay_data = requests.post(
                pay_url,
                headers={"Content-Type": "application/json", "Authorization": f"O-Bearer {access_token}"},
                json={
                    "merchantOrderId": merchant_order_id,
                    "amount": amount_paise,
                    "expireAfter": 1200,
                    "metaInfo": {"udf1": cust["email"], "udf2": cust["contact"]},
                    "paymentFlow": {
                        "type": "PG_CHECKOUT",
                        "message": f"Payment for Order {merchant_order_id}",
                        "merchantUrls": {"redirectUrl": f"{frontend_url}/payment-callback?orderId={merchant_order_id}"}
                    }
                },
                timeout=30
            ).json()
        except HTTPException:
            raise
        except Exception as e:
            print(f"PhonePe Error: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"PhonePe Gateway Error: {str(e)}")

        if pay_data.get("orderId") and pay_data.get("redirectUrl"):
            save_pending(merchant_order_id)
            return {
                "provider": "phonepe",
                "orderId": merchant_order_id,
                "phonepeOrderId": pay_data.get("orderId"),
                "redirectUrl": pay_data.get("redirectUrl"),
                "amount": amount_paise,
                "currency": "INR",
                "pricing": pricing,
            }
        print(f"PhonePe Error: {pay_data}")
        raise HTTPException(status_code=400, detail=f"PhonePe: {pay_data.get('message') or 'Payment initiation failed'}")

    raise HTTPException(status_code=400, detail=f"Provider {gateway.provider} not implemented completely.")


def _confirm_phonepe(session: Session, merchant_order_id: str, background_tasks: Optional[BackgroundTasks]) -> dict:
    """Verify with PhonePe that the exact amount was paid, then create the order."""
    from models import PendingCheckout
    pending = session.get(PendingCheckout, merchant_order_id)
    if not pending:
        existing = session.exec(select(Order).where(Order.order_id == merchant_order_id)).first()
        if existing:
            return _order_response(existing)
        raise HTTPException(status_code=404, detail="Checkout session not found. If money was deducted, please contact support with your transaction ID.")
    if pending.order_id:
        existing = session.exec(select(Order).where(Order.order_id == pending.order_id)).first()
        if existing:
            return _order_response(existing)

    gateway = _get_gateway(session, "phonepe")
    if not gateway:
        raise HTTPException(status_code=400, detail="PhonePe gateway not configured")
    status_data = _phonepe_status(json.loads(gateway.credentials_json or "{}"), merchant_order_id)
    state = (status_data.get("state") or "").upper()
    if state != "COMPLETED":
        return {"ok": False, "status": state, "message": status_data.get("errorMessage") or "Payment not completed"}

    paid = int(status_data.get("amount") or 0)
    if paid != int(pending.amount_paise):
        print(f"🚨 PhonePe AMOUNT MISMATCH {merchant_order_id}: paid={paid} expected={pending.amount_paise}")
        raise HTTPException(status_code=400, detail="Payment amount mismatch. Please contact support.")

    order = _finalize_pending(session, pending, merchant_order_id, background_tasks)
    return _order_response(order)


@router.post("/api/phonepe/callback")
async def phonepe_callback(request: Request, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """
    PhonePe server-to-server callback. Creates the order even if the customer
    closed the browser after paying. The payload is NOT trusted - we re-check
    the status with PhonePe's API before creating anything.
    Optional auth: set PHONEPE_CALLBACK_USERNAME / PHONEPE_CALLBACK_PASSWORD
    (same values as in the PhonePe dashboard).
    """
    import hashlib
    import base64
    import hmac as _hmac
    cb_user = os.getenv("PHONEPE_CALLBACK_USERNAME")
    cb_pass = os.getenv("PHONEPE_CALLBACK_PASSWORD")
    if cb_user and cb_pass:
        expected = hashlib.sha256(f"{cb_user}:{cb_pass}".encode()).hexdigest()
        got = (request.headers.get("authorization") or "").replace("SHA256", "").strip()
        if not _hmac.compare_digest(got, expected):
            raise HTTPException(status_code=401, detail="Invalid callback auth")

    try:
        payload = await request.json()
    except Exception:
        payload = {}

    merchant_order_id = None
    try:
        inner = payload.get("payload") or {}
        merchant_order_id = inner.get("merchantOrderId") or inner.get("merchantTransactionId")
        if not merchant_order_id and payload.get("response"):
            data = json.loads(base64.b64decode(payload["response"]).decode())
            merchant_order_id = (data.get("data") or {}).get("merchantTransactionId")
    except Exception as e:
        print(f"PhonePe callback parse error: {e}")

    if not merchant_order_id:
        return {"status": "ignored"}

    try:
        result = _confirm_phonepe(session, merchant_order_id, background_tasks)
        return {"status": "ok", "result": result}
    except HTTPException as e:
        return {"status": "error", "message": e.detail}
    except Exception as e:
        print(f"PhonePe Callback Error: {traceback.format_exc()}")
        return {"status": "error", "message": str(e)}


@router.get("/api/phonepe/status/{transaction_id}")
def check_phonepe_status(transaction_id: str, session: Session = Depends(get_session)):
    """Check PhonePe payment status (used by the payment-callback page)."""
    gateway = _get_gateway(session, "phonepe")
    if not gateway:
        raise HTTPException(status_code=400, detail="PhonePe gateway not configured")
    try:
        response_data = _phonepe_status(json.loads(gateway.credentials_json or "{}"), transaction_id)
    except HTTPException as e:
        return {"success": False, "status": "AUTH_FAILED", "message": str(e.detail)}
    except Exception as e:
        print(f"PhonePe Status Check Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

    state = (response_data.get("state") or "").upper()
    if state == "COMPLETED":
        return {"success": True, "status": "SUCCESS", "transactionId": transaction_id, "amount": response_data.get("amount")}
    if state in ["PENDING", "INITIATED"]:
        return {"success": False, "status": "PENDING", "message": "Payment is being processed"}
    if state == "FAILED":
        return {"success": False, "status": "FAILED", "message": response_data.get("errorMessage") or "Payment failed"}
    return {"success": False, "status": response_data.get("state", "UNKNOWN"), "message": response_data.get("errorMessage") or "Payment status unknown"}


@router.post("/api/phonepe/confirm-order")
def confirm_phonepe_order(payload: Dict[str, Any], background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """
    Called by the frontend after the PhonePe redirect. Any order_data sent by
    the browser is ignored - the order is built from the server-side checkout.
    """
    transaction_id = payload.get("transaction_id") or payload.get("orderId")
    if not transaction_id:
        raise HTTPException(status_code=400, detail="Transaction ID required")
    try:
        return _confirm_phonepe(session, transaction_id, background_tasks)
    except HTTPException:
        raise
    except Exception as e:
        print(f"PhonePe Confirm Order Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


def _razorpay_client(session: Session):
    gateway = _get_gateway(session, "razorpay")
    if not gateway:
        raise HTTPException(status_code=500, detail="Razorpay gateway not configured")
    creds = json.loads(gateway.credentials_json or "{}")
    return razorpay.Client(auth=(creds.get("key_id"), creds.get("key_secret"))), creds


@router.post("/api/update-order-status")
def update_order_status_callback(payload: Dict[str, Any], background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """
    Razorpay success handler (called by the browser).
    1. Verify the signature
    2. Verify with Razorpay that THIS payment for THIS order was captured for the EXACT amount
    3. Create the order from the server-side checkout snapshot (browser order_data is ignored)
    """
    from models import PendingCheckout
    razorpay_payment_id = payload.get("razorpay_payment_id")
    razorpay_order_id = payload.get("razorpay_order_id")
    razorpay_signature = payload.get("razorpay_signature")
    if not razorpay_payment_id or not razorpay_order_id or not razorpay_signature:
        raise HTTPException(status_code=400, detail="Missing payment data")

    client, _ = _razorpay_client(session)
    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })
    except Exception as e:
        print(f"Signature Verification Failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid Payment Signature")

    pending = session.get(PendingCheckout, razorpay_order_id)
    if not pending:
        existing = session.exec(select(Order).where(Order.order_id == f"ORD-{razorpay_order_id.replace('order_', '')}")).first()
        if existing:
            return _order_response(existing)
        raise HTTPException(status_code=404, detail="Checkout session not found. Your payment is safe - please contact support with payment ID " + razorpay_payment_id)

    try:
        payment = client.payment.fetch(razorpay_payment_id)
    except Exception as e:
        print(f"Razorpay payment fetch failed: {e}")
        raise HTTPException(status_code=502, detail="Could not verify payment with Razorpay. Please contact support.")

    if payment.get("order_id") != razorpay_order_id or int(payment.get("amount") or 0) != int(pending.amount_paise):
        print(f"🚨 Razorpay AMOUNT/ORDER MISMATCH: payment={payment.get('order_id')}/{payment.get('amount')} expected={razorpay_order_id}/{pending.amount_paise}")
        raise HTTPException(status_code=400, detail="Payment amount mismatch. Please contact support.")

    if payment.get("status") == "authorized":
        try:
            client.payment.capture(razorpay_payment_id, pending.amount_paise, {"currency": "INR"})
            payment["status"] = "captured"
        except Exception as e:
            print(f"Razorpay capture failed (may already be captured): {e}")
    if payment.get("status") not in ("captured", "authorized"):
        raise HTTPException(status_code=400, detail=f"Payment not completed (status: {payment.get('status')})")

    try:
        order = _finalize_pending(session, pending, razorpay_payment_id, background_tasks)
    except Exception as e:
        print(f"CRITICAL API ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Order creation error: {str(e)}")
    return _order_response(order)


@router.post("/api/webhook/razorpay")
async def razorpay_webhook(request: Request, session: Session = Depends(get_session)):
    """
    Razorpay webhook (payment.captured / order.paid). Creates the order even if
    the customer closed the browser after paying.
    Setup: Razorpay Dashboard → Webhooks → URL: https://<backend>/api/webhook/razorpay
    Secret: put the same value in .env as RAZORPAY_WEBHOOK_SECRET
            (or as "webhook_secret" in the gateway credentials).
    """
    import hmac as _hmac
    import hashlib
    from models import PendingCheckout
    body = await request.body()
    _, creds = _razorpay_client(session)
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET") or creds.get("webhook_secret")
    if not secret:
        raise HTTPException(status_code=503, detail="Webhook secret not configured")
    signature = request.headers.get("x-razorpay-signature", "")
    expected = _hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if not _hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=400, detail="Invalid signature")

    event = json.loads(body or b"{}")
    if event.get("event") not in ("payment.captured", "order.paid"):
        return {"status": "ignored"}
    payment = ((event.get("payload") or {}).get("payment") or {}).get("entity") or {}
    rzp_order_id = payment.get("order_id")
    if not rzp_order_id:
        return {"status": "ignored"}
    pending = session.get(PendingCheckout, rzp_order_id)
    if not pending:
        return {"status": "unknown_order"}
    if int(payment.get("amount") or 0) != int(pending.amount_paise):
        print(f"🚨 Razorpay webhook AMOUNT MISMATCH {rzp_order_id}")
        return {"status": "amount_mismatch"}
    order = _finalize_pending(session, pending, payment.get("id") or "webhook", None)
    return {"status": "ok", "orderId": order.order_id}


@router.post("/api/orders", response_model=Order)
def create_order(order: Order, background_tasks: BackgroundTasks, current_user: AdminUser = Depends(get_current_admin), session: Session = Depends(get_session)):
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
def read_my_orders(token: Optional[str] = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    """
    Orders of the logged-in customer. Works for every login type
    (Google OAuth, phone OTP, email/password, old Supabase sessions).
    Matched by Supabase UUID, verified email, or verified phone number.
    """
    from order_access import resolve_identity, orders_for_identity
    ident = resolve_identity(token, session)
    if not ident.get("customer") and not ident.get("supabase_uid"):
        raise HTTPException(status_code=401, detail="Invalid or expired token. Please login again.")
    return orders_for_identity(ident, session)


@router.get("/api/orders/{order_id}", response_model=Order)
def read_order(order_id: str, key: Optional[str] = None, token: Optional[str] = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    """
    🔒 Order details are visible ONLY to:
      - admins
      - the logged-in owner (UUID / email / verified phone)
      - anyone holding the signed access key (sent in confirmation emails and
        returned right after checkout, so guests can see their own order)
    """
    from order_access import resolve_identity, identity_owns_order, verify_order_access_key
    ident = resolve_identity(token, session)

    if ident.get("is_admin"):
        order = get_order_by_id_flexible(session, order_id)
    else:
        # Non-admins: exact order_id only (no numeric-ID enumeration)
        order = session.exec(select(Order).where(Order.order_id == order_id)).first()
        if not order and not order_id.startswith("ORD-"):
            order = session.exec(select(Order).where(Order.order_id == f"ORD-{order_id}")).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if ident.get("is_admin") or verify_order_access_key(order.order_id, key) or identity_owns_order(ident, order):
        return order

    # Same response for "exists but not yours" (no information leak)
    raise HTTPException(status_code=404, detail="Order not found")


# --- RapidShyp Integration Routes ---

def _flag_order_shipping_pending(order, error_msg: str, session, background_tasks=None):
    """
    Fix #8: When RapidShyp API fails, mark order as shipping_pending_manual
    and send Telegram alert to admin instead of returning a 500 error.
    """
    import json
    from datetime import datetime, timezone

    try:
        order.status = "shipping_pending_manual"
        try:
            hist = json.loads(order.status_history or "[]")
        except Exception:
            hist = []
        hist.append({
            "status": "shipping_pending_manual",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "comment": f"RapidShyp API failed: {error_msg[:300]}",
        })
        order.status_history = json.dumps(hist)
        session.add(order)
        session.commit()
        print(f"[RAPIDSHYP-FALLBACK] Order {order.order_id} flagged as shipping_pending_manual")
    except Exception as save_err:
        print(f"[RAPIDSHYP-FALLBACK] ⚠️ Could not save status: {save_err}")

    # Send Telegram alert to admin
    try:
        from notifications import send_telegram_alert
        msg = (
            f"🚨 SHIPPING ALERT 🚨\n"
            f"Order: {order.order_id}\n"
            f"Customer: {order.customer_name}\n"
            f"Amount: ₹{order.total_amount}\n"
            f"Error: {error_msg[:500]}\n"
            f"Action: Please ship manually or retry from Admin Panel → Orders."
        )
        send_telegram_alert(msg)
    except Exception as tg_err:
        print(f"[RAPIDSHYP-FALLBACK] ⚠️ Telegram alert failed: {tg_err}")

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



@router.post("/api/admin/orders/{order_id}/ship")
def ship_order(order_id: str, ship_req: ShipOrderRequest, background_tasks: BackgroundTasks, current_user: AdminUser = Depends(get_current_admin), session: Session = Depends(get_session)):
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
        background_tasks.add_task(send_shipping_notifications, _order_payload(session, order))
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
        "state": order.state or "",
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
        # RapidShyp API failure: flag the order for manual shipping instead of a bare 500
        print(f"[RAPIDSHYP] API exception: {traceback.format_exc()}")
        _flag_order_shipping_pending(order, str(e), session, background_tasks)
        return {
            "ok": False,
            "warning": "Shipment could not be created automatically due to a RapidShyp API error. "
                       "The order has been flagged as 'shipping_pending_manual'. Admin has been notified.",
            "order_id": order.order_id,
        }
    
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
            background_tasks.add_task(send_shipping_notifications, _order_payload(session, order)) 
            
            return {"ok": True, "shipment": sh}
    
    print(f"RapidShyp Error: {response}")
    error_msg = response.get('remarks') or str(response)
    _flag_order_shipping_pending(order, f"RapidShyp FAILED: {error_msg}", session, background_tasks)
    return {
        "ok": False,
        "warning": f"Shipment creation failed: {error_msg}. Order flagged for manual shipping. Admin notified.",
        "order_id": order.order_id,
    }

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
