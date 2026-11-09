import os
import random
import requests
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Body, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from typing import Optional, Union
from pydantic import BaseModel
import uuid

# Internal Imports
from database import get_session
from models import AdminUser, Customer, Order
from auth_utils import verify_password, create_access_token
from dependencies import get_current_user, oauth2_scheme
from passlib.context import CryptContext
from firebase_utils import verify_firebase_token

router = APIRouter()

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


# --- Schemas ---

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    status: Optional[str] = None
    username: Optional[str] = None
    message: Optional[str] = None

class VerifyOTP(BaseModel):
    username: str
    otp: str

class CustomerCreate(BaseModel):
    full_name: str
    email: str
    password: str

class CustomerLogin(BaseModel):
    email: str
    password: str

class UserSync(BaseModel):
    full_name: str
    email: str
    provider: str

class SocialLogin(BaseModel):
    email: str
    full_name: str
    provider: str
    provider_id: str 

class FirebaseAuthRequest(BaseModel):
    """Schema for Firebase token verification request"""
    id_token: str

class FirebaseAuthResponse(BaseModel):
    """Response after Firebase auth verification"""
    access_token: str
    token_type: str = "bearer"
    user: dict

# --- Telegram Schemas ---
class TelegramAuth(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str

import hashlib
import hmac

@router.post("/api/auth/telegram", response_model=LoginResponse)
def telegram_login(data: TelegramAuth, session: Session = Depends(get_session)):
    """
    Verify Telegram Login Widget Data
    """
    # 1. Verify Hash
    BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
    if not BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Server misconfiguration: Telegram Token Missing")
    
    # Construct data check string
    # Data-check-string is a concatenation of all received fields, sorted alphabetically, 
    # in the format key=value with a line feed character ('\n') as separator.
    vals = data.dict(exclude={'hash'})
    data_check_arr = []
    for key, value in vals.items():
        if value is not None:
            data_check_arr.append(f"{key}={value}")
    
    data_check_arr.sort()
    data_check_string = '\n'.join(data_check_arr)
    
    # Calculate HMAC-SHA256
    secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()
    hash_payload = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    
    # Check if hash matches
    if not hmac.compare_digest(hash_payload, data.hash):
        raise HTTPException(status_code=400, detail="Data integrity check failed")

    # Reject old login payloads (replay protection) - valid for 1 day
    import time as _time
    if abs(int(_time.time()) - int(data.auth_date)) > 86400:
        raise HTTPException(status_code=400, detail="Telegram login expired. Please try again.")

    # 2. Check/Create User
    telegram_id = str(data.id)
    customer = session.exec(select(Customer).where(Customer.telegram_id == telegram_id)).first()
    
    if not customer:
        print(f"Creating new customer for Telegram ID: {telegram_id}")
        # Create new customer
        new_customer = Customer(
            full_name=f"{data.first_name} {data.last_name or ''}".strip(),
            email=f"{telegram_id}@telegram.user", # Placeholder email
            provider="telegram",
            telegram_id=telegram_id,
            is_active=True
        )
        try:
            session.add(new_customer)
            session.commit()
            session.refresh(new_customer)
            customer = new_customer
        except Exception as e:
            print(f"Error creating customer: {e}")
            raise HTTPException(status_code=500, detail="Could not create user account")

    # 3. Issue Token
    access_token = create_access_token(data={"sub": customer.email, "role": "customer", "user_id": customer.id})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "username": customer.full_name,
        "status": "success"
    }


