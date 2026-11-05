"""
Shared helpers to identify the caller and decide who may see an order.
"""
import re
from typing import Optional
from sqlmodel import Session, select
from models import Customer, AdminUser, Order

PLACEHOLDER_EMAIL_DOMAINS = ("@phone.user", "@telegram.user", "@firebase.user", "@guest.varaha.com")


def last10(phone: Optional[str]) -> str:
    digits = re.sub(r"\D", "", phone or "")
    return digits[-10:] if len(digits) >= 10 else ""


def is_real_email(email: Optional[str]) -> bool:
    return bool(email) and "@" in email and not email.lower().endswith(PLACEHOLDER_EMAIL_DOMAINS)


def order_access_key(order_id: str) -> str:
    from routes.tracking import generate_tracking_token
    return generate_tracking_token(str(order_id))


def verify_order_access_key(order_id: str, key: Optional[str]) -> bool:
    if not key:
        return False
    from routes.tracking import verify_tracking_token
    return verify_tracking_token(str(order_id), key)


def resolve_identity(token: Optional[str], session: Session) -> dict:
    """
    Returns {"customer": Customer|None, "supabase_uid": str|None,
             "email": str|None, "is_admin": bool}
    Never creates records.
    """
    ident = {"customer": None, "supabase_uid": None, "email": None, "is_admin": False}
    if not token or token in ("null", "undefined"):
        return ident

    # 1. Local JWT (admin / Google OAuth / Firebase phone / email-password)
    try:
        from jose import jwt as jose_jwt
        from auth_utils import SECRET_KEY, ALGORITHM
        payload = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role = payload.get("role")
        sub = payload.get("sub")
        if role == "admin":
            admin = session.exec(select(AdminUser).where(AdminUser.username == sub)).first()
            ident["is_admin"] = admin is not None
            return ident
        if role == "customer" and sub:
            customer = session.exec(select(Customer).where(Customer.email == sub)).first()
            ident["customer"] = customer
            ident["email"] = sub
            if customer and customer.supabase_uid:
                ident["supabase_uid"] = customer.supabase_uid
            return ident
    except Exception:
        pass

    # 2. Supabase JWT (older Google login)
    try:
        from supabase_utils import init_supabase
        s_client = init_supabase()
        if s_client:
            user_data = s_client.auth.get_user(token)
            if user_data and user_data.user:
                uid = str(user_data.user.id)
                email = user_data.user.email
                ident["supabase_uid"] = uid
                ident["email"] = email
                customer = session.exec(select(Customer).where(Customer.supabase_uid == uid)).first()
                if not customer and email:
                    customer = session.exec(select(Customer).where(Customer.email == email)).first()
                ident["customer"] = customer
    except Exception as e:
        print(f"Supabase token check failed: {e}")
    return ident


def identity_owns_order(ident: dict, order: Order) -> bool:
    """True if the logged-in identity is the owner of this order."""
    if ident.get("is_admin"):
        return True
    uid = ident.get("supabase_uid")
    if uid and order.user_id and str(order.user_id) == str(uid):
        return True
    emails = set()
    if is_real_email(ident.get("email")):
        emails.add(ident["email"].strip().lower())
    customer = ident.get("customer")
    if customer and is_real_email(customer.email):
        emails.add(customer.email.strip().lower())
    if order.email and order.email.strip().lower() in emails:
        return True
    # Phone-verified (Firebase OTP) customers own orders placed with their number
    if customer and customer.provider == "phone":
        cp = last10(customer.phone)
        if cp and cp == last10(order.phone):
            return True
    return False


def orders_for_identity(ident: dict, session: Session):
    """All orders that belong to this identity (newest first)."""
    import uuid as _uuid
    from sqlalchemy import func, or_
    conds = []
    uid = ident.get("supabase_uid")
    if uid:
        try:
            conds.append(Order.user_id == _uuid.UUID(str(uid)))
        except ValueError:
            pass
    emails = set()
    if is_real_email(ident.get("email")):
        emails.add(ident["email"].strip().lower())
    customer = ident.get("customer")
    if customer and is_real_email(customer.email):
        emails.add(customer.email.strip().lower())
    for e in emails:
        conds.append(func.lower(Order.email) == e)
    phone10 = ""
    if customer and customer.provider == "phone":
        phone10 = last10(customer.phone)
        if phone10:
            conds.append(Order.phone.contains(phone10))
    if not conds:
        return []
    rows = session.exec(select(Order).where(or_(*conds)).order_by(Order.created_at.desc())).all()
    # Exact phone check (contains() is only a pre-filter)
    result = []
    for o in rows:
        if identity_owns_order(ident, o):
            result.append(o)
    return result
