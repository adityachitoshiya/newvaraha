import os
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from passlib.context import CryptContext

# Configuration — SECRET_KEY MUST be set via environment variable in production
SECRET_KEY = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "varaha_secret_key_change_this_in_production"))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "300"))

if SECRET_KEY == "varaha_secret_key_change_this_in_production":
    import warnings
    _msg = ("🚨 JWT SECRET_KEY is using the PUBLIC default value - anyone can forge admin tokens! "
            "Set JWT_SECRET_KEY in .env (e.g. output of: python -c \"import secrets;print(secrets.token_hex(32))\").")
    print(_msg)
    warnings.warn(_msg, RuntimeWarning)
    # In production refuse to start with the default secret
    if os.getenv("ENV", "").lower() in ("prod", "production"):
        raise RuntimeError(_msg)

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
