from datetime import datetime

from app.core.security import hash_password
from app.models.business import Business, BusinessTypeEnum
from app.models.position import PayTypeEnum, Position
from app.models.user import RoleEnum, TitleEnum, User


def _seed_user(db, **kwargs) -> User:
    """Create a test user with sensible defaults."""
    defaults = dict(
        title=TitleEnum.mr,
        first_name="Test",
        last_name="User",
        email="employee@example.com",
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


def _seed_admin(db, email="admin@example.com") -> User:
    """Create an admin user."""
    return _seed_user(db, email=email, role=RoleEnum.admin)


def _seed_business(db) -> Business:
    """Create a test business."""
    biz = Business(name="Test Corp", type=BusinessTypeEnum.office)
    db.add(biz)
    db.commit()
    db.refresh(biz)
    return biz


def _seed_position(db, business_id: int) -> Position:
    """Create a test position linked to a business."""
    pos = Position(
        title="Developer",
        rank=1,
        business_id=business_id,
        default_pay_type=PayTypeEnum.hourly,
        default_rate=20.0,
        default_contract_amount=0.0,
    )
    db.add(pos)
    db.commit()
    db.refresh(pos)
    return pos


def _admin_token(client, db) -> str:
    """Seed an admin and return their access token."""
    _seed_admin(db)
    resp = client.post("/auth/login", json={
        "email": "admin@example.com",
        "password": "Password1!",
    })
    return resp.json()["access_token"]


class TestListUsers:
    """GET /admin/users"""

    def test_admin_can_list_users(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.get("/admin/users", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert data["total"] >= 1

    def test_employee_cannot_list_users(self, client, db_session):
        _seed_user(db_session)
        login = client.post("/auth/login", json={
            "email": "employee@example.com",
            "password": "Password1!",
        })
        token = login.json()["access_token"]
        resp = client.get("/admin/users", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403

    def test_no_token_returns_401(self, client):
        resp = client.get("/admin/users")
        assert resp.status_code == 401


class TestCreateManager:
    """POST /admin/managers"""

    def test_admin_creates_manager(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        pos = _seed_position(db_session, biz.id)
        resp = client.post(
            "/admin/managers",
            json={
                "title": "Mr",
                "first_name": "John",
                "last_name": "Smith",
                "email": "manager@example.com",
                "dob": "1985-06-15",
                "address_line1": "10 Manager Lane",
                "address_city": "Manchester",
                "address_postcode": "M1 1AA",
                "address_country": "UK",
                "business_id": biz.id,
                "position_id": pos.id,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "manager@example.com"
        assert data["role"] == "manager"
        assert data["is_first_login"] is True

    def test_duplicate_email_returns_409(self, client, db_session):
        token = _admin_token(client, db_session)  # seeds admin@example.com
        biz = _seed_business(db_session)
        pos = _seed_position(db_session, biz.id)
        resp = client.post(
            "/admin/managers",
            json={
                "title": "Ms",
                "first_name": "Jane",
                "last_name": "Doe",
                "email": "admin@example.com",   # already exists
                "dob": "1990-01-01",
                "address_line1": "1 St",
                "address_city": "London",
                "address_postcode": "E1 1AA",
                "address_country": "UK",
                "business_id": biz.id,
                "position_id": pos.id,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 409


class TestGetUser:
    """GET /admin/users/{user_id}"""

    def test_admin_gets_user(self, client, db_session):
        token = _admin_token(client, db_session)
        employee = _seed_user(db_session)
        resp = client.get(
            f"/admin/users/{employee.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "employee@example.com"

    def test_not_found_returns_404(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.get("/admin/users/99999", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 404


class TestUpdateUser:
    """PATCH /admin/users/{user_id}"""

    def test_admin_updates_first_name(self, client, db_session):
        token = _admin_token(client, db_session)
        employee = _seed_user(db_session)
        resp = client.patch(
            f"/admin/users/{employee.id}",
            json={"first_name": "Updated"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["first_name"] == "Updated"

    def test_not_found_returns_404(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.patch(
            "/admin/users/99999",
            json={"first_name": "X"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404


class TestDeleteUser:
    """DELETE /admin/users/{user_id}"""

    def test_admin_deletes_user(self, client, db_session):
        token = _admin_token(client, db_session)
        employee = _seed_user(db_session)
        resp = client.delete(
            f"/admin/users/{employee.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 204

    def test_cannot_delete_self(self, client, db_session):
        admin = _seed_admin(db_session)
        login = client.post("/auth/login", json={
            "email": "admin@example.com",
            "password": "Password1!",
        })
        token = login.json()["access_token"]
        resp = client.delete(
            f"/admin/users/{admin.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403

    def test_not_found_returns_404(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.delete("/admin/users/99999", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 404


class TestPromoteUser:
    """POST /admin/users/{user_id}/promote"""

    def test_promotes_employee_to_manager(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        pos = _seed_position(db_session, biz.id)
        employee = _seed_user(db_session)
        resp = client.post(
            f"/admin/users/{employee.id}/promote",
            json={"new_role": "manager", "position_id": pos.id},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "manager"
        assert resp.json()["position_id"] == pos.id

    def test_promote_to_admin_at_limit_returns_403(self, client, db_session):
        # max_admins = 2; seed two admins to reach the cap
        _seed_admin(db_session, email="admin@example.com")
        _seed_admin(db_session, email="admin2@example.com")
        login = client.post("/auth/login", json={
            "email": "admin@example.com",
            "password": "Password1!",
        })
        token = login.json()["access_token"]
        biz = _seed_business(db_session)
        pos = _seed_position(db_session, biz.id)
        employee = _seed_user(db_session)
        resp = client.post(
            f"/admin/users/{employee.id}/promote",
            json={"new_role": "admin", "position_id": pos.id},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403

    def test_invalid_position_returns_404(self, client, db_session):
        token = _admin_token(client, db_session)
        employee = _seed_user(db_session)
        resp = client.post(
            f"/admin/users/{employee.id}/promote",
            json={"new_role": "manager", "position_id": 99999},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404