# ============================================================================
# FIREBASE AUTH ENDPOINT (Hybrid Architecture - bypasses ISP blocks)
# ============================================================================
@router.post("/api/auth/firebase", response_model=FirebaseAuthResponse)
def firebase_auth(
    request: FirebaseAuthRequest,
    session: Session = Depends(get_session)
):
    """
    Verify Firebase ID token and return local JWT + user profile.
    
    Flow:
    1. Frontend authenticates with Firebase (Google/OTP)
    2. Frontend sends Firebase idToken to this endpoint
    3. Backend verifies token with Firebase Admin SDK
    4. Backend finds/creates user in Supabase PostgreSQL
    5. Backend returns local JWT for subsequent API calls
    """
    # 1. Verify Firebase token
    firebase_user = verify_firebase_token(request.id_token)
    
    if not firebase_user:
        raise HTTPException(
            status_code=401, 
            detail="Invalid or expired Firebase token"
        )
    
    firebase_uid = firebase_user.get("uid")
    email = firebase_user.get("email")
    name = firebase_user.get("name") or (email.split("@")[0] if email else "User")
    phone = firebase_user.get("phone_number")
    provider = firebase_user.get("sign_in_provider", "firebase")
    
    # Map Firebase providers to our format
    provider_map = {
        "google.com": "google",
        "phone": "phone",
        "password": "email",
    }
    provider = provider_map.get(provider, provider)
    
    # 2. Find or create customer in our database
    customer = None
    
    # First try by Firebase UID
    customer = session.exec(
        select(Customer).where(Customer.firebase_uid == firebase_uid)
    ).first()
    
    # Then try by email (link existing account)
    if not customer and email:
        customer = session.exec(
            select(Customer).where(Customer.email == email)
        ).first()
        
        if customer:
            # Link Firebase UID to existing account
            customer.firebase_uid = firebase_uid
            if not customer.provider or customer.provider == "email":
                customer.provider = provider
            session.add(customer)
            session.commit()
            session.refresh(customer)
            print(f"✅ Linked Firebase UID {firebase_uid} to existing customer {customer.id}")
    
    # Create new customer if not found
    if not customer:
        # Use phone as email placeholder if email not available
        customer_email = email or (f"{phone}@phone.user" if phone else f"{firebase_uid}@firebase.user")
        
        customer = Customer(
            full_name=name,
            email=customer_email,
            phone=phone,
            provider=provider,
            firebase_uid=firebase_uid,
            is_active=True
        )
        session.add(customer)
        session.commit()
        session.refresh(customer)
        print(f"✅ Created new customer {customer.id} from Firebase auth")
    
    # 3. Guest orders are matched to this customer by email/phone in
    #    /api/customer/orders - no DB linking needed here.
    #    (Old code wrote the integer customer.id into the UUID user_id column,
    #     which crashed login for anyone with previous guest orders.)

    # 4. Issue local JWT
    access_token = create_access_token(data={
        "sub": customer.email,
        "role": "customer",
        "user_id": customer.id,
        "name": customer.full_name,
        "customer_id": customer.id
    })
    
    return FirebaseAuthResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": customer.id,
            "name": customer.full_name,
            "email": customer.email,
            "phone": customer.phone,
            "provider": customer.provider
        }
    )


# ============================================================================
# GOOGLE OAUTH ENDPOINT (Google Cloud Auth — direct Google Identity Services)
# ============================================================================
class GoogleAuthRequest(BaseModel):
    """Schema for Google OAuth access token request"""
    access_token: str

