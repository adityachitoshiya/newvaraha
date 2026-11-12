"""Customer login / sign-up with the mobile number and a WhatsApp OTP.

Flow: POST /api/auth/whatsapp/send {phone}  -> 4 digit code on WhatsApp (template `login_otp`)
      POST /api/auth/whatsapp/verify {phone, otp, otp_session, name?} -> customer token
A number without an account gets one (provider "phone", email "+91XXXXXXXXXX@phone.user",
the same format the old Firebase phone login used, so those customers keep their account).

The code itself is never stored: the session token carries an HMAC of it (keyed with the
JWT secret), the code is valid 10 minutes, 3 wrong tries end it, and sends are rate limited.
Set WA_OTP_FAKE=1 only for local tests (code 1234, nothing is sent).
"""
import hashlib
import hmac
import os
import re
import secrets
import time
from datetime import datetime, timedelta
from typing import Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Session, select

from auth_utils import SECRET_KEY, create_access_token
from database import get_session
from models import Customer
from routes.phone_otp import PhoneOtpLog, normalize_phone, _token, _read, _client_ip

router = APIRouter()

CODE_DIGITS = 4
SESSION_MINUTES = 10
MAX_WRONG = 3
GAP_SECONDS = 45
PER_PHONE_PER_DAY = 6
PER_IP_PER_DAY = 25
FAKE_CODE = "1234"
GRAPH = "https://graph.facebook.com/v21.0"


def _fake() -> bool:
    return os.getenv("WA_OTP_FAKE") == "1"


def _wa_ready() -> bool:
    return bool(os.getenv("META_WA_TOKEN") and os.getenv("META_WA_PHONE_ID"))


def _sig(phone: str, sid: str, code: str) -> str:
    return hmac.new(SECRET_KEY.encode(), f"{phone}|{sid}|{code}".encode(), hashlib.sha256).hexdigest()


def _send_whatsapp(phone: str, code: str):
    body = {"messaging_product": "whatsapp", "to": f"91{phone}", "type": "template", "template": {
        "name": os.getenv("META_WA_OTP_TEMPLATE", "login_otp"),
        "language": {"code": os.getenv("META_WA_LANG", "en")},
        "components": [
            {"type": "body", "parameters": [{"type": "text", "text": code}]},
            {"type": "button", "sub_type": "url", "index": "0", "parameters": [{"type": "text", "text": code}]},
        ]}}
    try:
        from whatsapp import _post   # main number first, backup number if it fails
        r, data = _post(body)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not send the WhatsApp OTP. Please try again.")
    if not (r.ok and data.get("messages")):
        err = data.get("error") or {}
        print(f"WhatsApp OTP send failed: {err.get('code')} {err.get('message')}")
        if err.get("code") in (131026, 131030):   # number not on WhatsApp / not allowed
            raise HTTPException(status_code=400, detail="This number does not seem to be on WhatsApp. Please check the number.")
        raise HTTPException(status_code=502, detail="Could not send the WhatsApp OTP. Please try again.")


class SendReq(BaseModel):
    phone: str


class VerifyReq(BaseModel):
    phone: str
    otp: str
    otp_session: str
    name: Optional[str] = None


@router.get("/api/auth/whatsapp/config")
def wa_login_config():
    return {"enabled": _fake() or _wa_ready()}


