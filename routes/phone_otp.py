"""Phone OTP via 2Factor.in (default OTP route, no own DLT needed).

Used to verify the phone number before a Cash-on-Delivery order is placed.
Prepaid (Razorpay) orders do not need it: the payment itself is the check.

Switched on only when TWOFACTOR_API_KEY is set (and REQUIRE_COD_OTP is not "0"),
so the backend can be deployed before the key is added without breaking COD.
"""
import os
import re
import time
from datetime import datetime, timedelta
from typing import Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Field, Session, SQLModel, select

from auth_utils import SECRET_KEY, ALGORITHM
from database import get_session
from dependencies import get_current_admin
from models import SystemSetting

router = APIRouter()

SESSION_MINUTES = 10      # time to type the code
PROOF_MINUTES = 30        # time to place the order after verifying
PER_PHONE_GAP_SECONDS = 45
PER_PHONE_PER_DAY = 5
PER_IP_PER_DAY = 20
FAKE_OTP = "123456"       # only when TWOFACTOR_FAKE=1 (local tests, never set in production)


class PhoneOtpLog(SQLModel, table=True):
    """One row per OTP request - used only for rate limits."""
    id: Optional[int] = Field(default=None, primary_key=True)
    phone: str = Field(index=True)
    ip: Optional[str] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


def _api_key() -> str:
    return os.getenv("TWOFACTOR_API_KEY", "").strip()


def _fake() -> bool:
    return os.getenv("TWOFACTOR_FAKE") == "1"


SETTING_KEY = "cod_otp_enabled"


def _configured() -> bool:
    return os.getenv("REQUIRE_COD_OTP", "1") != "0" and (bool(_api_key()) or _fake())


def _admin_enabled(session: Session) -> bool:
    """Admin on/off switch. On unless the admin turned it off."""
    row = session.get(SystemSetting, SETTING_KEY)
    return not (row and str(row.value).lower() in ("0", "false", "off"))


def cod_otp_required(session: Session) -> bool:
    return _configured() and _admin_enabled(session)


def normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    digits = digits[-10:] if len(digits) >= 10 else digits
    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise HTTPException(status_code=400, detail="Enter a valid 10 digit mobile number")
    return digits


def _token(payload: dict, minutes: int) -> str:
    return jwt.encode({**payload, "exp": datetime.utcnow() + timedelta(minutes=minutes)}, SECRET_KEY, algorithm=ALGORITHM)


def _read(token: Optional[str], kind: str) -> dict:
    try:
        data = jwt.decode(token or "", SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="Phone verification expired. Please verify again.")
    if data.get("kind") != kind:
        raise HTTPException(status_code=400, detail="Invalid phone verification")
    return data


def require_phone_proof(proof: Optional[str], contact: str, session: Session):
    """Call before placing a COD order. Does nothing while OTP is switched off."""
    if not cod_otp_required(session):
        return
    if not proof:
        raise HTTPException(status_code=400, detail="Please verify your mobile number with the OTP first")
    data = _read(proof, "phone_ok")
    if data.get("phone") != normalize_phone(contact):
        raise HTTPException(status_code=400, detail="The verified number does not match the order number")


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return (fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "")) or ""


class SendReq(BaseModel):
    phone: str


class VerifyReq(BaseModel):
    phone: str
    otp: str
    otp_session: str


@router.get("/api/otp/config")
def otp_config(session: Session = Depends(get_session)):
    return {"cod_otp_required": cod_otp_required(session)}


class OtpSettingReq(BaseModel):
    enabled: bool


@router.get("/api/admin/otp-setting")
def get_otp_setting(session: Session = Depends(get_session), current_user=Depends(get_current_admin)):
    return {"enabled": _admin_enabled(session), "configured": _configured()}


@router.put("/api/admin/otp-setting")
def set_otp_setting(body: OtpSettingReq, session: Session = Depends(get_session), current_user=Depends(get_current_admin)):
    row = session.get(SystemSetting, SETTING_KEY)
    if row is None:
        row = SystemSetting(key=SETTING_KEY, value="1", description="Ask for phone OTP on Cash on Delivery orders")
    row.value = "1" if body.enabled else "0"
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    return {"enabled": body.enabled, "configured": _configured()}