@router.post("/api/auth/google", response_model=FirebaseAuthResponse)
def google_oauth_auth(
    request: GoogleAuthRequest,
    session: Session = Depends(get_session)
):
    """
    Verify Google OAuth access token and return local JWT + user profile.
    
    Flow:
    1. Frontend signs in with Google via @react-oauth/google (Google Identity Services)
    2. Frontend sends Google access_token to this endpoint
    3. Backend verifies by calling Google's userinfo API
    4. Backend finds/creates user in Supabase PostgreSQL
    5. Backend returns local JWT for subsequent API calls
    """
    import requests as ext_requests

    # 1. Verify access token by calling Google's userinfo endpoint
    resp = ext_requests.get(
        "https://www.googleapis.com/oauth2/v1/userinfo",
        params={"access_token": request.access_token},
        timeout=10
    )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google access token")

    user_info = resp.json()

    if user_info.get("error"):
        raise HTTPException(status_code=401, detail="Google token verification failed")

    # Make sure the access token was issued for OUR Google client (prevents token
    # substitution from other apps). Enabled when GOOGLE_CLIENT_ID is set.
    expected_client_id = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("NEXT_PUBLIC_GOOGLE_CLIENT_ID")
    if expected_client_id:
        try:
            info = ext_requests.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"access_token": request.access_token},
                timeout=10,
            ).json()
            if info.get("aud") != expected_client_id and info.get("azp") != expected_client_id:
                raise HTTPException(status_code=401, detail="Google token was not issued for this app")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Google tokeninfo check failed: {e}")
            raise HTTPException(status_code=401, detail="Google token verification failed")

    if user_info.get("verified_email") is False:
        raise HTTPException(status_code=401, detail="Google email is not verified")

    email = user_info.get("email")
    name = user_info.get("name") or (email.split("@")[0] if email else "User")
    google_id = user_info.get("id")
    picture = user_info.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Google")

    print(f"✅ Google OAuth verified for: {email}")

    # 2. Find or create customer in our database
    customer = session.exec(
        select(Customer).where(Customer.email == email)
    ).first()

    if customer:
        # Update provider if not set
        if not customer.provider or customer.provider == "email":
            customer.provider = "google"
            session.add(customer)
            session.commit()
            session.refresh(customer)
    else:
        customer = Customer(
            full_name=name,
            email=email,
            provider="google",
            is_active=True
        )
        session.add(customer)
        session.commit()
        session.refresh(customer)
        print(f"✅ Created new customer {customer.id} from Google OAuth")

    # 3. Guest orders are matched by email in /api/customer/orders (no DB linking needed).

    # 4. Issue local JWT
    access_token = create_access_token(data={
        "sub": customer.email,
        "role": "customer",
        "user_id": customer.id,
        "name": customer.full_name,
        "customer_id": customer.id
    })

    return FirebaseAuthResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": customer.id,
            "name": customer.full_name,
            "email": customer.email,
            "phone": customer.phone,
            "provider": customer.provider
        }
    )


ADMIN_OTP_MAX_ATTEMPTS = 5


def _admin_otp_key(username: str) -> str:
    return f"admin:{username}"


@router.post("/api/admin/verify-otp", response_model=Token)
def verify_admin_otp(data: VerifyOTP, session: Session = Depends(get_session)):
    import hmac as _hmac
    from models import VerificationCode
    username = data.username
    record = session.get(VerificationCode, _admin_otp_key(username))
    
    if not record:
        raise HTTPException(status_code=400, detail="OTP request not found or expired")
    
    if datetime.utcnow() > record.expires_at:
        session.delete(record)
        session.commit()
        raise HTTPException(status_code=400, detail="OTP expired")

    if record.attempts >= ADMIN_OTP_MAX_ATTEMPTS:
        session.delete(record)
        session.commit()
        raise HTTPException(status_code=429, detail="Too many wrong attempts. Please login again.")
        
    if not _hmac.compare_digest(str(data.otp).strip(), record.code):
        record.attempts += 1
        session.add(record)
        session.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP")
         
    # OTP Valid - Issue Token (one-time use)
    session.delete(record)
    session.commit()
    access_token = create_access_token(data={"sub": username, "role": "admin"})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/api/login", response_model=LoginResponse)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    # print(f"DEBUG: Login Attempt for: {form_data.username}") # REMOVED LOG
    user = session.exec(select(AdminUser).where(AdminUser.username == form_data.username)).first()
    
    # Same message for wrong user / wrong password (no username enumeration)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # 2FA Logic - stored in DB so it works across multiple server workers
    import secrets as _secrets
    from models import VerificationCode
    otp = "".join(_secrets.choice("0123456789") for _ in range(6))
    expiration = datetime.utcnow() + timedelta(minutes=5)

    key = _admin_otp_key(user.username)
    record = session.get(VerificationCode, key)
    if record:
        record.code = otp
        record.expires_at = expiration
        record.attempts = 0
        record.created_at = datetime.utcnow()
    else:
        record = VerificationCode(phone=key, code=otp, expires_at=expiration)
    session.add(record)
    session.commit()
    
    # Send Telegram
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    if bot_token and chat_id:
        try:
            msg = f"🔐 *Admin Login Verification*\n\nUser: `{user.username}`\nOTP: `{otp}`\n\nValid for 5 minutes."
            requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={"chat_id": chat_id, "text": msg, "parse_mode": "Markdown"},
                timeout=5
            )
            return {"status": "2fa_required", "username": user.username, "message": "OTP Sent to Telegram"}
        except Exception as e:
            print(f"Telegram Auth Error: {e}")
            # Fallback if telegram fails? No, stricter security means fail or fallback
            # For now, if no credentials, we might return token (dev mode) or fail
            pass

    # If Telegram not configured (Dev mode fallback) OR failed
    if not bot_token:
         # In dev, maybe simulate 2FA by printing to console?
         print(f"DEBUG: Telegram not configured for 2FA. OTP generation skipped in secure mode.")
         return {"status": "error", "username": user.username, "message": "2FA Service Unavailable"}
         
    # If failed to send
    raise HTTPException(status_code=500, detail="Failed to send 2FA OTP")


