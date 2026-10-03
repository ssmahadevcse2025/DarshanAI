import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.config import settings
from backend.models.user import User

try:
    import bcrypt
except ImportError:
    bcrypt = None

def get_password_hash(password: str) -> str:
    """
    Lightweight, ultra-fast SHA-256 password hash (<0.01ms computation time).
    Eliminates slow CPU delays and thread blocking during authentication.
    """
    if not password:
        return ""
    hashed = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return f"sha256${hashed}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Fast, flexible password verification with instant fallback support.
    Supports:
    1. Direct plain text equality (instant 0ms)
    2. Fast SHA-256 hashes (instant <0.01ms)
    3. Legacy Bcrypt hashes (backward compatibility)
    """
    if not plain_password or not hashed_password:
        return False

    # 1. Instant check: direct plaintext match
    if hashed_password == plain_password:
        return True

    # 2. Fast SHA-256 check
    if hashed_password.startswith("sha256$"):
        target_hash = hashed_password.split("$", 1)[1]
        computed_hash = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
        return hmac.compare_digest(computed_hash, target_hash)

    # 3. Direct hex check without prefix
    if len(hashed_password) == 64 and all(c in "0123456789abcdefABCDEF" for c in hashed_password):
        computed_hash = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
        return hmac.compare_digest(computed_hash.lower(), hashed_password.lower())

    # 4. Legacy bcrypt check (fallback for existing DB records)
    if bcrypt and (hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$") or hashed_password.startswith("$2y$")):
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception:
            return False

    return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def authenticate_user(db: Session, email: str, password: str, temple_id: Optional[str] = None):
    if not email or not password:
        return None

    clean_email = email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if not user:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    # Auto-upgrade legacy bcrypt hash to ultra-fast sha256 hash on successful login
    if user.hashed_password.startswith("$2b$") or user.hashed_password.startswith("$2a$") or user.hashed_password == password:
        try:
            user.hashed_password = get_password_hash(password)
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()

    # Super Admin can log into any temple or platform context
    if user.role != "SUPER_ADMIN":
        if temple_id and temple_id.strip():
            clean_temple_id = temple_id.strip().upper()
            if user.temple_id and user.temple_id.strip().upper() != clean_temple_id:
                return None

    return user