@router.post("/api/otp/send")
def send_otp(body: SendReq, request: Request, session: Session = Depends(get_session)):
    if not cod_otp_required(session):
        raise HTTPException(status_code=503, detail="Phone OTP is not switched on")
    phone = normalize_phone(body.phone)
    ip = _client_ip(request)
    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)

    last = session.exec(select(PhoneOtpLog).where(PhoneOtpLog.phone == phone).order_by(PhoneOtpLog.created_at.desc())).first()
    if last and (now - last.created_at).total_seconds() < PER_PHONE_GAP_SECONDS:
        wait = int(PER_PHONE_GAP_SECONDS - (now - last.created_at).total_seconds()) + 1
        raise HTTPException(status_code=429, detail=f"Please wait {wait} seconds before asking for another OTP")
    n_phone = session.exec(select(func.count()).select_from(PhoneOtpLog).where(PhoneOtpLog.phone == phone, PhoneOtpLog.created_at > day_ago)).one()
    if n_phone >= PER_PHONE_PER_DAY:
        raise HTTPException(status_code=429, detail="Too many OTP requests for this number today. Try again tomorrow.")
    if ip:
        n_ip = session.exec(select(func.count()).select_from(PhoneOtpLog).where(PhoneOtpLog.ip == ip, PhoneOtpLog.created_at > day_ago)).one()
        if n_ip >= PER_IP_PER_DAY:
            raise HTTPException(status_code=429, detail="Too many OTP requests. Try again later.")

    if _fake():
        sid = "fake-" + str(time.time_ns())
    else:
        try:
            r = requests.get(f"https://2factor.in/API/V1/{_api_key()}/SMS/{phone}/AUTOGEN", timeout=15)
            data = r.json()
        except Exception:
            raise HTTPException(status_code=502, detail="Could not send the OTP. Please try again.")
        if data.get("Status") != "Success":
            print(f"2Factor send failed: {data}")
            raise HTTPException(status_code=502, detail="Could not send the OTP. Please try again.")
        sid = data["Details"]

    session.add(PhoneOtpLog(phone=phone, ip=ip))
    session.commit()
    return {"otp_session": _token({"kind": "otp_session", "phone": phone, "sid": sid, "tries": 0}, SESSION_MINUTES)}


@router.post("/api/otp/verify")
def verify_otp(body: VerifyReq, session: Session = Depends(get_session)):
    phone = normalize_phone(body.phone)
    data = _read(body.otp_session, "otp_session")
    if data.get("phone") != phone:
        raise HTTPException(status_code=400, detail="Invalid OTP request")
    otp = re.sub(r"\D", "", body.otp or "")
    if len(otp) < 4:
        raise HTTPException(status_code=400, detail="Enter the OTP from the SMS")

    # at most 5 wrong guesses per OTP, so a code cannot be brute-forced
    fail_key = f"fail:{data['sid']}"
    if session.exec(select(func.count()).select_from(PhoneOtpLog).where(PhoneOtpLog.phone == fail_key)).one() >= 5:
        raise HTTPException(status_code=429, detail="Too many wrong tries. Please ask for a new OTP.")

    if _fake():
        ok = otp == FAKE_OTP
    else:
        try:
            r = requests.get(f"https://2factor.in/API/V1/{_api_key()}/SMS/VERIFY/{data['sid']}/{otp}", timeout=15)
            ok = r.json().get("Status") == "Success"
        except Exception:
            raise HTTPException(status_code=502, detail="Could not check the OTP. Please try again.")
    if not ok:
        session.add(PhoneOtpLog(phone=fail_key))
        session.commit()
        raise HTTPException(status_code=400, detail="Wrong OTP. Please check and try again.")
    return {"phone_proof": _token({"kind": "phone_ok", "phone": phone}, PROOF_MINUTES)}
