import pytest
from datetime import datetime, timedelta, timezone
from app.core.security import hash_password
from app.models.user import RoleEnum, TitleEnum, User

def _seed_user(db, **kwargs) -> User:
    """ Helper to create a test user with sensible defaults """
    defaults = dict(
        title=TitleEnum.mr,
        first_name="Test",
        last_name="User",
        email="test@example.com",
        dob=datetime(1990, 1, 1).date(),
        address_line1="123 Test St",
        address_city="London",
        address_postcode="SW1A 1AA",
        address_country="UK",
        hashed_password=hash_password("Password1!"),
        role=RoleEnum.employee,
        is_first_login=False,
        is_active=True,
    )
    defaults.update(kwargs)
    user = User(**defaults)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestLogin:
    """ Tests for POST /auth/login """

    def test_valid_credentials_return_tokens(self, client, db_session):
        _seed_user(db_session)
        resp = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "Password1!",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token"  in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_wrong_password_returns_401(self, client, db_session):
        _seed_user(db_session)
        resp = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "WrongPass1!",
        })
        assert resp.status_code == 401

    def test_unknown_email_returns_401(self, client, db_session):
        resp = client.post("/auth/login", json={
            "email": "ghost@example.com",
            "password": "Password1!",
        })
        assert resp.status_code == 401

    def test_inactive_account_returns_401(self, client, db_session):
        _seed_user(db_session, is_active=False)
        resp = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "Password1!",
        })
        assert resp.status_code == 401

    def test_expired_temp_password_returns_401(self, client, db_session):
        expired = datetime.now(timezone.utc) - timedelta(hours=1)
        _seed_user(db_session, is_first_login=True, temp_password_expires_at=expired)
        resp = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "Password1!",
        })
        assert resp.status_code == 401


class TestGetMe:
    """ Tests for GET /auth/me """

    def test_authenticated_user_gets_profile(self, client, db_session):
        _seed_user(db_session)
        login = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "Password1!",
        })
        token = login.json()["access_token"]
        resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@example.com"

    def test_no_token_returns_401(self, client):
        resp = client.get("/auth/me")
        assert resp.status_code == 401


class TestChangePassword:
    """ Tests for POST /auth/change-password """

    def test_valid_change_clears_first_login_flag(self, client, db_session):
        _seed_user(db_session, is_first_login=True)
        login = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "Password1!",
        })
        token = login.json()["access_token"]
        resp = client.post(
            "/auth/change-password",
            json={
                "current_password": "Password1!",
                "new_password":     "NewPass2@",
                "confirm_password": "NewPass2@",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_first_login"] is False

    def test_wrong_current_password_returns_401(self, client, db_session):
        _seed_user(db_session)
        login = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "Password1!",
        })
        token = login.json()["access_token"]
        resp = client.post(
            "/auth/change-password",
            json={
                "current_password": "WrongPass1!",
                "new_password":     "NewPass2@",
                "confirm_password": "NewPass2@",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401

    def test_mismatched_confirm_returns_400(self, client, db_session):
        _seed_user(db_session)
        login = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "Password1!",
        })
        token = login.json()["access_token"]
        resp = client.post(
            "/auth/change-password",
            json={
                "current_password": "Password1!",
                "new_password":     "NewPass2@",
                "confirm_password": "Different2@",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 400

    def test_weak_new_password_returns_400(self, client, db_session):
        _seed_user(db_session)
        login = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "Password1!",
        })
        token = login.json()["access_token"]
        resp = client.post(
            "/auth/change-password",
            json={
                "current_password": "Password1!",
                "new_password":     "weak",
                "confirm_password": "weak",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 400