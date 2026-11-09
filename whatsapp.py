"""WhatsApp order confirmation through Meta's WhatsApp Cloud API.

Switched on by environment variables (nothing is sent until they are set):
  META_WA_TOKEN      permanent token of a System User   (secret - only in Render)
  META_WA_PHONE_ID   the WhatsApp number's Phone number ID
  META_WA_TEMPLATE   plain Utility template name         (default: order_confirmation)
  META_WA_PHOTO_TEMPLATE  template with the product photo (default: order_confirmation_photo,
                          set it empty to never use it)
  META_WA_LANG       template language code              (default: en)
Set META_WA_ENABLED=0 to switch it off without removing the token.

Photo template (used when the order's product has a photo):
  header IMAGE = product photo, body {{1}} first name {{2}} order id {{3}} amount,
  URL button "Track your order" = https://varahajewels.in/track/{{1}}  ({{1}} = "<order id>_<token>")
Plain template (fallback when there is no photo or the photo template fails):
  body {{1}} first name {{2}} order id {{3}} amount {{4}} tracking link
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


def _product_photo(order_data: dict) -> str:
    """Public JPG link of the first product's photo (WhatsApp accepts JPG/PNG, not WebP/AVIF)."""
    try:
        items = order_data.get("items_json") or "[]"
        items = json.loads(items) if isinstance(items, str) else items
        pid = next((i.get("productId") or i.get("id") or i.get("product_id") for i in items if isinstance(i, dict)), None)
        if not pid:
            return ""
        from database import engine
        from models import Product
        with Session(engine) as s:
            prod = s.get(Product, pid)
            url = (prod.image or "") if prod else ""
        if "res.cloudinary.com" in url and "/upload/" in url:
            return url.replace("/upload/", "/upload/f_jpg,w_800,h_800,c_pad,b_white/", 1)
        return url if re.search(r"\.(jpe?g|png)(\?|$)", url, re.I) and url.startswith("https://") else ""
    except Exception as e:
        logger.error(f"WhatsApp photo lookup failed: {e}")
        return ""


def _post(body: dict):
    r = requests.post(
        f"{GRAPH}/{os.getenv('META_WA_PHONE_ID')}/messages",
        headers={"Authorization": f"Bearer {os.getenv('META_WA_TOKEN')}", "Content-Type": "application/json"},
        json=body, timeout=15,
    )
    return r, (r.json() if r.content else {})


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
        track_key = f"{order_id}_{generate_tracking_token(order_id)}"
        link = f"{site}/track/{track_key}"
        name = (order_data.get("customer_name") or "").strip().split(" ")[0] or "Customer"
        amount = f"{round(float(order_data.get('total_amount') or 0)):,}"
        lang = {"code": os.getenv("META_WA_LANG", "en")}
        text = lambda vals: [{"type": "text", "text": v} for v in vals]

        r, data, used = None, {}, ""
        photo_tpl = os.getenv("META_WA_PHOTO_TEMPLATE", "order_confirmation_photo")
        photo = _product_photo(order_data) if photo_tpl else ""
        if photo:
            # Product photo on top, "Track your order" button opens this order's tracking page
            r, data = _post({"messaging_product": "whatsapp", "to": to, "type": "template", "template": {
                "name": photo_tpl, "language": lang, "components": [
                    {"type": "header", "parameters": [{"type": "image", "image": {"link": photo}}]},
                    {"type": "body", "parameters": text([name[:30], str(order_id), amount])},
                    {"type": "button", "sub_type": "url", "index": "0", "parameters": [{"type": "text", "text": track_key}]},
                ]}})
            used = "with photo"
            if not (r.ok and data.get("messages")):
                logger.error(f"WhatsApp photo template failed for {order_id}, using the plain one: {data}")
        if not (r is not None and r.ok and data.get("messages")):
            r, data = _post({"messaging_product": "whatsapp", "to": to, "type": "template", "template": {
                "name": os.getenv("META_WA_TEMPLATE", "order_confirmation"), "language": lang,
                "components": [{"type": "body", "parameters": text([name[:30], str(order_id), amount, link])}]}})
            used = "plain"
        if r.ok and data.get("messages"):
            _note(order_id, f"{MARK} sent to +{to}, {used} (id {data['messages'][0].get('id', '')[:24]})")
        else:
            err = (data.get("error") or {})
            _note(order_id, f"{MARK} failed: {err.get('message') or r.status_code} (code {err.get('code', '-')})")
            logger.error(f"WhatsApp send failed for {order_id}: {data}")
    except Exception as e:
        _note(order_id, f"{MARK} failed: {str(e)[:120]}")
        logger.error(f"WhatsApp send error for {order_id}: {e}")
