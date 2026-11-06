"""Razorpay Magic Checkout: order creation and turning a finished checkout into our Order.

Flow
  1. Browser -> POST /api/magic/create-order with the cart. We price it from the DB,
     create a Razorpay order with line_items / line_items_total, and save a
     PendingCheckout (provider "razorpay_magic").
  2. Razorpay's popup collects address, coupon (our /api/magic/promotions URLs),
     delivery / COD fee (our /api/magic/shipping URL) and the payment or COD choice.
  3. Browser -> POST /api/magic/complete, and/or the Razorpay webhook. We fetch the
     order and its payments FROM RAZORPAY (never trusting the browser), and create
     our Order once: paid online, or COD.

Only active while the admin "Magic Checkout" switch is on.
"""
import json
import os
import time
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from dependencies import oauth2_scheme
from models import Customer, Order, PendingCheckout, Product

router = APIRouter()
PROVIDER = "razorpay_magic"
FRONTEND = os.getenv("FRONTEND_URL", "https://varahajewels.in").rstrip("/")

STATE_NAMES = {
    "AN": "Andaman and Nicobar Islands", "AP": "Andhra Pradesh", "AR": "Arunachal Pradesh", "AS": "Assam",
    "BR": "Bihar", "CH": "Chandigarh", "CG": "Chhattisgarh", "CT": "Chhattisgarh", "DN": "Dadra and Nagar Haveli and Daman and Diu",
    "DD": "Dadra and Nagar Haveli and Daman and Diu", "DL": "Delhi", "GA": "Goa", "GJ": "Gujarat", "HR": "Haryana",
    "HP": "Himachal Pradesh", "JK": "Jammu and Kashmir", "JH": "Jharkhand", "KA": "Karnataka", "KL": "Kerala",
    "LA": "Ladakh", "LD": "Lakshadweep", "MP": "Madhya Pradesh", "MH": "Maharashtra", "MN": "Manipur",
    "ML": "Meghalaya", "MZ": "Mizoram", "NL": "Nagaland", "OR": "Odisha", "OD": "Odisha", "PY": "Puducherry",
    "PB": "Punjab", "RJ": "Rajasthan", "SK": "Sikkim", "TN": "Tamil Nadu", "TG": "Telangana", "TS": "Telangana",
    "TR": "Tripura", "UP": "Uttar Pradesh", "UK": "Uttarakhand", "UT": "Uttarakhand", "WB": "West Bengal",
}


class MagicCreateReq(BaseModel):
    items: Optional[List[dict]] = None
    productId: Optional[str] = None
    variantId: Optional[str] = None
    quantity: Optional[int] = None
    name: Optional[str] = None
    email: Optional[str] = None
    contact: Optional[str] = None


class MagicCompleteReq(BaseModel):
    razorpay_order_id: str


def _paise(rupees) -> int:
    return int(round(float(rupees or 0) * 100))


