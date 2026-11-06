"""Coupon URLs for Razorpay Magic Checkout ("Coupon Settings" in the Razorpay dashboard).

  Get promotions   POST /api/magic/promotions        -> coupons the shopper can see
  Apply promotion  POST /api/magic/promotions/apply  -> checks a code, returns the discount

Magic Checkout calls these from Razorpay's servers: no login, public URLs, 10 s limit.
The cart is read from our own saved checkout (PendingCheckout, keyed by the
Razorpay order id), so the discount is worked out by the same server code as a
normal order. Nothing here changes an order or a coupon.
"""
import json
from typing import Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlmodel import Session, select

from database import get_session
from models import Coupon, PendingCheckout

router = APIRouter()

# Never listed to shoppers: spin-wheel prizes, test coupons, and anything that sets a
# fixed price or takes off more than half.
def _listable(c: Coupon) -> bool:
    if not c.is_active or c.code.upper().startswith(("SPIN", "TEST", "VJTEST")):
        return False
    if c.discount_type == "flat_price":
        return False
    if c.discount_type == "percentage" and c.discount_value > 50:
        return False
    return True


def _summary(c: Coupon) -> str:
    if c.discount_type == "percentage":
        s = f"{c.discount_value:g}% off"
        if c.max_discount:
            s += f" up to ₹{c.max_discount:,.0f}"
    else:
        s = f"₹{c.discount_value:,.0f} off"
    if c.min_order_amount:
        s += f" on orders above ₹{c.min_order_amount:,.0f}"
    r = (c.payment_method_restriction or "none").lower()
    if r == "prepaid_only":
        s += " (online payment)"
    elif r == "cod_only":
        s += " (cash on delivery)"
    return s


def _cart(session: Session, order_id: Optional[str]):
    if not order_id:
        return None
    return session.get(PendingCheckout, order_id)


def _fail(code: str, reason: str) -> JSONResponse:
    return JSONResponse(status_code=400, content={"failure_code": code, "failure_reason": reason})


async def _body(request: Request) -> dict:
    try:
        data = await request.json()
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


@router.post("/api/magic/promotions")
async def get_promotions(request: Request, session: Session = Depends(get_session)):
    from coupon_rules import check_coupon_rules
    from fastapi import HTTPException
    body = await _body(request)
    pending = _cart(session, body.get("order_id"))
    subtotal = pending.subtotal if pending else None
    out = []
    for c in session.exec(select(Coupon).where(Coupon.is_active == True)).all():  # noqa: E712
        if not _listable(c):
            continue
        try:
            check_coupon_rules(session, c.code, body.get("email"), body.get("contact"))
        except HTTPException:
            continue  # expired, not started yet, or used up
        if subtotal is not None and c.min_order_amount and subtotal < c.min_order_amount:
            continue
        out.append({"code": c.code, "summary": _summary(c), "description": _summary(c)})
    return {"promotions": out}


@router.post("/api/magic/promotions/apply")
async def apply_promotion(request: Request, session: Session = Depends(get_session)):
    from fastapi import HTTPException
    from routes.orders import compute_pricing
    body = await _body(request)
    code = (body.get("code") or "").strip().upper()
    if not code:
        return _fail("INVALID_PROMOTION", "Please enter a coupon code")
    coupon = session.exec(select(Coupon).where(Coupon.code == code)).first()
    if not coupon or not coupon.is_active:
        return _fail("INVALID_PROMOTION", "This coupon code is not valid")
    pending = _cart(session, body.get("order_id"))
    if not pending:
        return _fail("INVALID_PROMOTION", "We could not find your cart. Please try again.")
    try:
        items = json.loads(pending.items_json or "[]")
        cust = json.loads(pending.order_data_json or "{}")
        cust = {"email": body.get("email") or cust.get("email"), "contact": body.get("contact") or cust.get("contact")}
        pricing = compute_pricing(items, code, "prepaid", session, cust)
    except HTTPException as e:
        return _fail("REQUIREMENT_NOT_MET", str(e.detail))
    except Exception:
        return _fail("INVALID_PROMOTION", "This coupon cannot be applied right now")
    discount = float(pricing.get("coupon_discount") or 0)
    if discount <= 0:
        return _fail("REQUIREMENT_NOT_MET", f"The cart does not meet the conditions for {code}")
    return {"promotion": {
        "reference_id": code, "code": code, "type": "coupon",
        "value": int(round(discount * 100)), "value_type": "fixed_amount",
        "description": _summary(coupon),
    }}


# ---------------------------------------------------------------------------
# Admin on/off switch for Magic Checkout (off by default).
# The storefront reads /api/magic/config to decide which checkout to show.
# ---------------------------------------------------------------------------
from datetime import datetime
from pydantic import BaseModel
from dependencies import get_current_admin
from models import SystemSetting

MAGIC_KEY = "magic_checkout_enabled"


def magic_enabled(session: Session) -> bool:
    row = session.get(SystemSetting, MAGIC_KEY)
    return bool(row and str(row.value).lower() in ("1", "true", "on"))


class MagicSettingReq(BaseModel):
    enabled: bool


@router.get("/api/magic/config")
def magic_config(session: Session = Depends(get_session)):
    return {"enabled": magic_enabled(session)}


@router.get("/api/admin/magic-setting")
def get_magic_setting(session: Session = Depends(get_session), current_user=Depends(get_current_admin)):
    return {"enabled": magic_enabled(session)}


@router.put("/api/admin/magic-setting")
def set_magic_setting(body: MagicSettingReq, session: Session = Depends(get_session), current_user=Depends(get_current_admin)):
    row = session.get(SystemSetting, MAGIC_KEY)
    if row is None:
        row = SystemSetting(key=MAGIC_KEY, value="0", description="Use Razorpay Magic Checkout")
    row.value = "1" if body.enabled else "0"
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    return {"enabled": body.enabled}
