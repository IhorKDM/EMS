from datetime import datetime, date

from app.core.security import hash_password
from app.models.business import Business, BusinessTypeEnum
from app.models.permission import Permission
from app.models.position import PayTypeEnum, Position
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


def _seed_business(db) -> Business:
    biz = Business(name="Test Corp", type=BusinessTypeEnum.office)
    db.add(biz)
    db.commit()
    db.refresh(biz)
    return biz


def _seed_manager(db, biz_id: int) -> User:
    """Manager with can_manage_schedule permission."""
    pos = Position(
        title="Team Lead",
        rank=2,
        business_id=biz_id,
        default_pay_type=PayTypeEnum.hourly,
        default_rate=25.0,
        default_contract_amount=0.0,
    )
    db.add(pos)
    db.flush()
    perm = Permission(position_id=pos.id, can_manage_schedule=True)
    db.add(perm)
    db.commit()
    db.refresh(pos)

    manager = _seed_user(db,
        email="manager@example.com",
        role=RoleEnum.manager,
        business_id=biz_id,
        position_id=pos.id,
    )
    return manager


def _token(client, email: str) -> str:
    resp = client.post("/auth/login", json={
        "email": email,
        "password": "Password1!",
    })
    return resp.json()["access_token"]


def _shift_payload(employee_id: int, business_id: int) -> dict:
    return {
        "employee_id": employee_id,
        "business_id": business_id,
        "work_date": "2025-06-01",
        "start_time": "09:00",
        "end_time": "17:00",
    }


# ── Tests ──────────────────────────────────────────────

class TestCreateShift:
    """POST /schedule"""

    def test_manager_creates_shift(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        manager = _seed_manager(db_session, biz.id)
        token = _token(client, "manager@example.com")
        resp = client.post(
            "/schedule",
            json=_shift_payload(employee.id, biz.id),
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["employee_id"] == employee.id
        assert data["manager_id"] == manager.id

    def test_employee_cannot_create_shift(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        token = _token(client, "user@example.com")
        resp = client.post(
            "/schedule",
            json=_shift_payload(employee.id, biz.id),
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403

    def test_no_token_returns_401(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        resp = client.post("/schedule", json=_shift_payload(employee.id, biz.id))
        assert resp.status_code == 401


class TestListShifts:
    """GET /schedule"""

    def test_employee_sees_only_own_shifts(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        manager = _seed_manager(db_session, biz.id)
        mgr_token = _token(client, "manager@example.com")

        # Create shift for employee
        client.post("/schedule", json=_shift_payload(employee.id, biz.id),
                    headers={"Authorization": f"Bearer {mgr_token}"})
        # Create shift for manager (as another employee)
        client.post("/schedule", json=_shift_payload(manager.id, biz.id),
                    headers={"Authorization": f"Bearer {mgr_token}"})

        emp_token = _token(client, "user@example.com")
        resp = client.get("/schedule", headers={"Authorization": f"Bearer {emp_token}"})
        assert resp.status_code == 200
        assert all(s["employee_id"] == employee.id for s in resp.json())

    def test_manager_can_filter_by_employee(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        _seed_manager(db_session, biz.id)
        mgr_token = _token(client, "manager@example.com")
        client.post("/schedule", json=_shift_payload(employee.id, biz.id),
                    headers={"Authorization": f"Bearer {mgr_token}"})
        resp = client.get(
            f"/schedule?employee_id={employee.id}",
            headers={"Authorization": f"Bearer {mgr_token}"},
        )
        assert resp.status_code == 200
        assert all(s["employee_id"] == employee.id for s in resp.json())


class TestGetShift:
    """GET /schedule/{id}"""

    def test_manager_gets_any_shift(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        _seed_manager(db_session, biz.id)
        mgr_token = _token(client, "manager@example.com")
        create = client.post("/schedule", json=_shift_payload(employee.id, biz.id),
                             headers={"Authorization": f"Bearer {mgr_token}"})
        shift_id = create.json()["id"]
        resp = client.get(f"/schedule/{shift_id}", headers={"Authorization": f"Bearer {mgr_token}"})
        assert resp.status_code == 200

    def test_employee_cannot_view_another_employees_shift(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        other = _seed_user(db_session, email="other@example.com", business_id=biz.id)
        _seed_manager(db_session, biz.id)
        mgr_token = _token(client, "manager@example.com")
        create = client.post("/schedule", json=_shift_payload(other.id, biz.id),
                             headers={"Authorization": f"Bearer {mgr_token}"})
        shift_id = create.json()["id"]
        emp_token = _token(client, "user@example.com")
        resp = client.get(f"/schedule/{shift_id}", headers={"Authorization": f"Bearer {emp_token}"})
        assert resp.status_code == 403


class TestUpdateShift:
    """PATCH /schedule/{id}"""

    def test_manager_updates_shift(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        _seed_manager(db_session, biz.id)
        mgr_token = _token(client, "manager@example.com")
        create = client.post("/schedule", json=_shift_payload(employee.id, biz.id),
                             headers={"Authorization": f"Bearer {mgr_token}"})
        shift_id = create.json()["id"]
        resp = client.patch(
            f"/schedule/{shift_id}",
            json={"end_time": "18:00"},
            headers={"Authorization": f"Bearer {mgr_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["end_time"] == "18:00"


class TestDeleteShift:
    """DELETE /schedule/{id}"""

    def test_manager_deletes_shift(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        _seed_manager(db_session, biz.id)
        mgr_token = _token(client, "manager@example.com")
        create = client.post("/schedule", json=_shift_payload(employee.id, biz.id),
                             headers={"Authorization": f"Bearer {mgr_token}"})
        shift_id = create.json()["id"]
        resp = client.delete(f"/schedule/{shift_id}", headers={"Authorization": f"Bearer {mgr_token}"})
        assert resp.status_code == 204

    def test_not_found_returns_404(self, client, db_session):
        biz = _seed_business(db_session)
        _seed_manager(db_session, biz.id)
        mgr_token = _token(client, "manager@example.com")
        resp = client.delete("/schedule/99999", headers={"Authorization": f"Bearer {mgr_token}"})
        assert resp.status_code == 404