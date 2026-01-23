"""
MSG91 OTP Verification Routes
Handles OTP verification via MSG91 Widget
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import os

router = APIRouter()

# MSG91 API Configuration
MSG91_VERIFY_URL = "https://control.msg91.com/api/v5/widget/verifyAccessToken"


class VerifyOTPRequest(BaseModel):
    access_token: str  # JWT token from MSG91 widget


class VerifyOTPResponse(BaseModel):
    success: bool
    message: str
    phone: str = None
    country_code: str = None


class GuestVerifyRequest(BaseModel):
    access_token: str  # JWT token from MSG91 widget
    name: str
    email: str
    phone: str  # Phone number entered by user


class GuestVerifyResponse(BaseModel):
    success: bool
    message: str
    phone: str = None
    user_created: bool = False
    auth_token: str = None  # Supabase token if account created


@router.post("/api/verify-otp", response_model=VerifyOTPResponse)
async def verify_msg91_otp(request: VerifyOTPRequest):
    """
    Verify OTP access token received from MSG91 widget.
    
    Frontend sends the access_token received after successful OTP verification,
    and this endpoint validates it with MSG91 servers.
    """
    
    auth_key = os.getenv("MSG91_AUTH_KEY")
    
    if not auth_key:
        raise HTTPException(
            status_code=500, 
            detail="MSG91 not configured. Please set MSG91_AUTH_KEY."
        )
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                MSG91_VERIFY_URL,
                headers={"Content-Type": "application/json"},
                json={
                    "authkey": auth_key,
                    "access-token": request.access_token
                },
                timeout=10.0
            )
            
            data = response.json()
            
            # MSG91 returns {"type": "success", "message": "...", ...} on success
            if response.status_code == 200 and data.get("type") == "success":
                return VerifyOTPResponse(
                    success=True,
                    message="Phone number verified successfully",
                    phone=data.get("mobile"),
                    country_code=data.get("country_code", "91")
                )
            else:
                # Verification failed
                error_msg = data.get("message", "OTP verification failed")
                raise HTTPException(status_code=400, detail=error_msg)
                
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="MSG91 verification timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"MSG91 connection error: {str(e)}")
    except Exception as e:
        print(f"MSG91 Verification Error: {e}")
        raise HTTPException(status_code=500, detail="Internal verification error")


@router.post("/api/guest/verify-and-create", response_model=GuestVerifyResponse)
async def verify_guest_and_create_account(request: GuestVerifyRequest):
    """
    Verify OTP for guest checkout and create user account.
    
    Flow:
    1. Verify MSG91 access token
    2. Check if user already exists in Supabase
    3. If not, create new user account
    4. Return auth token for the session
    """
    
    auth_key = os.getenv("MSG91_AUTH_KEY")
    
    if not auth_key:
        raise HTTPException(
            status_code=500, 
            detail="MSG91 not configured. Please set MSG91_AUTH_KEY."
        )
    
    # Step 1: Verify OTP with MSG91
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                MSG91_VERIFY_URL,
                headers={"Content-Type": "application/json"},
                json={
                    "authkey": auth_key,
                    "access-token": request.access_token
                },
                timeout=10.0
            )
            
            data = response.json()
            
            if response.status_code != 200 or data.get("type") != "success":
                error_msg = data.get("message", "OTP verification failed")
                raise HTTPException(status_code=400, detail=error_msg)
                
            verified_phone = data.get("mobile")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"MSG91 Verification Error: {e}")
        raise HTTPException(status_code=500, detail="OTP verification failed")
    
    # Step 2: Create/Get User in Supabase
    try:
        from supabase_utils import init_supabase
        supabase = init_supabase()
        
        if not supabase:
            # Supabase not configured - return success without account creation
            return GuestVerifyResponse(
                success=True,
                message="Phone verified (Supabase not configured)",
                phone=verified_phone or request.phone,
                user_created=False,
                auth_token=None
            )
        
        # Normalize phone number (remove +91 prefix if present)
        phone_normalized = request.phone.replace("+91", "").replace(" ", "").lstrip("0")
        if len(phone_normalized) == 10:
            phone_normalized = f"+91{phone_normalized}"
        else:
            phone_normalized = f"+{phone_normalized}"
        
        # Generate a secure random password for the user
        import secrets
        import string
        random_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
        
        # Try to sign up the user (will fail if already exists)
        try:
            # Try signing up with phone number as identifier
            signup_response = supabase.auth.sign_up({
                "email": request.email,
                "password": random_password,
                "options": {
                    "data": {
                        "full_name": request.name,
                        "phone": phone_normalized,
                        "phone_verified": True
                    }
                }
            })
            
            if signup_response.user:
                print(f"DEBUG: Created new user account for {request.email}")
                
                # Auto-login the user
                login_response = supabase.auth.sign_in_with_password({
                    "email": request.email,
                    "password": random_password
                })
                
                auth_token = login_response.session.access_token if login_response.session else None
                
                return GuestVerifyResponse(
                    success=True,
                    message="Phone verified and account created",
                    phone=verified_phone or request.phone,
                    user_created=True,
                    auth_token=auth_token
                )
                
        except Exception as signup_error:
            print(f"DEBUG: Signup failed (user may exist): {signup_error}")
            
            # User might already exist - try to sign in or just return verified
            return GuestVerifyResponse(
                success=True,
                message="Phone verified (existing user)",
                phone=verified_phone or request.phone,
                user_created=False,
                auth_token=None
            )
            
    except Exception as e:
        print(f"Supabase Error: {e}")
        # Still return success if OTP was verified
        return GuestVerifyResponse(
            success=True,
            message="Phone verified",
            phone=verified_phone or request.phone,
            user_created=False,
            auth_token=None
        )


@router.get("/api/otp/health")
async def otp_health_check():
    """Check if MSG91 is configured"""
    auth_key = os.getenv("MSG91_AUTH_KEY")
    return {
        "configured": bool(auth_key),
        "provider": "MSG91"
    }

@router.post("/api/test/send-otp")
async def test_send_otp(phone: str, template_id: str = None):
    """
    Test endpoint to manually send OTP via MSG91 (Server-side trigger)
    Not used in production Widget flow, but useful for testing credentials.
    """
    auth_key = os.getenv("MSG91_AUTH_KEY")
    if not auth_key:
        return {"error": "MSG91_AUTH_KEY not set"}
    
    # Send OTP URL
    url = "https://control.msg91.com/api/v5/otp"
    
    params = {
        "mobile": phone,
        "authkey": auth_key
    }
    if template_id:
        params["template_id"] = template_id
        
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, params=params)
            return {
                "status_code": response.status_code,
                "msg91_response": response.json()
            }
    except Exception as e:
        return {"error": str(e)}