@router.post("/api/magic/create-order")
def magic_create_order(body: MagicCreateReq, token: Optional[str] = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    from order_access import resolve_identity
    from routes.magic_promotions import magic_enabled
    from routes.orders import _razorpay_client, _short_id, build_server_items, check_stock

    if not magic_enabled(session):
        raise HTTPException(status_code=400, detail="Magic Checkout is switched off")
    ident = resolve_identity(token, session)
    items = build_server_items(body.model_dump(), session)
    check_stock(items, session)
    subtotal = round(sum(i["price"] * i["quantity"] for i in items), 2)
    amount_paise = _paise(subtotal)

    line_items = []
    for it in items:
        p = session.get(Product, it["productId"])
        offer = _paise(it["price"])
        mrp = max(offer, _paise(p.mrp)) if p and p.mrp else offer
        line_items.append({
            "type": "e-commerce",
            "sku": str(it["productId"]),
            "variant_id": str(it.get("variantId") or it["productId"]),
            "price": mrp,
            "offer_price": offer,
            "tax_amount": 0,
            "quantity": it["quantity"],
            "name": (it["productName"] or "Jewellery")[:120],
            "description": (it["productName"] or "")[:250],
            "image_url": (p.image if p else None) or "",
            "product_url": f"{FRONTEND}/product/{p.slug}" if p and p.slug else FRONTEND,
        })

    client, creds = _razorpay_client(session)
    receipt = f"mc_{int(time.time())}_{_short_id()}"
    try:
        rz = client.order.create(data={
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "line_items_total": amount_paise,
            "line_items": line_items,
            "notes": {"source": "magic_checkout"},
        })
    except Exception as e:
        print(f"Magic Checkout order error: {e}")
        raise HTTPException(status_code=502, detail="Could not start the checkout. Please try again.")

    prefill = {k: v for k, v in {"name": body.name, "email": body.email, "contact": body.contact}.items() if v}
    for key in (rz["id"], receipt):   # Razorpay's coupon / shipping calls may send either
        session.add(PendingCheckout(
            gateway_order_id=key, provider=PROVIDER,
            order_data_json=json.dumps(prefill), items_json=json.dumps(items),
            subtotal=subtotal, coupon_code=None, coupon_discount=0.0, prepaid_discount=0.0,
            amount=subtotal, amount_paise=amount_paise, user_id=ident.get("supabase_uid"),
        ))
    session.commit()
    return {
        "orderId": rz["id"], "key": creds.get("key_id"), "amount": amount_paise, "currency": "INR",
        "name": "Varaha Jewels", "prefill": prefill,
    }


def _good_payment(payments: list) -> Optional[dict]:
    for p in payments:
        status, method = (p.get("status") or "").lower(), (p.get("method") or "").lower()
        if status in ("captured", "authorized"):
            return p
        if method == "cod" and status in ("pending", "created"):
            return p
    return None


def finalize_magic(session: Session, pending: PendingCheckout, background_tasks: Optional[BackgroundTasks] = None) -> Optional[Order]:
    """Create our Order for a finished Magic Checkout (idempotent). None if not paid / no COD yet."""
    from routes.orders import (_auto_save_address, _create_order_record, _order_payload, _razorpay_client,
                               deduct_stock_for_items)
    from notifications import send_order_notifications

    try:
        pending = session.exec(select(PendingCheckout).where(
            PendingCheckout.gateway_order_id == pending.gateway_order_id).with_for_update()).first() or pending
    except Exception:
        pass
    order_id = f"ORD-{pending.gateway_order_id.replace('order_', '')}"
    if pending.order_id or session.exec(select(Order).where(Order.order_id == order_id)).first():
        return session.exec(select(Order).where(Order.order_id == (pending.order_id or order_id))).first()

    client, _ = _razorpay_client(session)
    rz = client.order.fetch(pending.gateway_order_id)
    pays = (client.order.payments(pending.gateway_order_id) or {}).get("items") or []
    pay = _good_payment(pays)
    if not pay:
        return None
    is_cod = (pay.get("method") or "").lower() == "cod"

    prefill = json.loads(pending.order_data_json or "{}")
    cd = rz.get("customer_details") or {}
    ship = cd.get("shipping_address") or {}
    state = (ship.get("state") or "").strip()
    state = STATE_NAMES.get(state.upper(), state) if len(state) <= 3 else state
    cust = {
        "name": ship.get("name") or cd.get("name") or prefill.get("name") or "Customer",
        "email": cd.get("email") or pay.get("email") or prefill.get("email") or "",
        "contact": cd.get("contact") or ship.get("contact") or pay.get("contact") or prefill.get("contact") or "",
        "address": ", ".join(x for x in [ship.get("line1"), ship.get("line2"), ship.get("landmark")] if x),
        "city": ship.get("city") or "",
        "state": state,
        "pincode": str(ship.get("zipcode") or ship.get("pincode") or ""),
    }

    # Amounts as Razorpay finally charged them (it validated the coupon with our apply URL)
    promos = [p for p in (rz.get("promotions") or []) if isinstance(p, dict)]
    coupon_code = next((str(p.get("code")).upper() for p in promos if p.get("code")), None)
    coupon_discount = round(sum(float(p.get("value") or 0) for p in promos) / 100, 2)
    cod_fee = round(float(rz.get("cod_fee") or 0) / 100, 2) if is_cod else 0.0
    shipping_fee = round(float(rz.get("shipping_fee") or 0) / 100, 2)
    charged = round(float(pay.get("amount") or rz.get("amount") or 0) / 100, 2)
    expected = round(pending.subtotal - coupon_discount + cod_fee + shipping_fee, 2)
    note = ""
    if abs(expected - charged) > 1:
        note = f" | CHECK AMOUNT: expected ₹{expected}, Razorpay ₹{charged}"
        print(f"🚨 Magic Checkout amount mismatch {pending.gateway_order_id}: expected {expected}, got {charged}")

    pricing = {
        "subtotal": pending.subtotal, "coupon_code": coupon_code, "coupon_discount": coupon_discount,
        "prepaid_discount": 0.0, "cod_charge": cod_fee, "total": charged or expected,
    }
    items = json.loads(pending.items_json or "[]")
    order = _create_order_record(
        session, order_id=order_id, cust=cust, items=items, pricing=pricing,
        payment_method="cod" if is_cod else "online", status="pending" if is_cod else "paid",
        user_id=pending.user_id,
        comment=f"Magic Checkout ({'COD' if is_cod else 'paid online'}). Ref: {pay.get('id')}{note}",
    )
    for row in session.exec(select(PendingCheckout).where(PendingCheckout.gateway_order_id.in_(
            [pending.gateway_order_id, rz.get("receipt") or ""]))).all():
        row.order_id = order.order_id
        session.add(row)
    session.commit()

    deduct_stock_for_items(items, session, order.order_id)
    try:
        customer = session.exec(select(Customer).where(Customer.email == cust["email"])).first() if cust["email"] else None
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


@router.post("/api/magic/complete")
def magic_complete(body: MagicCompleteReq, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    from routes.orders import _order_response
    pending = session.get(PendingCheckout, body.razorpay_order_id)
    if not pending or pending.provider != PROVIDER:
        raise HTTPException(status_code=404, detail="Checkout not found")
    order = finalize_magic(session, pending, background_tasks)
    if not order:
        raise HTTPException(status_code=409, detail="Payment not confirmed yet")
    out = _order_response(order)
    out["cod"] = order.payment_method == "cod"
    return out
