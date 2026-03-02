"""
Firebase Admin SDK Utility for Varaha Jewels

Handles Firebase ID token verification for the hybrid auth architecture:
- Frontend uses Firebase Auth (bypasses ISP blocks)
- Backend verifies tokens and manages users in Supabase PostgreSQL
"""

import os
import json
import firebase_admin
from firebase_admin import credentials, auth
from functools import lru_cache

# Initialize Firebase Admin SDK
_firebase_app = None

def init_firebase():
    """
    Initialize Firebase Admin SDK using service account credentials.
    
    Credentials can be provided via:
    1. FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string)
    2. GOOGLE_APPLICATION_CREDENTIALS env var (path to JSON file)
    """
    global _firebase_app
    
    if _firebase_app:
        return _firebase_app
    
    # Check if already initialized
    if firebase_admin._apps:
        _firebase_app = firebase_admin.get_app()
        return _firebase_app
    
    try:
        # Method 1: JSON string in env var (for deployment platforms like Render/Vercel)
        service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        
        if service_account_json:
            cred_dict = json.loads(service_account_json)
            cred = credentials.Certificate(cred_dict)
            _firebase_app = firebase_admin.initialize_app(cred)
            print("✅ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_JSON")
            return _firebase_app
        
        # Method 2: Path to service account JSON file
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            print(f"✅ Firebase Admin initialized from file: {cred_path}")
            return _firebase_app
        
        # Method 3: Default credentials (works in GCP environments)
        _firebase_app = firebase_admin.initialize_app()
        print("✅ Firebase Admin initialized with default credentials")
        return _firebase_app
        
    except Exception as e:
        print(f"❌ Firebase Admin initialization failed: {e}")
        return None


def verify_firebase_token(id_token: str) -> dict | None:
    """
    Verify a Firebase ID token and return the decoded user info.
    
    Args:
        id_token: The Firebase ID token from the frontend
        
    Returns:
        dict with user info (uid, email, name, etc.) or None if invalid
    """
    init_firebase()
    
    if not firebase_admin._apps:
        print("❌ Firebase not initialized, cannot verify token")
        return None
    
    try:
        # Verify the ID token - checks signature, expiry, audience etc.
        decoded_token = auth.verify_id_token(id_token, check_revoked=True)
        
        return {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email"),
            "email_verified": decoded_token.get("email_verified", False),
            "name": decoded_token.get("name"),
            "picture": decoded_token.get("picture"),
            "phone_number": decoded_token.get("phone_number"),
            "sign_in_provider": decoded_token.get("firebase", {}).get("sign_in_provider"),
        }
        
    except auth.RevokedIdTokenError:
        print("❌ Firebase token has been revoked")
        return None
    except auth.ExpiredIdTokenError:
        print("❌ Firebase token has expired")
        return None
    except auth.InvalidIdTokenError as e:
        print(f"❌ Invalid Firebase token: {e}")
        return None
    except Exception as e:
        print(f"❌ Firebase token verification error: {e}")
        return None


def get_firebase_user(uid: str) -> dict | None:
    """
    Get a Firebase user by UID.
    
    Args:
        uid: Firebase user UID
        
    Returns:
        dict with user info or None if not found
    """
    init_firebase()
    
    if not firebase_admin._apps:
        return None
    
    try:
        user = auth.get_user(uid)
        return {
            "uid": user.uid,
            "email": user.email,
            "email_verified": user.email_verified,
            "display_name": user.display_name,
            "photo_url": user.photo_url,
            "phone_number": user.phone_number,
            "disabled": user.disabled,
        }
    except auth.UserNotFoundError:
        return None
    except Exception as e:
        print(f"❌ Error fetching Firebase user: {e}")
        return None
