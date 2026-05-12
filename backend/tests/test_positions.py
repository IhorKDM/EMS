from datetime import datetime

from app.core.security import hash_password
from app.models.business import Business, BusinessTypeEnum
from app.models.position import PayTypeEnum, Position
from app.models.user import RoleEnum, TitleEnum, User


def _seed_admin(db) -> User:
    user = User(
        title=TitleEnum.mr,
        first_name="Admin",
        last_name="User",
        email="admin@example.com",
        dob=datetime(1985, 1, 1).date(),
        address_line1="1 Admin St",
        address_city="London",
        address_postcode="SW1A 1AA",
        address_country="UK",
        hashed_password=hash_password("Password1!"),
        role=RoleEnum.admin,
        is_first_login=False,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _admin_token(client, db) -> str:
    _seed_admin(db)
    resp = client.post("/auth/login", json={
        "email": "admin@example.com",
        "password": "Password1!",
    })
    return resp.json()["access_token"]


def _seed_business(db) -> Business:
    biz = Business(name="Test Corp", type=BusinessTypeEnum.office)
    db.add(biz)
    db.commit()
    db.refresh(biz)
    return biz


def _position_payload(business_id: int, title: str = "Developer") -> dict:
    return {
        "title": title,
        "rank": 1,
        "business_id": business_id,
        "default_pay_type": "hourly",
        "default_rate": 20.0,
        "default_contract_amount": 0.0,
    }


class TestListPositions:
    """GET /positions"""

    def test_admin_can_list(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.get("/positions", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_filter_by_business_id(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        client.post("/positions", json=_position_payload(biz.id), headers={"Authorization": f"Bearer {token}"})
        resp = client.get(f"/positions?business_id={biz.id}", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert all(p["business_id"] == biz.id for p in resp.json())


class TestCreatePosition:
    """POST /positions"""

    def test_creates_position_with_default_permissions(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        resp = client.post(
            "/positions",
            json=_position_payload(biz.id),
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Developer"
        assert data["permissions"]["can_add_user"] is False

    def test_creates_position_with_custom_permissions(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        payload = _position_payload(biz.id)
        payload["permissions"] = {"can_add_user": True, "can_manage_schedule": True}
        resp = client.post(
            "/positions",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["permissions"]["can_add_user"] is True
        assert data["permissions"]["can_manage_schedule"] is True
        assert data["permissions"]["can_view_payroll"] is False

    def test_invalid_business_returns_404(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.post(
            "/positions",
            json=_position_payload(business_id=99999),
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404


class TestGetPosition:
    """GET /positions/{id}"""

    def test_admin_gets_position(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        create = client.post("/positions", json=_position_payload(biz.id), headers={"Authorization": f"Bearer {token}"})
        pos_id = create.json()["id"]
        resp = client.get(f"/positions/{pos_id}", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["id"] == pos_id

    def test_not_found_returns_404(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.get("/positions/99999", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 404


class TestUpdatePosition:
    """PATCH /positions/{id}"""

    def test_update_title(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        create = client.post("/positions", json=_position_payload(biz.id), headers={"Authorization": f"Bearer {token}"})
        pos_id = create.json()["id"]
        resp = client.patch(
            f"/positions/{pos_id}",
            json={"title": "Senior Developer"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Senior Developer"

    def test_update_permissions(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        create = client.post("/positions", json=_position_payload(biz.id), headers={"Authorization": f"Bearer {token}"})
        pos_id = create.json()["id"]
        resp = client.patch(
            f"/positions/{pos_id}",
            json={"permissions": {"can_see_logs": True}},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["permissions"]["can_see_logs"] is True
        assert resp.json()["permissions"]["can_add_user"] is False


class TestDeletePosition:
    """DELETE /positions/{id}"""

    def test_admin_deletes_position(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        create = client.post("/positions", json=_position_payload(biz.id), headers={"Authorization": f"Bearer {token}"})
        pos_id = create.json()["id"]
        resp = client.delete(f"/positions/{pos_id}", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 204

    def test_not_found_returns_404(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.delete("/positions/99999", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 404