@router.post("/api/auth/whatsapp/send")
def wa_send(body: SendReq, request: Request, session: Session = Depends(get_session)):
    if not (_fake() or _wa_ready()):
        raise HTTPException(status_code=503, detail="WhatsApp login is not available right now")
    phone = normalize_phone(body.phone)
    key = f"wa:{phone}"
    ip = _client_ip(request)
    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)

    last = session.exec(select(PhoneOtpLog).where(PhoneOtpLog.phone == key).order_by(PhoneOtpLog.created_at.desc())).first()
    if last and (now - last.created_at).total_seconds() < GAP_SECONDS:
        wait = int(GAP_SECONDS - (now - last.created_at).total_seconds()) + 1
        raise HTTPException(status_code=429, detail=f"Please wait {wait} seconds before asking for another OTP")
    if session.exec(select(func.count()).select_from(PhoneOtpLog).where(PhoneOtpLog.phone == key, PhoneOtpLog.created_at > day_ago)).one() >= PER_PHONE_PER_DAY:
        raise HTTPException(status_code=429, detail="Too many OTP requests for this number today. Try again tomorrow.")
    if ip and session.exec(select(func.count()).select_from(PhoneOtpLog).where(PhoneOtpLog.ip == f"wa:{ip}", PhoneOtpLog.created_at > day_ago)).one() >= PER_IP_PER_DAY:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Try again later.")

    code = FAKE_CODE if _fake() else "".join(secrets.choice("0123456789") for _ in range(CODE_DIGITS))
    sid = secrets.token_hex(8) + str(time.time_ns())[-6:]
    if not _fake():
        _send_whatsapp(phone, code)
    session.add(PhoneOtpLog(phone=key, ip=f"wa:{ip}" if ip else None))
    session.commit()
    return {"otp_session": _token({"kind": "wa_login", "phone": phone, "sid": sid, "sig": _sig(phone, sid, code)}, SESSION_MINUTES),
            "expires_in": SESSION_MINUTES * 60}


@router.post("/api/auth/whatsapp/verify")
def wa_verify(body: VerifyReq, session: Session = Depends(get_session)):
    phone = normalize_phone(body.phone)
    data = _read(body.otp_session, "wa_login")
    if data.get("phone") != phone:
        raise HTTPException(status_code=400, detail="Invalid OTP request")
    otp = re.sub(r"\D", "", body.otp or "")
    if len(otp) != CODE_DIGITS:
        raise HTTPException(status_code=400, detail=f"Enter the {CODE_DIGITS} digit OTP from WhatsApp")

    fail_key = f"wafail:{data['sid']}"
    if session.exec(select(func.count()).select_from(PhoneOtpLog).where(PhoneOtpLog.phone == fail_key)).one() >= MAX_WRONG:
        raise HTTPException(status_code=429, detail="Too many wrong tries. Please ask for a new OTP.")
    used_key = f"waused:{data['sid']}"
    if session.exec(select(func.count()).select_from(PhoneOtpLog).where(PhoneOtpLog.phone == used_key)).one():
        raise HTTPException(status_code=400, detail="This OTP was already used. Please ask for a new one.")
    if not hmac.compare_digest(_sig(phone, data["sid"], otp), data.get("sig", "")):
        session.add(PhoneOtpLog(phone=fail_key))
        session.commit()
        left = MAX_WRONG - session.exec(select(func.count()).select_from(PhoneOtpLog).where(PhoneOtpLog.phone == fail_key)).one()
        raise HTTPException(status_code=400, detail=f"Wrong OTP. {left} {'try' if left == 1 else 'tries'} left." if left > 0 else "Wrong OTP. Please ask for a new one.")
    session.add(PhoneOtpLog(phone=used_key))

    # Find the account of this number (phone accounts only: a number typed on an email
    # account was never verified, so it does not unlock that account)
    full = f"+91{phone}"
    customer = None
    for c in session.exec(select(Customer).where(Customer.provider == "phone")).all():
        if re.sub(r"\D", "", c.phone or "")[-10:] == phone:
            customer = c
            break
    if not customer:
        customer = session.exec(select(Customer).where(Customer.email == f"{full}@phone.user")).first()
    is_new = customer is None
    if is_new:
        name = (body.name or "").strip()[:80] or "Customer"
        customer = Customer(full_name=name, email=f"{full}@phone.user", phone=full, provider="phone", is_active=True)
    elif body.name and (not customer.full_name or customer.full_name in ("Customer", "Guest")):
        customer.full_name = body.name.strip()[:80]
    session.add(customer)
    session.commit()
    session.refresh(customer)

    token = create_access_token(data={"sub": customer.email, "role": "customer", "name": customer.full_name, "customer_id": customer.id})
    return {"access_token": token, "token_type": "bearer", "is_new": is_new,
            "user": {"id": customer.id, "name": customer.full_name, "email": None, "phone": full}}