@router.get("/api/auth/check-email")
def check_email_exists(email: str, session: Session = Depends(get_session)):
    customer = session.exec(select(Customer).where(Customer.email == email)).first()
    if customer:
        return {
            "exists": True, 
            "is_guest": customer.supabase_uid is None, # If no UID, it's a guest account
            "full_name": customer.full_name
        }
    return {"exists": False}

@router.post("/api/auth/signup")
def customer_signup(customer_data: CustomerCreate, session: Session = Depends(get_session)):
    if len(customer_data.password or "") < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    customer_data.email = customer_data.email.strip().lower()
    from sqlalchemy import func as _func
    existing_user = session.exec(select(Customer).where(_func.lower(Customer.email) == customer_data.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = pwd_context.hash(customer_data.password)
    new_customer = Customer(
        full_name=customer_data.full_name,
        email=customer_data.email,
        hashed_password=hashed_pwd,
        provider="email"
    )
    session.add(new_customer)
    session.commit()
    session.refresh(new_customer)
    return {
        "id": new_customer.id,
        "full_name": new_customer.full_name,
        "email": new_customer.email,
        "provider": new_customer.provider,
    }

@router.post("/api/auth/login")
def customer_login(login_data: CustomerLogin, session: Session = Depends(get_session)):
    from sqlalchemy import func as _func
    customer = session.exec(select(Customer).where(_func.lower(Customer.email) == login_data.email.strip().lower())).first()
    if not customer or not customer.hashed_password or not pwd_context.verify(login_data.password, customer.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create simple JWT for customer
    token = create_access_token(data={"sub": customer.email, "role": "customer", "name": customer.full_name, "customer_id": customer.id})
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user": {
            "id": customer.id,
            "name": customer.full_name, 
            "email": customer.email
        }
    }

@router.post("/api/auth/sync")
def sync_user(user_data: UserSync, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    # 1. Verify Token with Supabase to get trusted UID
    from supabase_utils import init_supabase
    s_client = init_supabase()
    uid = None
    
    email_from_token = None
    if s_client and token:
        try:
            u_data = s_client.auth.get_user(token)
            if u_data and u_data.user:
                uid = u_data.user.id
                email_from_token = u_data.user.email
        except Exception:
            pass

    if not uid:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    # Never trust the email sent in the body - use the verified one
    if email_from_token:
        user_data.email = email_from_token
    
    # Logic: Find by UID -> Find by Email -> Create
    customer = None
    if uid:
        customer = session.exec(select(Customer).where(Customer.supabase_uid == uid)).first()
        
    if not customer:
        customer = session.exec(select(Customer).where(Customer.email == user_data.email)).first()
        
        if customer:
            # Link UID if missing
            if uid and not customer.supabase_uid:
                customer.supabase_uid = uid
                session.add(customer)
                session.commit()
                session.refresh(customer)
                
                # CRITICAL: Link old Guest Orders to this new User ID
                # Find orders with this email but no user_id, update them
                guest_orders = session.exec(select(Order).where(Order.email == customer.email, Order.user_id == None)).all()
                for order in guest_orders:
                    order.user_id = uuid.UUID(uid)
                    session.add(order)
                session.commit()
                print(f"DEBUG: Linked {len(guest_orders)} guest orders to user {uid}")

        else:
            # Create new customer
            customer = Customer(
                full_name=user_data.full_name,
                email=user_data.email,
                provider=user_data.provider,
                supabase_uid=uid, # Can be None if token invalid, but we should enforce it?
                is_active=True
            )
            session.add(customer)
            session.commit()
            session.refresh(customer)
    
    return {"ok": True, "customer_id": customer.id}

# NOTE: /api/auth/social-login was removed - it issued a login token for ANY
# email without verification (account takeover). Use /api/auth/google or
# /api/auth/firebase instead.


# ============================================
# FORGOT / RESET PASSWORD (email + password customers)
# The link holds a signed token that is valid 1 hour and only until the
# password changes (it carries a fingerprint of the current password hash).
# ============================================
import hashlib as _hashlib
from fastapi import Request as _Request


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def _pw_fingerprint(hashed: str) -> str:
    return _hashlib.sha256((hashed or "").encode()).hexdigest()[:16]


@router.post("/api/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, request: _Request, session: Session = Depends(get_session)):
    from sqlalchemy import func as _func
    from routes.tracking import _throttle
    email = (payload.email or "").strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email")
    fwd = request.headers.get("x-forwarded-for", "")
    ip = (fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "")) or "unknown"
    _throttle(session, f"reset-ip:{ip}", 10, "Too many tries. Please wait a while and try again.")
    _throttle(session, f"reset-mail:{email}", 3, "We already sent a few links. Please check your inbox (and spam) or try later.")
    session.commit()

    customer = session.exec(select(Customer).where(_func.lower(Customer.email) == email)).first()
    if customer and customer.hashed_password:
        token = create_access_token(
            data={"sub": customer.email, "purpose": "pw_reset", "fp": _pw_fingerprint(customer.hashed_password)},
            expires_delta=timedelta(minutes=60),
        )
        site = os.getenv("FRONTEND_URL", "https://varahajewels.in").rstrip("/")
        from notifications import send_password_reset_email
        send_password_reset_email(customer.email, customer.full_name, f"{site}/reset-password?token={token}")
    # Same answer either way, so nobody can find out which emails have accounts
    return {"ok": True, "message": "If this email has an account, a reset link is on its way."}


@router.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, session: Session = Depends(get_session)):
    from jose import jwt as _jwt, JWTError
    from auth_utils import SECRET_KEY, ALGORITHM, get_password_hash
    if len(payload.new_password or "") < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    bad = HTTPException(status_code=400, detail="This reset link is invalid or has expired. Please request a new one.")
    try:
        data = _jwt.decode(payload.token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise bad
    if data.get("purpose") != "pw_reset" or not data.get("sub"):
        raise bad
    customer = session.exec(select(Customer).where(Customer.email == data["sub"])).first()
    if not customer or not customer.hashed_password or _pw_fingerprint(customer.hashed_password) != data.get("fp"):
        raise bad   # unknown account, or the link was already used
    customer.hashed_password = get_password_hash(payload.new_password)
    session.add(customer)
    session.commit()
    return {"ok": True, "message": "Password updated. Please log in with your new password."}
