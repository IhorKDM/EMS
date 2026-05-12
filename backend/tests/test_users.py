from datetime import datetime
from app.core.security import hash_password
from app.models.user import RoleEnum, TitleEnum, User


def _seed_user(db, **kwargs) -> User:
    defaults = dict(
        title=TitleEnum.mr,
        first_name="Test",
        last_name="User",
        email="user@example.com",
        dob=datetime(1990, 1, 1).date(),
        address_line1="1 Test St",
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


def _token(client) -> str:
    resp = client.post("/auth/login", json={
        "email": "user@example.com",
        "password": "Password1!",
    })
    return resp.json()["access_token"]


class TestGetMe:
    """ GET /users/me """

    def test_returns_own_profile(self, client, db_session):
        _seed_user(db_session)
        token = _token(client)
        resp = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == "user@example.com"

    def test_no_token_returns_401(self, client):
        resp = client.get("/users/me")
        assert resp.status_code == 401

    def test_inactive_user_cannot_login(self, client, db_session):
        _seed_user(db_session, is_active=False)
        resp = client.post("/auth/login", json={
            "email": "user@example.com",
            "password": "Password1!",
        })
        assert resp.status_code == 401


class TestUpdateMe:
    """ PATCH /users/me """

    def test_can_update_first_name(self, client, db_session):
        _seed_user(db_session)
        token = _token(client)
        resp = client.patch(
            "/users/me",
            json={"first_name": "Updated"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["first_name"] == "Updated"

    def test_can_update_address(self, client, db_session):
        _seed_user(db_session)
        token = _token(client)
        resp = client.patch(
            "/users/me",
            json={"address_postcode": "EC1A 1BB"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["address"]["postcode"] == "EC1A 1BB"

    def test_empty_patch_changes_nothing(self, client, db_session):
        _seed_user(db_session)
        token = _token(client)
        resp = client.patch(
            "/users/me",
            json={},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["first_name"] == "Test"

    def test_no_token_returns_401(self, client):
        resp = client.patch("/users/me", json={"first_name": "X"})
        assert resp.status_code == 401