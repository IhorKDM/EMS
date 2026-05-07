'''
Utilities for password hashing, JWT token, and other security-related functions.
'''

import re
import secrets
import string
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import JWTError, jwt

from app.config import get_settings

settings = get_settings()

_ph = PasswordHasher()

def hash_password(password: str) -> str:
    ''' Hash a password using Argon2. '''
    return _ph.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    ''' Verify a password using Argon2. '''
    try:
        return _ph.verify(hashed_password, password)
    except VerifyMismatchError:
        return False

def validate_password_strength(password: str) -> list[str]:
    ''' Validate password strength. Return a list of error messages if the password is weak. '''
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