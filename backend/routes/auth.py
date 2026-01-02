from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from typing import Optional
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

# --- Schemas ---

class Token(BaseModel):
    access_token: str
    token_type: str

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
    provider_id: str # Not stored currently, but useful to validate

# --- Routes ---

@router.post("/api/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(AdminUser).where(AdminUser.username == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


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
