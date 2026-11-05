"""
Coupon expiry / usage-limit rules and the BOGO calculation.
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException
from sqlmodel import Session, select
from sqlalchemy import func

from models import CouponRule, CouponUsage


def parse_dt(value) -> Optional[datetime]:
    """Accept ISO strings (with/without timezone) and return naive UTC."""
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        s = str(value).strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(s)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid date: {value}")
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _last10(phone: Optional[str]) -> str:
    import re
    d = re.sub(r"\D", "", phone or "")
    return d[-10:] if len(d) >= 10 else ""


def get_rule(session: Session, code: str) -> Optional[CouponRule]:
    if not code:
        return None
    return session.get(CouponRule, code.strip().upper())


def usage_count(session: Session, code: str) -> int:
    return session.exec(
        select(func.count()).select_from(CouponUsage).where(CouponUsage.code == code.strip().upper())
    ).one()


def customer_usage_count(session: Session, code: str, email: Optional[str], phone: Optional[str]) -> int:
    code = code.strip().upper()
    n = 0
    if email:
        n = max(n, session.exec(
            select(func.count()).select_from(CouponUsage).where(
                CouponUsage.code == code, func.lower(CouponUsage.email) == email.strip().lower())
        ).one())
    p = _last10(phone)
    if p:
        n = max(n, session.exec(
            select(func.count()).select_from(CouponUsage).where(
                CouponUsage.code == code, CouponUsage.phone == p)
        ).one())
    return n


def check_coupon_rules(session: Session, code: str, email: Optional[str] = None, phone: Optional[str] = None):
    """Raise HTTPException(400) if the coupon is not yet active, expired, or used up."""
    rule = get_rule(session, code)
    if not rule:
        return
    now = datetime.utcnow()
    if rule.starts_at and now < rule.starts_at:
        raise HTTPException(status_code=400, detail="This coupon is not active yet")
    if rule.expires_at and now > rule.expires_at:
        raise HTTPException(status_code=400, detail="This coupon has expired")
    if rule.usage_limit is not None and usage_count(session, code) >= rule.usage_limit:
        raise HTTPException(status_code=400, detail="This coupon has reached its usage limit")
    if rule.per_customer_limit is not None and (email or phone):
        if customer_usage_count(session, code, email, phone) >= rule.per_customer_limit:
            raise HTTPException(status_code=400, detail="You have already used this coupon")


def record_coupon_usage(session: Session, code: Optional[str], order_id: str, email: Optional[str], phone: Optional[str]):
    if not code:
        return
    session.add(CouponUsage(
        code=code.strip().upper(),
        order_id=order_id,
        email=(email or "").strip().lower() or None,
        phone=_last10(phone) or None,
    ))
    session.commit()


def upsert_rule(session: Session, code: str, starts_at=None, expires_at=None,
                usage_limit=None, per_customer_limit=None):
    code = code.strip().upper()
    rule = session.get(CouponRule, code)
    if not rule:
        rule = CouponRule(code=code)
    rule.starts_at = parse_dt(starts_at)
    rule.expires_at = parse_dt(expires_at)
    rule.usage_limit = int(usage_limit) if usage_limit not in (None, "", 0) else None
    rule.per_customer_limit = int(per_customer_limit) if per_customer_limit not in (None, "", 0) else None
    if rule.starts_at and rule.expires_at and rule.expires_at <= rule.starts_at:
        raise HTTPException(status_code=400, detail="Expiry must be after start date")
    if rule.usage_limit is not None and rule.usage_limit < 0 or rule.per_customer_limit is not None and rule.per_customer_limit < 0:
        raise HTTPException(status_code=400, detail="Limits cannot be negative")
    rule.updated_at = datetime.utcnow()
    session.add(rule)


def rule_to_dict(session: Session, code: str) -> dict:
    rule = get_rule(session, code)
    used = usage_count(session, code)
    def iso(dt):
        return dt.replace(tzinfo=timezone.utc).isoformat() if dt else None
    return {
        "starts_at": iso(rule.starts_at) if rule else None,
        "expires_at": iso(rule.expires_at) if rule else None,
        "usage_limit": rule.usage_limit if rule else None,
        "per_customer_limit": rule.per_customer_limit if rule else None,
        "used_count": used,
    }


def bogo_discount(items: list) -> float:
    """
    Buy-One-Get-One: every unit is listed by price (highest first); in each
    pair the cheaper unit is free. E.g. 1500 + 1000 + 800 -> 1000 free.
    items: [{"price": float, "quantity": int}, ...]
    """
    units = []
    for it in items or []:
        price = float(it.get("price") or 0)
        qty = int(it.get("quantity") or 1)
        units.extend([price] * max(0, qty))
    units.sort(reverse=True)
    return round(sum(units[1::2]), 2)
