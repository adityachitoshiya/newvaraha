from fastapi import Depends, HTTPException, Header
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from typing import Optional
from database import get_session
from models import Customer, AdminUser
from auth_utils import ALGORITHM, SECRET_KEY
from jose import jwt

# OAuth2 Scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login", auto_error=False)

# Shared dependency to get current user (Admin or Customer)
async def get_current_user(token: Optional[str] = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Try Local Token (Admin/Customer)
    try:
        from jose import jwt
        # print(f"DEBUG: Validating Token: {token[:10]}...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        # print(f"DEBUG: Token Payload - User: {username}, Role: {role}")
        
        if role == "customer":
            user = session.exec(select(Customer).where(Customer.email == username)).first()
            if user: return user
        else:
            user = session.exec(select(AdminUser).where(AdminUser.username == username)).first()
            if user: return user
    except Exception:
        pass # Fallback to Supabase
    
    # 2. Try Supabase Token
    try:
        from supabase_utils import init_supabase
        s_client = init_supabase()
        if s_client:
            user_data = s_client.auth.get_user(token)
            if user_data and user_data.user:
                email = user_data.user.email
                uid = user_data.user.id
                
                # 1. Try finding by UID (Strict)
                user = session.exec(select(Customer).where(Customer.supabase_uid == uid)).first()
                
                if not user:
                     # 2. Fallback: Try finding by Email (Migration)
                     user = session.exec(select(Customer).where(Customer.email == email)).first()
                     
                     if user:
                         # Found by email but no UID? Link them now!
                         if not user.supabase_uid:
                             user.supabase_uid = uid
                             session.add(user)
                             session.commit()
                             session.refresh(user)
                     else:
                        # 3. Create new user with UID
                        user = Customer(
                            full_name=user_data.user.user_metadata.get('full_name', email.split('@')[0]),
                            email=email,
                            provider="google",
                            supabase_uid=uid,
                            is_active=True
                        )
                        session.add(user)
                        session.commit()
                        session.refresh(user)
                return user
    except Exception as e:
        print(f"Token verification failed: {e}")

    raise HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

async def get_current_admin(current_user=Depends(get_current_user)):
    """
    Dependency to enforce that the current user is an administrator.
    """
    # Check if it's an instance of AdminUser (strict model check)
    if isinstance(current_user, AdminUser):
        return current_user
        
    # Extra safety: Check role attribute if explicitly available on non-model objects
    # (Though get_current_user should return Models)
    if hasattr(current_user, "role") and current_user.role == "admin":
        return current_user

    raise HTTPException(
        status_code=403,
        detail="Admin access required"
    )

async def require_app_secret(x_app_key: Optional[str] = Header(None)):
    """
    Middleware to prevent direct browser access.
    Requires 'x-app-key' header to match the server secret.
    """
    import os
    expected_secret = os.getenv("APP_SECRET", "varaha_secure_key_123")
    
    if x_app_key != expected_secret:
        # Simulate a generic 403 or 404 to confuse direct access
        raise HTTPException(
            status_code=403, 
            detail="Access Denied: Application Handshake Failed"
        )
    return True
