"""
Utilities for password hashing, JWT token, and other security-related functions.
"""

import re
import secrets
import string
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import jwt

from app.config import get_settings

settings = get_settings()

_ph = PasswordHasher()

def hash_password(password: str) -> str:
    """ Hash a password using Argon2. """
    return _ph.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    """ Verify a password using Argon2. """
    try:
        return _ph.verify(hashed_password, password)
    except VerifyMismatchError:
        return False

def validate_password_strength(password: str) -> list[str]:
    """ Validate password strength. Return a list of error messages if the password is weak. """
    errors = []
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")
    if not re.search(r'[0-9]', password):
        errors.append("Password must contain at least one digit")
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        errors.append("Password must contain at least one special character")
    return errors

def generate_temp_password() -> str:
    """ Generate a temporary password. """
    alphabet = string.ascii_letters + string.digits + string.punctuation
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(16))
        if not validate_password_strength(pwd):
            return pwd

def create_access_token(subject: int, extra: dict | None = None) -> str:
    """ Create an access token using JWT. """
    now  = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

def create_refresh_token(subject: int) -> str:
    """ Create a refresh token using JWT. """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=settings.refresh_token_expire_days),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

def decode_token(token: str) -> dict:
    """ Decode a JWT token and return the payload. """
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])