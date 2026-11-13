"""WhatsApp support bot + admin inbox (Meta Cloud API webhook).

Customer writes to the business number -> Meta calls POST /api/whatsapp/webhook -> the bot answers.
First message: choose language (English / हिंदी). Then a menu:
  Track order      orders placed with this WhatsApp number, status + tracking link
  Return/Exchange  delivered orders from the last 7 days -> Return or Exchange -> reason
                   -> saved in Admin > Returns (when the order has a customer account),
                      Telegram alert, chat handed to the team
  Shop & offers    site links + offers from /api/offers
  Talk to team     bot goes quiet for 24 h, Telegram alert, reply from Admin > WhatsApp Inbox
Replies to a customer message are free (service window); the inbox can only reply within 24 h
of the customer's last message.

Environment:
  META_WA_TOKEN, META_WA_PHONE_ID   same as the order messages
  META_WA_VERIFY_TOKEN             any random text, also typed in the Meta app webhook settings
  META_APP_SECRET                  Meta app secret, used to check that webhook calls come from Meta
  WA_BOT_ENABLED=0                 stop bot replies (messages are still saved)
"""
import hashlib
import html
import hmac
import json
import logging
import os
import re
from contextvars import ContextVar
from datetime import datetime, timedelta
from typing import Optional

import requests
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Field, Session, SQLModel, select

from database import engine, get_session
from dependencies import get_current_admin

logger = logging.getLogger(__name__)
router = APIRouter()
GRAPH = "https://graph.facebook.com/v21.0"
SITE = "https://www.varahajewels.in"
HUMAN_HOURS = 24
RETURN_DAYS = 7


class WaChat(SQLModel, table=True):
    phone: str = Field(primary_key=True)          # 91XXXXXXXXXX
    name: Optional[str] = None
    lang: Optional[str] = None                    # en | hi
    mode: str = "bot"                             # bot | human
    state: Optional[str] = None                   # step of a flow, e.g. "ret_kind:ORD-1"
    human_until: Optional[datetime] = None
    last_in_at: Optional[datetime] = None         # last customer message (24 h reply window)
    last_at: Optional[datetime] = None
    unread: int = 0


class WaMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    phone: str = Field(index=True)
    direction: str                                # in | out
    sender: str = "customer"                      # customer | bot | team
    text: str = ""
    wa_id: Optional[str] = Field(default=None, index=True, unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WaWebhookStatus(SQLModel, table=True):
    """One row (id=1): what the webhook last saw, shown in Admin > WhatsApp Inbox."""
    id: int = Field(default=1, primary_key=True)
    last_call_at: Optional[datetime] = None       # any call that passed the signature check
    last_message_at: Optional[datetime] = None    # last customer message saved
    last_bad_sig_at: Optional[datetime] = None    # call rejected: signature did not match META_APP_SECRET
    last_error: Optional[str] = None
    last_error_at: Optional[datetime] = None


def _status(**fields):
    try:
        with Session(engine) as s:
            row = s.get(WaWebhookStatus, 1) or WaWebhookStatus(id=1)
            for k, v in fields.items():
                setattr(row, k, v)
            s.add(row)
            s.commit()
    except Exception as e:
        logger.error(f"WhatsApp webhook status save failed: {e}")


_reply_pid: ContextVar[Optional[str]] = ContextVar("wa_reply_pid", default=None)


# ---------------------------------------------------------------- texts
T = {
    "lang_pick": {"en": "Welcome to *Varaha Jewels* ✨\nPlease choose your language.\nकृपया अपनी भाषा चुनें।"},
    "menu": {"en": "How can we help you today?", "hi": "हम आपकी क्या मदद कर सकते हैं?"},
    "menu_btn": {"en": "Menu", "hi": "मेनू"},
    "r_track": {"en": ("Track order", "Status of your orders"), "hi": ("ऑर्डर ट्रैक करें", "अपने ऑर्डर का स्टेटस देखें")},
    "r_return": {"en": ("Return / Exchange", "Within 7 days of delivery"), "hi": ("रिटर्न / एक्सचेंज", "डिलीवरी के 7 दिन के अंदर")},
    "r_shop": {"en": ("Shop & offers", "Collections and current offers"), "hi": ("शॉप और ऑफ़र", "कलेक्शन और चालू ऑफ़र")},
    "r_human": {"en": ("Talk to our team", "Chat with a person"), "hi": ("टीम से बात करें", "हमारी टीम से चैट करें")},
    "r_lang": {"en": ("Change language", "English / हिंदी"), "hi": ("भाषा बदलें", "English / हिंदी")},
    "no_orders": {"en": "We couldn't find any order placed with this WhatsApp number.\n\nIf you used a different number, please open the tracking link in your order confirmation, or send your *Order ID* here.",
                  "hi": "इस WhatsApp नंबर से कोई ऑर्डर नहीं मिला।\n\nअगर ऑर्डर किसी दूसरे नंबर से किया है, तो कन्फ़र्मेशन मैसेज वाला ट्रैकिंग लिंक खोलें, या यहाँ अपना *Order ID* भेजें।"},
    "orders_head": {"en": "Your recent orders:", "hi": "आपके हाल के ऑर्डर:"},
    "order_other": {"en": "This order is not linked to this WhatsApp number. Please use the tracking link from your order confirmation, or tap *Talk to our team*.",
                    "hi": "यह ऑर्डर इस WhatsApp नंबर से जुड़ा नहीं है। कृपया ऑर्डर कन्फ़र्मेशन वाला ट्रैकिंग लिंक खोलें, या *टीम से बात करें* चुनें।"},
    "ret_none": {"en": "Returns and exchanges are accepted within *7 days of delivery*.\n\nWe couldn't find a delivered order from the last 7 days on this number. If something is wrong with your order, please talk to our team.",
                 "hi": "रिटर्न और एक्सचेंज *डिलीवरी के 7 दिन के अंदर* होते हैं।\n\nइस नंबर पर पिछले 7 दिन में डिलीवर हुआ कोई ऑर्डर नहीं मिला। अगर ऑर्डर में कोई दिक्कत है, तो हमारी टीम से बात करें।"},
    "ret_pick": {"en": "Which order would you like to return or exchange?", "hi": "किस ऑर्डर को रिटर्न या एक्सचेंज करना है?"},
    "ret_pick_btn": {"en": "Choose order", "hi": "ऑर्डर चुनें"},
    "ret_exists": {"en": "A request for order {oid} already exists (status: {st}). Our team will update you here.",
                   "hi": "ऑर्डर {oid} के लिए रिक्वेस्ट पहले से है (स्टेटस: {st})। हमारी टीम यहीं जानकारी देगी।"},
    "ret_kind": {"en": "Order {oid}: do you want a return (refund) or an exchange?", "hi": "ऑर्डर {oid}: आपको रिटर्न (रिफ़ंड) चाहिए या एक्सचेंज?"},
    "b_return": {"en": "Return (refund)", "hi": "रिटर्न (रिफ़ंड)"},
    "b_exchange": {"en": "Exchange", "hi": "एक्सचेंज"},
    "ret_reason": {"en": "What is the reason?", "hi": "वजह क्या है?"},
    "b_damaged": {"en": "Damaged / broken", "hi": "टूटा / खराब"},
    "b_wrong": {"en": "Wrong item", "hi": "गलत सामान"},
    "b_other": {"en": "Other reason", "hi": "कोई और वजह"},
    "ret_done": {"en": "✅ Your {kind} request for order {oid} is registered.\n\nOur team will review it within 1–2 business days and reply on this chat. {extra}{after}",
                 "hi": "✅ ऑर्डर {oid} के लिए आपकी {kind} रिक्वेस्ट दर्ज हो गई है।\n\nहमारी टीम 1–2 कामकाजी दिन में इसे देखकर इसी चैट पर जवाब देगी। {extra}{after}"},
    "after_return": {"en": "Refunds reach your original payment method within 7–10 business days after we receive the item.",
                     "hi": "सामान मिलने के बाद रिफ़ंड 7–10 कामकाजी दिन में आपके पेमेंट मेथड में आ जाएगा।"},
    "after_exchange": {"en": "Once we receive the item, we will ship the replacement and share the tracking here.",
                       "hi": "सामान मिलने के बाद हम नया आइटम भेजेंगे और ट्रैकिंग यहीं भेज देंगे।"},
    "ret_photo": {"en": "Please send clear photos of the item here. ", "hi": "कृपया सामान की साफ़ फ़ोटो यहीं भेजें। "},
    "shop": {"en": "🛍️ *Shop Varaha Jewels*\nAll jewellery: {s}/shop\nNew arrivals: {s}/new-arrivals\nWomen: {s}/women\nMen: {s}/men\nSilver: {s}/silver\nWatches: {s}/watches\nPotli bags: {s}/potli-bags",
             "hi": "🛍️ *Varaha Jewels पर शॉपिंग करें*\nसारी ज्वेलरी: {s}/shop\nनए आइटम: {s}/new-arrivals\nमहिलाएँ: {s}/women\nपुरुष: {s}/men\nसिल्वर: {s}/silver\nघड़ियाँ: {s}/watches\nपोटली बैग: {s}/potli-bags"},
    "offers_head": {"en": "🎁 *Current offers*", "hi": "🎁 *चालू ऑफ़र*"},
    "code": {"en": "code", "hi": "कोड"},
    "human": {"en": "Sure! Our team has been notified and will reply on this chat soon (Mon–Sat, 10 AM – 6 PM).\nPlease type your question here.",
              "hi": "ज़रूर! हमारी टीम को बता दिया गया है, वे जल्द इसी चैट पर जवाब देंगे (सोम–शनि, सुबह 10 – शाम 6)।\nअपना सवाल यहाँ लिखें।"},
    "nonsense": {"en": "Sorry, I didn't get that. Please choose an option from the menu.", "hi": "माफ़ कीजिए, समझ नहीं आया। कृपया मेनू से कोई विकल्प चुनें।"},
    "view": {"en": "Track", "hi": "ट्रैक करें"},
}
STATUS = {
    "pending": ("Order received", "ऑर्डर मिल गया"), "confirmed": ("Confirmed", "कन्फ़र्म"),
    "processing": ("Being packed", "पैक हो रहा है"), "packed": ("Packed", "पैक हो गया"),
    "shipped": ("Shipped", "भेज दिया गया"), "in_transit": ("On the way", "रास्ते में है"),
    "out_for_delivery": ("Out for delivery", "आज डिलीवरी होगी"), "delivered": ("Delivered", "डिलीवर हो गया"),
    "cancelled": ("Cancelled", "रद्द"), "rto": ("Returning to us", "वापस आ रहा है"),
    "rto_delivered": ("Returned to us", "वापस आ गया"), "returned": ("Returned", "वापस हो गया"),
}


def t(key, lang, **kw):
    v = T[key].get(lang or "en") or T[key]["en"]
    return v.format(**kw) if kw and isinstance(v, str) else v


def status_label(st, lang):
    pair = STATUS.get((st or "").lower().replace(" ", "_"))
    if not pair:
        return (st or "").replace("_", " ").title()
    return pair[1] if lang == "hi" else pair[0]


# ---------------------------------------------------------------- sending
def _send(phone: str, payload: dict, log_text: str, session: Session, sender: str = "bot") -> bool:
    # Reply from the number the customer wrote to (set by the webhook), else the main number
    tok, pid = os.getenv("META_WA_TOKEN"), _reply_pid.get() or os.getenv("META_WA_PHONE_ID")
    ok, wa_id = False, None
    if tok and pid:
        try:
            r = requests.post(f"{GRAPH}/{pid}/messages", headers={"Authorization": f"Bearer {tok}"},
                              json={"messaging_product": "whatsapp", "to": phone, **payload}, timeout=15)
            data = r.json() if r.content else {}
            ok = r.ok and bool(data.get("messages"))
            wa_id = (data.get("messages") or [{}])[0].get("id") if ok else None
            if not ok:
                err = f"Send failed {r.status_code}: {(data.get('error') or {}).get('message')}"
                logger.error(f"WhatsApp bot {err}")
                _status(last_error=err[:300], last_error_at=datetime.utcnow())
        except Exception as e:
            logger.error(f"WhatsApp bot send error: {e}")
    session.add(WaMessage(phone=phone, direction="out", sender=sender, wa_id=wa_id,
                          text=log_text if ok else f"[not sent] {log_text}"))
    chat = session.get(WaChat, phone)
    if chat:
        chat.last_at = datetime.utcnow()
        session.add(chat)
    session.commit()
    return ok


def send_text(phone, text, session, sender="bot"):
    return _send(phone, {"type": "text", "text": {"body": text[:4000], "preview_url": False}}, text, session, sender)


def send_buttons(phone, text, buttons, session):
    """buttons: [(id, title<=20)] max 3"""
    return _send(phone, {"type": "interactive", "interactive": {
        "type": "button", "body": {"text": text},
        "action": {"buttons": [{"type": "reply", "reply": {"id": i, "title": b[:20]}} for i, b in buttons[:3]]}}},
        text + "\n[" + " | ".join(b for _, b in buttons) + "]", session)


def send_list(phone, text, button, rows, session):
    """rows: [(id, title<=24, description<=72)] max 10"""
    return _send(phone, {"type": "interactive", "interactive": {
        "type": "list", "body": {"text": text},
        "action": {"button": button[:20], "sections": [{"title": "Varaha Jewels", "rows": [
            {"id": i, "title": ti[:24], "description": (d or "")[:72]} for i, ti, d in rows[:10]]}]}}},
        text + "\n[" + " | ".join(ti for _, ti, _ in rows) + "]", session)


# ---------------------------------------------------------------- order helpers
def _orders_for(phone: str, session: Session, limit: int = 10):
    from models import Order
    last10 = phone[-10:]
    return session.exec(select(Order).where(Order.phone.like(f"%{last10}"))
                        .order_by(Order.created_at.desc()).limit(limit)).all()


def _track_link(order_id: str) -> str:
    from routes.tracking import generate_tracking_token
    return f"{SITE}/track/{order_id}_{generate_tracking_token(order_id)}"


def _delivered_at(order) -> Optional[datetime]:
    try:
        for e in json.loads(order.status_history or "[]"):
            if str(e.get("status", "")).lower() == "delivered" and e.get("timestamp"):
                return datetime.fromisoformat(str(e["timestamp"]).replace("Z", "").split("+")[0])
    except Exception:
        pass
    return None


def _order_line(o, lang) -> str:
    when = (o.created_at + timedelta(hours=5, minutes=30)).strftime("%d %b") if o.created_at else ""
    return (f"*{o.order_id}* · ₹{o.total_amount:,.0f} · {when}\n"
            f"{status_label(o.status, lang)}\n{t('view', lang)}: {_track_link(o.order_id)}")


# ---------------------------------------------------------------- bot flows
def show_language(chat, session):
    chat.state = None
    send_buttons(chat.phone, t("lang_pick", "en"), [("lang:en", "English"), ("lang:hi", "हिंदी")], session)


def show_menu(chat, session, prefix: str = ""):
    chat.state = None
    L = chat.lang
    rows = [(f"m:{k}", *t(f"r_{k}", L)) for k in ("track", "return", "shop", "human", "lang")]
    send_list(chat.phone, (prefix + "\n\n" if prefix else "") + t("menu", L), t("menu_btn", L), rows, session)


def do_track(chat, session):
    L = chat.lang
    orders = _orders_for(chat.phone, session, 3)
    if not orders:
        chat.state = "await_order_id"
        send_text(chat.phone, t("no_orders", L), session)
        return
    send_text(chat.phone, t("orders_head", L) + "\n\n" + "\n\n".join(_order_line(o, L) for o in orders), session)
    show_menu(chat, session)


def do_order_id(chat, text, session):
    from models import Order
    oid = text.strip().upper()
    o = session.exec(select(Order).where(func.upper(Order.order_id) == oid)).first()
    if o and re.sub(r"\D", "", o.phone or "")[-10:] == chat.phone[-10:]:
        send_text(chat.phone, _order_line(o, chat.lang), session)
    else:
        send_text(chat.phone, t("order_other", chat.lang), session)
    show_menu(chat, session)


def do_return_start(chat, session):
    L = chat.lang
    now = datetime.utcnow()
    eligible = []
    for o in _orders_for(chat.phone, session, 10):
        if (o.status or "").lower() != "delivered":
            continue
        d = _delivered_at(o) or o.created_at
        if d and now - d <= timedelta(days=RETURN_DAYS):
            eligible.append(o)
    if not eligible:
        chat.state = None
        send_buttons(chat.phone, t("ret_none", L), [("m:human", t("r_human", L)[0]), ("m:menu", t("menu_btn", L))], session)
        return
    rows = [(f"ret:{o.order_id}", o.order_id, f"₹{o.total_amount:,.0f}") for o in eligible]
    send_list(chat.phone, t("ret_pick", L), t("ret_pick_btn", L), rows, session)


def do_return_order(chat, oid, session):
    from models import Order, OrderReturn
    L = chat.lang
    o = session.exec(select(Order).where(Order.order_id == oid)).first()
    if not o or re.sub(r"\D", "", o.phone or "")[-10:] != chat.phone[-10:]:
        return show_menu(chat, session)
    ex = session.exec(select(OrderReturn).where(OrderReturn.order_id == oid)).first()
    if ex:
        send_text(chat.phone, t("ret_exists", L, oid=oid, st=ex.status), session)
        return show_menu(chat, session)
    chat.state = f"ret_kind:{oid}"
    send_buttons(chat.phone, t("ret_kind", L, oid=oid), [("kind:return", t("b_return", L)), ("kind:exchange", t("b_exchange", L))], session)


def do_return_kind(chat, kind, session):
    oid = (chat.state or "").split(":", 1)[1]
    chat.state = f"ret_reason:{kind}:{oid}"
    L = chat.lang
    send_buttons(chat.phone, t("ret_reason", L), [("why:damaged", t("b_damaged", L)), ("why:wrong", t("b_wrong", L)), ("why:other", t("b_other", L))], session)


def do_return_reason(chat, why, session):
    from models import Customer, Order, OrderReturn
    _, kind, oid = (chat.state or "").split(":", 2)
    L = chat.lang
    o = session.exec(select(Order).where(Order.order_id == oid)).first()
    if not o:
        return show_menu(chat, session)
    reason = {"damaged": "Damaged / broken", "wrong": "Wrong item", "other": "Other"}[why]
    kind_en = "Exchange" if kind == "exchange" else "Return"
    # Saved in Admin > Returns when the order belongs to a customer account
    cust = None
    emails = {e for e in [(o.email or "").lower(), f"+91{chat.phone[-10:]}@phone.user"] if e}
    for e in emails:
        cust = session.exec(select(Customer).where(func.lower(Customer.email) == e)).first()
        if cust:
            break
    saved = False
    if cust and not session.exec(select(OrderReturn).where(OrderReturn.order_id == oid)).first():
        session.add(OrderReturn(order_id=oid, customer_id=cust.id, reason=reason, status="pending",
                                refund_amount=o.total_amount or 0, refund_method="original",
                                description=f"{kind_en} requested on WhatsApp (+{chat.phone})"))
        saved = True
    chat.mode, chat.state = "human", None
    chat.human_until = datetime.utcnow() + timedelta(hours=48)
    session.add(chat)
    session.commit()
    _alert(f"🔄 <b>{kind_en} request on WhatsApp</b>\nOrder: {oid}\nReason: {reason}\nCustomer: +{chat.phone} ({html.escape(chat.name or '-')})\n"
           + ("Saved in Admin › Returns." if saved else "No customer account - not in Admin › Returns, handle from WhatsApp Inbox.")
           + "\nReply: Admin › WhatsApp Inbox")
    kind_word = {"en": kind_en.lower(), "hi": "एक्सचेंज" if kind == "exchange" else "रिटर्न"}[L or "en"]
    extra = t("ret_photo", L) if why in ("damaged", "wrong") else ""
    send_text(chat.phone, t("ret_done", L, kind=kind_word, oid=oid, extra=extra, after=t(f"after_{kind}", L)), session)


def do_shop(chat, session):
    from models import Promotion
    L = chat.lang
    msg = t("shop", L, s=SITE)
    offers = session.exec(select(Promotion).where(Promotion.is_active == True).order_by(Promotion.sort_order, Promotion.id)).all()  # noqa: E712
    if offers:
        lines = [f"• {' '.join(x for x in [p.highlight, p.title] if x)}" + (f" ({t('code', L)}: *{p.coupon_code}*)" if p.coupon_code else "")
                 for p in offers[:5]]
        msg += "\n\n" + t("offers_head", L) + "\n" + "\n".join(lines)
    send_text(chat.phone, msg, session)
    show_menu(chat, session)


def do_human(chat, session, first_text: str = ""):
    chat.mode, chat.state = "human", None
    chat.human_until = datetime.utcnow() + timedelta(hours=HUMAN_HOURS)
    session.add(chat)
    session.commit()
    _alert(f"💬 <b>WhatsApp customer wants to talk</b>\n+{chat.phone} ({html.escape(chat.name or '-')})"
           + (f"\n“{html.escape(first_text[:200])}”" if first_text else "") + "\nReply: Admin › WhatsApp Inbox")
    send_text(chat.phone, t("human", chat.lang), session)


def _alert(msg):
    try:
        from notifications import send_telegram_alert
    except Exception:
        return
    try:
        send_telegram_alert(msg)
    except Exception as e:
        logger.error(f"WhatsApp bot alert failed: {e}")


def handle(phone: str, name: str, kind: str, text: str, reply_id: str, session: Session):
    chat = session.get(WaChat, phone)
    now = datetime.utcnow()
    if not chat:
        chat = WaChat(phone=phone)
    chat.name = name or chat.name
    chat.last_in_at = chat.last_at = now
    chat.unread = (chat.unread or 0) + 1
    session.add(chat)
    session.commit()

    if chat.mode == "human":
        if chat.human_until and chat.human_until > now:
            return  # the team answers from the inbox
        chat.mode, chat.human_until = "bot", None
    if os.getenv("WA_BOT_ENABLED", "1") == "0":
        return

    low = (text or "").strip().lower()
    rid = reply_id or ""
    try:
        if rid.startswith("lang:"):
            chat.lang = rid.split(":", 1)[1]
            return show_menu(chat, session)
        if not chat.lang or rid == "m:lang" or low in ("language", "bhasha", "भाषा"):
            return show_language(chat, session)
        if rid == "m:track" or (not rid and re.search(r"\b(track|status|kaha|kahan)\b", low)):
            return do_track(chat, session)
        if rid == "m:return" or (not rid and re.search(r"\b(return|exchange|refund|wapas|badal)", low)):
            return do_return_start(chat, session)
        if rid == "m:shop" or (not rid and re.search(r"\b(shop|offer|offers|coupon|discount)\b", low)):
            return do_shop(chat, session)
        if rid == "m:human" or (not rid and re.search(r"\b(agent|human|team|call|baat)\b", low)):
            return do_human(chat, session, "" if rid else text)
        if rid == "m:menu":
            return show_menu(chat, session)
        if rid.startswith("ret:"):
            return do_return_order(chat, rid[4:], session)
        if rid.startswith("kind:") and (chat.state or "").startswith("ret_kind:"):
            return do_return_kind(chat, rid[5:], session)
        if rid.startswith("why:") and (chat.state or "").startswith("ret_reason:"):
            return do_return_reason(chat, rid[4:], session)
        if chat.state == "await_order_id" and re.fullmatch(r"\s*ord-[a-z0-9-]{4,40}\s*", low):
            return do_order_id(chat, text, session)
        if re.fullmatch(r"\s*ord-[a-z0-9-]{4,40}\s*", low):
            return do_order_id(chat, text, session)
        if low in ("hi", "hello", "hey", "hii", "menu", "start", "namaste", "नमस्ते") or kind != "text":
            return show_menu(chat, session)
        return show_menu(chat, session, t("nonsense", chat.lang))
    finally:
        session.add(chat)
        session.commit()


# ---------------------------------------------------------------- webhook
@router.get("/api/whatsapp/webhook")
def verify_webhook(request: Request):
    p = request.query_params
    want = os.getenv("META_WA_VERIFY_TOKEN")
    if want and p.get("hub.mode") == "subscribe" and hmac.compare_digest(p.get("hub.verify_token") or "", want):
        return PlainTextResponse(p.get("hub.challenge") or "")
    raise HTTPException(status_code=403, detail="Verification failed")


def _process(body: dict):
    # Only Meta can reach here (signature checked), and Meta only sends events of our own
    # WhatsApp accounts, so any of our numbers is answered from that same number.
    _status(last_call_at=datetime.utcnow())
    for entry in body.get("entry") or []:
        for ch in entry.get("changes") or []:
            if ch.get("field") not in (None, "messages"):
                continue
            v = ch.get("value") or {}
            pid = (v.get("metadata") or {}).get("phone_number_id") or ""
            if not re.fullmatch(r"\d{6,25}", pid):
                continue
            _reply_pid.set(pid)
            names = {c.get("wa_id"): (c.get("profile") or {}).get("name") for c in v.get("contacts") or []}
            for m in v.get("messages") or []:
                phone, kind, wid = m.get("from") or "", m.get("type") or "", m.get("id")
                text, rid = "", ""
                if kind == "text":
                    text = (m.get("text") or {}).get("body", "")
                elif kind == "interactive":
                    it = m.get("interactive") or {}
                    r = it.get("button_reply") or it.get("list_reply") or {}
                    rid, text = r.get("id", ""), r.get("title", "")
                elif kind == "button":
                    text = (m.get("button") or {}).get("text") or (m.get("button") or {}).get("payload", "")
                else:
                    cap = (m.get(kind) or {}).get("caption") if isinstance(m.get(kind), dict) else None
                    text = f"[{kind}]" + (f" {cap}" if cap else "")
                if not re.fullmatch(r"\d{8,15}", phone):
                    continue
                with Session(engine) as s:
                    if wid and s.exec(select(WaMessage).where(WaMessage.wa_id == wid)).first():
                        continue  # Meta sent it again
                    try:
                        s.add(WaMessage(phone=phone, direction="in", sender="customer", text=text, wa_id=wid))
                        s.commit()
                    except Exception:
                        s.rollback()
                        continue  # another worker took it
                    _status(last_message_at=datetime.utcnow())
                    try:
                        handle(phone, names.get(phone) or "", kind, text, rid, s)
                    except Exception as e:
                        logger.error(f"WhatsApp bot error for {phone[-4:]}: {e}")
                        _status(last_error=f"Bot error: {e}"[:300], last_error_at=datetime.utcnow())


@router.post("/api/whatsapp/webhook")
async def receive_webhook(request: Request, background: BackgroundTasks):
    raw = await request.body()
    secret = (os.getenv("META_APP_SECRET") or "").strip()
    sig = request.headers.get("X-Hub-Signature-256", "")
    if not secret:
        logger.error("WhatsApp webhook: META_APP_SECRET is not set - ignoring call")
        raise HTTPException(status_code=503, detail="Not configured")
    good = "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, good):
        if sig.startswith("sha256="):  # looks like Meta, so the saved app secret is probably wrong
            with Session(engine) as s:
                row = s.get(WaWebhookStatus, 1)
            last = row.last_bad_sig_at if row else None
            if not last or datetime.utcnow() - last > timedelta(minutes=1):
                _status(last_bad_sig_at=datetime.utcnow())
        raise HTTPException(status_code=403, detail="Bad signature")
    try:
        body = json.loads(raw or b"{}")
    except Exception:
        raise HTTPException(status_code=400, detail="Bad JSON")
    background.add_task(_process, body)
    return {"ok": True}


# ---------------------------------------------------------------- admin inbox
class ReplyIn(BaseModel):
    text: str


class ModeIn(BaseModel):
    mode: str


def _chat_out(c: WaChat, last: Optional[WaMessage]):
    now = datetime.utcnow()
    human = c.mode == "human" and (not c.human_until or c.human_until > now)
    return {"phone": c.phone, "name": c.name, "lang": c.lang, "mode": "human" if human else "bot",
            "human_until": c.human_until, "last_at": c.last_at, "last_in_at": c.last_in_at, "unread": c.unread or 0,
            "can_reply": bool(c.last_in_at and now - c.last_in_at < timedelta(hours=24)),
            "last_text": (last.text[:120] if last else ""), "last_sender": (last.sender if last else "")}


@router.get("/api/admin/wa/chats")
def list_chats(session: Session = Depends(get_session), admin=Depends(get_current_admin)):
    chats = session.exec(select(WaChat).order_by(WaChat.last_at.desc()).limit(200)).all()
    out = []
    for c in chats:
        last = session.exec(select(WaMessage).where(WaMessage.phone == c.phone).order_by(WaMessage.id.desc())).first()
        out.append(_chat_out(c, last))
    return out


@router.get("/api/admin/wa/chats/{phone}")
def chat_messages(phone: str, session: Session = Depends(get_session), admin=Depends(get_current_admin)):
    c = session.get(WaChat, phone)
    if not c:
        raise HTTPException(status_code=404, detail="Chat not found")
    msgs = session.exec(select(WaMessage).where(WaMessage.phone == phone).order_by(WaMessage.id.desc()).limit(300)).all()
    c.unread = 0
    session.add(c)
    session.commit()
    session.refresh(c)
    return {"chat": _chat_out(c, msgs[0] if msgs else None),
            "messages": [{"id": m.id, "direction": m.direction, "sender": m.sender, "text": m.text, "created_at": m.created_at}
                         for m in reversed(msgs)]}


@router.post("/api/admin/wa/chats/{phone}/reply")
def chat_reply(phone: str, body: ReplyIn, session: Session = Depends(get_session), admin=Depends(get_current_admin)):
    c = session.get(WaChat, phone)
    text = (body.text or "").strip()
    if not c or not text:
        raise HTTPException(status_code=400, detail="Empty message")
    if not c.last_in_at or datetime.utcnow() - c.last_in_at >= timedelta(hours=24):
        raise HTTPException(status_code=400, detail="WhatsApp allows replies only within 24 hours of the customer's last message.")
    c.mode = "human"
    c.human_until = datetime.utcnow() + timedelta(hours=HUMAN_HOURS)
    session.add(c)
    session.commit()
    if not send_text(phone, text, session, sender="team"):
        raise HTTPException(status_code=502, detail="WhatsApp did not accept the message")
    return {"ok": True}


@router.get("/api/admin/wa/status")
def webhook_status(session: Session = Depends(get_session), admin=Depends(get_current_admin)):
    row = session.get(WaWebhookStatus, 1)
    return {"configured": bool(os.getenv("META_APP_SECRET") and os.getenv("META_WA_VERIFY_TOKEN") and os.getenv("META_WA_TOKEN")),
            "phone_id_end": (os.getenv("META_WA_PHONE_ID") or "")[-4:],
            "last_call_at": row.last_call_at if row else None, "last_message_at": row.last_message_at if row else None,
            "last_bad_sig_at": row.last_bad_sig_at if row else None,
            "last_error": row.last_error if row else None, "last_error_at": row.last_error_at if row else None}


@router.post("/api/admin/wa/chats/{phone}/mode")
def chat_mode(phone: str, body: ModeIn, session: Session = Depends(get_session), admin=Depends(get_current_admin)):
    c = session.get(WaChat, phone)
    if not c or body.mode not in ("bot", "human"):
        raise HTTPException(status_code=400, detail="Bad request")
    c.mode, c.state = body.mode, None
    c.human_until = datetime.utcnow() + timedelta(hours=HUMAN_HOURS) if body.mode == "human" else None
    session.add(c)
    session.commit()
    return {"ok": True}
