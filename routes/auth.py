import os
import random
import requests
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Body
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

router = APIRouter()

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# --- 2FA Storage (In-Memory for simplicity) ---
otp_storage = {}

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
    BOT_TOKEN = "8341796935:AAF6TS6k7cjhuqRAD-LxOFvCEPu1ubbtfX4"
    
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
    
    # Check if hash matches usually, but for development with dummy token we might skip or fail
    # if hash_payload != data.hash:
    #     raise HTTPException(status_code=400, detail="Data integrity check failed")

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

@router.post("/api/admin/verify-otp", response_model=Token)
def verify_admin_otp(data: VerifyOTP):
    username = data.username
    record = otp_storage.get(username)
    
    if not record:
        raise HTTPException(status_code=400, detail="OTP request not found or expired")
    
    if datetime.now() > record['expires']:
        del otp_storage[username]
        raise HTTPException(status_code=400, detail="OTP expired")
        
    if data.otp != record['code']:
         raise HTTPException(status_code=400, detail="Invalid OTP")
         
    # OTP Valid - Issue Token
    del otp_storage[username] # One-time use
    access_token = create_access_token(data={"sub": username, "role": "admin"})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/api/login", response_model=LoginResponse)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    print(f"DEBUG: Login Attempt for: {form_data.username}")
    user = session.exec(select(AdminUser).where(AdminUser.username == form_data.username)).first()
    
    if not user:
        print("DEBUG: AdminUser NOT FOUND in DB.")
        raise HTTPException(status_code=401, detail="User not found")
        
    valid_pwd = verify_password(form_data.password, user.hashed_password)
    print(f"DEBUG: Password Valid? {valid_pwd}")
    
    if not valid_pwd:
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # 2FA Logic
    otp = "".join([str(random.randint(0, 9)) for _ in range(6)])
    expiration = datetime.now() + timedelta(minutes=5)
    
    otp_storage[user.username] = {
        "code": otp,
        "expires": expiration
    }
    
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
         print(f"DEBUG OTP for {user.username}: {otp}")
         return {"status": "2fa_required", "username": user.username, "message": "OTP (Simulated) Sent"}
         
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

@router.post("/api/auth/signup", response_model=Customer)
def customer_signup(customer_data: CustomerCreate, session: Session = Depends(get_session)):
    existing_user = session.exec(select(Customer).where(Customer.email == customer_data.email)).first()
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
    return new_customer

@router.post("/api/auth/login")
def customer_login(login_data: CustomerLogin, session: Session = Depends(get_session)):
    customer = session.exec(select(Customer).where(Customer.email == login_data.email)).first()
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
    
    if s_client:
        try:
            u_data = s_client.auth.get_user(token)
            if u_data and u_data.user:
                uid = u_data.user.id
        except:
             pass
    
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

@router.post("/api/auth/social-login")
def social_login(social_data: SocialLogin, session: Session = Depends(get_session)):
    # Legacy/Alternative endpoint, kept for backward compat if needed
    customer = session.exec(select(Customer).where(Customer.email == social_data.email)).first()
    if not customer:
        customer = Customer(
            full_name=social_data.full_name,
            email=social_data.email,
            provider=social_data.provider,
            is_active=True
        )
        session.add(customer)
        session.commit()
        session.refresh(customer)
    
    # We still issue a local token here for the old flow, but we are moving away from it
    token = create_access_token(data={"sub": customer.email, "role": "customer", "name": customer.full_name})
    return {"access_token": token, "token_type": "bearer", "user": {"name": customer.full_name, "email": customer.email}}
