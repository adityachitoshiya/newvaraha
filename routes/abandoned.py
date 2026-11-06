"""Abandoned checkouts reported by Razorpay Magic Checkout ("Enable the Abandoned webhook to track").

Razorpay posts a JSON body (cart token, email, phone, items, total, a link back to the
checkout). We keep one row per cart so the team can follow up. Razorpay documents no
signature for this webhook, so the URL itself carries a secret: set MAGIC_WEBHOOK_KEY on
the server and put  ...?key=<that value>  in the dashboard URL.
"""
import hmac
import json
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlmodel import Field, Session, SQLModel, select

from database import get_session
from dependencies import get_current_admin

router = APIRouter()
MAX_BODY = 200_000


class AbandonedCheckout(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cart_token: str = Field(index=True)
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    total: Optional[float] = None          # rupees
    items_json: str = "[]"
    checkout_url: Optional[str] = None
    raw_json: str = "{}"
    contacted: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


def _num(v) -> Optional[float]:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


@router.post("/api/magic/abandoned")
async def abandoned_webhook(request: Request, session: Session = Depends(get_session)):
    expected = os.getenv("MAGIC_WEBHOOK_KEY", "")
    if expected and not hmac.compare_digest(request.query_params.get("key", ""), expected):
        return {"ok": False}   # wrong key: ignore quietly
    raw = await request.body()
    if len(raw) > MAX_BODY:
        return {"ok": False}
    try:
        data = json.loads(raw or b"{}")
        if not isinstance(data, dict):
            raise ValueError
    except Exception:
        return {"ok": False}

    cust = data.get("customer") or {}
    ship = cust.get("Shipping_address") or cust.get("shipping_address") or {}
    name = " ".join(x for x in [cust.get("first_name"), cust.get("last_name")] if x) or ship.get("name")
    items = [{"name": i.get("name") or i.get("title"), "qty": i.get("quantity"), "price": _num(i.get("price")),
              "image": i.get("image_url"), "sku": i.get("sku")} for i in (data.get("line_items") or []) if isinstance(i, dict)]
    total = _num(data.get("line_items_total"))
    # Razorpay amounts are in paise
    total = round(total / 100, 2) if total is not None else None
    for it in items:
        if it["price"] is not None:
            it["price"] = round(it["price"] / 100, 2)
    token = str(data.get("cart_token") or data.get("token") or data.get("email") or data.get("phone") or datetime.utcnow().timestamp())

    row = session.exec(select(AbandonedCheckout).where(AbandonedCheckout.cart_token == token)).first()
    if row is None:
        row = AbandonedCheckout(cart_token=token)
    row.name = name or row.name
    row.email = data.get("email") or cust.get("email") or row.email
    row.phone = data.get("phone") or ship.get("phone") or row.phone
    row.total = total if total is not None else row.total
    row.items_json = json.dumps(items)
    row.checkout_url = data.get("abandoned_checkout_url") or row.checkout_url
    row.raw_json = raw.decode("utf-8", "ignore")
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    return {"ok": True}


@router.get("/api/admin/abandoned")
def list_abandoned(session: Session = Depends(get_session), current_user=Depends(get_current_admin)):
    rows = session.exec(select(AbandonedCheckout).order_by(AbandonedCheckout.updated_at.desc()).limit(300)).all()
    return [{
        "id": r.id, "name": r.name, "email": r.email, "phone": r.phone, "total": r.total,
        "items": json.loads(r.items_json or "[]"), "checkout_url": r.checkout_url,
        "contacted": r.contacted, "at": r.updated_at.isoformat() + "Z",
    } for r in rows]


@router.put("/api/admin/abandoned/{row_id}/contacted")
def mark_contacted(row_id: int, contacted: bool = True, session: Session = Depends(get_session), current_user=Depends(get_current_admin)):
    r = session.get(AbandonedCheckout, row_id)
    if r:
        r.contacted = contacted
        session.add(r)
        session.commit()
    return {"ok": True}
