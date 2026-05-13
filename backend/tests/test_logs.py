from datetime import datetime

from app.core.security import hash_password
from app.models.audit import AuditActionEnum, AuditLog
from app.models.business import Business, BusinessTypeEnum
from app.models.permission import Permission
from app.models.position import PayTypeEnum, Position
from app.models.user import RoleEnum, TitleEnum, User


# ── Helpers ────────────────────────────────────────────

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


def _seed_business(db) -> Business:
    biz = Business(name="Test Corp", type=BusinessTypeEnum.office)
    db.add(biz)
    db.commit()
    db.refresh(biz)
    return biz


def _seed_manager_with_logs_perm(db, biz_id: int) -> User:
    pos = Position(
        title="Manager",
        rank=2,
        business_id=biz_id,
        default_pay_type=PayTypeEnum.hourly,
        default_rate=25.0,
        default_contract_amount=0.0,
    )
    db.add(pos)
    db.flush()
    db.add(Permission(position_id=pos.id, can_see_logs=True))
    db.commit()
    db.refresh(pos)
    return _seed_user(db,
        email="manager@example.com",
        role=RoleEnum.manager,
        business_id=biz_id,
        position_id=pos.id,
    )


def _seed_log(db, biz_id: int, actor_id: int) -> AuditLog:
    entry = AuditLog(
        action=AuditActionEnum.user_created,
        actor_id=actor_id,
        actor_name="Test Actor",
        business_id=biz_id,
        details="test entry",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def _token(client, email: str) -> str:
    resp = client.post("/auth/login", json={
        "email": email,
        "password": "Password1!",
    })
    return resp.json()["access_token"]


# ── Tests ──────────────────────────────────────────────

class TestListLogs:
    """GET /logs"""

    def test_manager_with_permission_can_list(self, client, db_session):
        biz = _seed_business(db_session)
        manager = _seed_manager_with_logs_perm(db_session, biz.id)
        _seed_log(db_session, biz.id, manager.id)
        token = _token(client, "manager@example.com")
        resp = client.get("/logs", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_employee_cannot_list_logs(self, client, db_session):
        _seed_user(db_session)
        token = _token(client, "user@example.com")
        resp = client.get("/logs", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403

    def test_no_token_returns_401(self, client):
        resp = client.get("/logs")
        assert resp.status_code == 401

    def test_filter_by_business_id(self, client, db_session):
        biz = _seed_business(db_session)
        manager = _seed_manager_with_logs_perm(db_session, biz.id)
        _seed_log(db_session, biz.id, manager.id)
        token = _token(client, "manager@example.com")
        resp = client.get(
            f"/logs?business_id={biz.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert all(log["business_id"] == biz.id for log in resp.json())

    def test_filter_by_action(self, client, db_session):
        biz = _seed_business(db_session)
        manager = _seed_manager_with_logs_perm(db_session, biz.id)
        _seed_log(db_session, biz.id, manager.id)
        token = _token(client, "manager@example.com")
        resp = client.get(
            "/logs?action=user_created",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert all(log["action"] == "user_created" for log in resp.json())

    def test_limit_respected(self, client, db_session):
        biz = _seed_business(db_session)
        manager = _seed_manager_with_logs_perm(db_session, biz.id)
        for _ in range(5):
            _seed_log(db_session, biz.id, manager.id)
        token = _token(client, "manager@example.com")
        resp = client.get("/logs?limit=3", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert len(resp.json()) <= 3


class TestGetLog:
    """GET /logs/{id}"""

    def test_manager_gets_single_log(self, client, db_session):
        biz = _seed_business(db_session)
        manager = _seed_manager_with_logs_perm(db_session, biz.id)
        entry = _seed_log(db_session, biz.id, manager.id)
        token = _token(client, "manager@example.com")
        resp = client.get(f"/logs/{entry.id}", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["id"] == entry.id

    def test_not_found_returns_404(self, client, db_session):
        biz = _seed_business(db_session)
        _seed_manager_with_logs_perm(db_session, biz.id)
        token = _token(client, "manager@example.com")
        resp = client.get("/logs/99999", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 404