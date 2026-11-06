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


def _cart(session: Session, body):
    """Our saved cart for a Magic Checkout call. Razorpay may send its order id or our receipt."""
    if not isinstance(body, dict):
        body = {"order_id": body}
    for key in ("order_id", "razorpay_order_id"):
        v = str(body.get(key) or "").strip()
        if not v:
            continue
        # Razorpay sometimes sends its order id without the "order_" prefix
        for cand in (v, f"order_{v}" if not v.startswith(("order_", "mc_", "rcpt_")) else None):
            if cand:
                row = session.get(PendingCheckout, cand)
                if row:
                    return row
    return None


def _fail(code: str, reason: str) -> JSONResponse:
    return JSONResponse(status_code=400, content={"failure_code": code, "failure_reason": reason})


def _log_call(session: Session, request: Request, raw: bytes, status: str = ""):
    """Keep the last 8 calls Razorpay made to our Magic Checkout URLs (to debug the setup)."""
    try:
        from datetime import datetime
        from models import SystemSetting
        ua = request.headers.get("user-agent", "")
        if ua.lower().startswith("curl"):
            return   # our own tests
        row = session.get(SystemSetting, "magic_debug") or SystemSetting(key="magic_debug", value="[]", description="Last Magic Checkout calls")
        calls = json.loads(row.value or "[]")
        calls.append({"t": datetime.utcnow().isoformat(), "m": request.method, "path": request.url.path,
                      "ct": request.headers.get("content-type", ""), "ua": request.headers.get("user-agent", "")[:60],
                      "body": raw.decode("utf-8", "ignore")[:600], "status": status})
        row.value = json.dumps(calls[-30:])
        session.add(row)
        session.commit()
    except Exception:
        session.rollback()


async def _body(request: Request) -> dict:
    raw = b""
    try:
        raw = await request.body()
        data = json.loads(raw or b"{}")
        request.state.raw = raw
        return data if isinstance(data, dict) else {}
    except Exception:
        request.state.raw = raw
        return {}


@router.api_route("/api/magic/promotions", methods=["GET", "POST"])
async def get_promotions(request: Request, session: Session = Depends(get_session)):
    from coupon_rules import check_coupon_rules
    from fastapi import HTTPException
    body = await _body(request)
    if request.method == "GET":
        body = {**dict(request.query_params), **body}
    _log_call(session, request, getattr(request.state, "raw", b"") or str(dict(request.query_params)).encode())
    pending = _cart(session, body)
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
    _log_call(session, request, getattr(request.state, "raw", b""))
    code = (body.get("code") or "").strip().upper()
    if not code:
        return _fail("INVALID_PROMOTION", "Please enter a coupon code")
    coupon = session.exec(select(Coupon).where(Coupon.code == code)).first()
    if not coupon or not coupon.is_active:
        return _fail("INVALID_PROMOTION", "This coupon code is not valid")
    pending = _cart(session, body)
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


# ---------------------------------------------------------------------------
# Shipping info: Razorpay asks, for each address the shopper picks, whether we
# deliver there and what delivery / COD cost. Delivery is free; COD costs the
# store's COD fee only on small orders (same rule as the normal checkout).
# ---------------------------------------------------------------------------
@router.post("/api/magic/shipping")
async def shipping_info(request: Request, session: Session = Depends(get_session)):
    from routes.orders import COD_CHARGE, FREE_DELIVERY_MIN, ServiceabilityCheck, check_serviceability
    from models import BlockedRegion
    body = await _body(request)
    _log_call(session, request, getattr(request.state, "raw", b""))
    pending = _cart(session, body)
    value = (pending.subtotal - (pending.coupon_discount or 0)) if pending else None
    cod_fee = 0 if (value is None or value >= FREE_DELIVERY_MIN) else int(round(COD_CHARGE * 100))
    blocked = {r.region_code.upper() for r in session.exec(select(BlockedRegion).where(BlockedRegion.is_blocked == True)).all()}  # noqa: E712

    out = []
    for a in (body.get("addresses") or []):
        if not isinstance(a, dict):
            continue
        zipcode = str(a.get("zipcode") or "").strip()
        state = str(a.get("state_code") or "").strip().upper()
        country = str(a.get("country") or "IN").strip().upper()
        serviceable, cod_ok, eta = False, False, None
        if country == "IN" and len(zipcode) == 6 and zipcode.isdigit() and state not in blocked:
            try:
                r = check_serviceability(ServiceabilityCheck(delivery_pincode=zipcode, mode="COD", value=value or 1000.0), session)
                serviceable, cod_ok, eta = bool(r.get("available")), bool(r.get("cod", True)), r.get("date")
            except Exception:
                serviceable, cod_ok = True, True   # do not lose an order if the courier lookup is down
        out.append({
            "id": a.get("id"), "zipcode": zipcode, "state_code": a.get("state_code"), "country": a.get("country"),
            "shipping_methods": [{
                "id": "1",
                "name": "Standard delivery",
                "description": f"Delivery by {eta}" if eta else "Delivery in 3 to 7 days",
                "serviceable": serviceable,
                "shipping_fee": 0,
                "cod": bool(serviceable and cod_ok),
                "cod_fee": cod_fee if (serviceable and cod_ok) else 0,
            }],
        })
    return {"addresses": out}
