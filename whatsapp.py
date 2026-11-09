"""WhatsApp order confirmation through Meta's WhatsApp Cloud API.

Switched on by environment variables (nothing is sent until they are set):
  META_WA_TOKEN      permanent token of a System User   (secret - only in Render)
  META_WA_PHONE_ID   the WhatsApp number's Phone number ID
  META_WA_TEMPLATE   approved Utility template name      (default: order_confirmation)
  META_WA_LANG       template language code              (default: en)
Set META_WA_ENABLED=0 to switch it off without removing the token.

The template needs 4 body variables, in this order:
  {{1}} first name   {{2}} order id   {{3}} amount in rupees   {{4}} tracking link
"""
import json
import logging
import os
import re
from datetime import datetime

import requests
from sqlmodel import Session, select

logger = logging.getLogger(__name__)
GRAPH = "https://graph.facebook.com/v21.0"
MARK = "WhatsApp confirmation"


def enabled() -> bool:
    return bool(os.getenv("META_WA_TOKEN") and os.getenv("META_WA_PHONE_ID")) and os.getenv("META_WA_ENABLED", "1") != "0"


def _to_number(phone) -> str:
    d = re.sub(r"\D", "", str(phone or ""))
    d = d[-10:] if len(d) >= 10 else ""
    return f"91{d}" if re.fullmatch(r"[6-9]\d{9}", d) else ""


def _note(order_id: str, text: str):
    """Write the result on the order's timeline (shows in Admin -> Orders)."""
    try:
        from database import engine
        from models import Order
        with Session(engine) as s:
            o = s.exec(select(Order).where(Order.order_id == order_id)).first()
            if o:
                hist = json.loads(o.status_history or "[]")
                hist.append({"status": o.status, "timestamp": datetime.utcnow().isoformat(), "comment": text})
                o.status_history = json.dumps(hist)
                s.add(o)
                s.commit()
    except Exception as e:  # never break an order because a note could not be saved
        logger.error(f"WhatsApp note failed: {e}")


def _already_sent(order_id: str) -> bool:
    try:
        from database import engine
        from models import Order
        with Session(engine) as s:
            o = s.exec(select(Order).where(Order.order_id == order_id)).first()
            return bool(o and MARK + " sent" in (o.status_history or ""))
    except Exception:
        return False


def send_order_confirmation(order_data: dict):
    """Called after an order is placed. Safe to call always: does nothing when not set up."""
    if not enabled():
        return
    order_id = order_data.get("order_id")
    to = _to_number(order_data.get("phone"))
    if not order_id or not to or _already_sent(order_id):
        if order_id and not to:
            _note(order_id, f"{MARK} skipped: no valid mobile number")
        return
    try:
        from routes.tracking import generate_tracking_token
        site = os.getenv("FRONTEND_URL", "https://varahajewels.in").rstrip("/")
        link = f"{site}/track/{order_id}_{generate_tracking_token(order_id)}"
        name = (order_data.get("customer_name") or "").strip().split(" ")[0] or "Customer"
        amount = f"{round(float(order_data.get('total_amount') or 0)):,}"
        params = [name[:30], str(order_id), amount, link]
        body = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": os.getenv("META_WA_TEMPLATE", "order_confirmation"),
                "language": {"code": os.getenv("META_WA_LANG", "en")},
                "components": [{"type": "body", "parameters": [{"type": "text", "text": p} for p in params]}],
            },
        }
        r = requests.post(
            f"{GRAPH}/{os.getenv('META_WA_PHONE_ID')}/messages",
            headers={"Authorization": f"Bearer {os.getenv('META_WA_TOKEN')}", "Content-Type": "application/json"},
            json=body, timeout=15,
        )
        data = r.json() if r.content else {}
        if r.ok and data.get("messages"):
            _note(order_id, f"{MARK} sent to +{to} (id {data['messages'][0].get('id', '')[:24]})")
        else:
            err = (data.get("error") or {})
            _note(order_id, f"{MARK} failed: {err.get('message') or r.status_code} (code {err.get('code', '-')})")
            logger.error(f"WhatsApp send failed for {order_id}: {data}")
    except Exception as e:
        _note(order_id, f"{MARK} failed: {str(e)[:120]}")
        logger.error(f"WhatsApp send error for {order_id}: {e}")
