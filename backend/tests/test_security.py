import pytest
from jose import JWTError

from app.core.security import (
    hash_password,
    validate_password_strength,
    verify_password,
    generate_temp_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)

class TestPasswordHasher:
    """ Test password hashing """
    def test_hash_not_plain_text(self):
        pwd_hash = hash_password("Password123!")
        assert pwd_hash != "Password123!"

    def test_verify_valid_password_correct(self):
        pwd_hash = hash_password("Password123!")
        assert verify_password("Password123!", pwd_hash) is True

    def test_verify_valid_password_incorrect(self):
        pwd_hash = hash_password("Password123!")
        assert verify_password("Password123", pwd_hash) is False

    def test_same_password_using_salt(self):
        pwd_hash1 = hash_password("Password123!")
        pwd_hash2 = hash_password("Password123!")
        assert pwd_hash1 != pwd_hash2

class TestPasswordStrength:
    """ Test password strength """
    def test_password_strength(self):
        pwd_hash = hash_password("Password123!")
        assert validate_password_strength(pwd_hash) == []

    def test_password_too_short(self):
        errors = validate_password_strength("P1!")
        assert "Password must be at least 8 characters long" in errors

    def test_password_missing_uppercase(self):
        errors = validate_password_strength("password123!")
        assert "Password must contain at least one uppercase letter" in errors

    def test_password_missing_lowercase(self):
        errors = validate_password_strength("PASSWORD123!")
        assert "Password must contain at least one lowercase letter" in errors

    def test_password_missing_digit(self):
        errors = validate_password_strength("Password!")
        assert "Password must contain at least one digit" in errors

    def test_password_missing_special_character(self):
        errors = validate_password_strength("Password123")
        assert "Password must contain at least one special character" in errors

class TestTempPassword:
    """ Test temporary password generation """
    def test_temp_password_strength(self):
        temp_pwd = generate_temp_password()
        assert validate_password_strength(temp_pwd) == []

class TestJWT:
    """ Test JWT token creation and decoding """
    def test_create_and_decode_access_token(self):
        token = create_access_token(subject=1)
        payload = decode_token(token)
        assert payload["sub"] == "1"
        assert payload["type"] == "access"

    def test_create_and_decode_refresh_token(self):
        token = create_refresh_token(subject=1)
        payload = decode_token(token)
        assert payload["sub"] == "1"
        assert payload["type"] == "refresh"

    def test_decode_invalid_token(self):
        token = create_access_token(subject=1)
        tamp = token[:5] + "XXXXX"
        with pytest.raises(JWTError):
            decode_token(tamp)



