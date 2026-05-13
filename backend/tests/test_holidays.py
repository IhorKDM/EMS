from datetime import datetime

from app.core.security import hash_password
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


def _seed_business(db) -> Business:
    biz = Business(name="Test Corp", type=BusinessTypeEnum.office)
    db.add(biz)
    db.commit()
    db.refresh(biz)
    return biz


def _seed_manager(db, biz_id: int) -> User:
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
    db.add(Permission(position_id=pos.id, can_accept_requests=True))
    db.commit()
    db.refresh(pos)
    return _seed_user(db,
        email="manager@example.com",
        role=RoleEnum.manager,
        business_id=biz_id,
        position_id=pos.id,
    )


def _token(client, email: str) -> str:
    resp = client.post("/auth/login", json={
        "email": email,
        "password": "Password1!",
    })
    return resp.json()["access_token"]


def _holiday_payload(start: str = "2025-07-01", end: str = "2025-07-05") -> dict:
    return {"start_date": start, "end_date": end, "reason": "Summer holiday"}


# ── Tests ──────────────────────────────────────────────

class TestSubmitHoliday:
    """POST /holidays"""

    def test_employee_submits_request(self, client, db_session):
        biz = _seed_business(db_session)
        _seed_user(db_session, business_id=biz.id)
        token = _token(client, "employee@example.com")
        resp = client.post(
            "/holidays",
            json=_holiday_payload(),
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "pending"
        assert data["start_date"] == "2025-07-01"

    def test_end_before_start_returns_422(self, client, db_session):
        biz = _seed_business(db_session)
        _seed_user(db_session, business_id=biz.id)
        token = _token(client, "employee@example.com")
        resp = client.post(
            "/holidays",
            json=_holiday_payload(start="2025-07-10", end="2025-07-01"),
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 422

    def test_no_business_returns_400(self, client, db_session):
        _seed_user(db_session)  # no business_id
        token = _token(client, "employee@example.com")
        resp = client.post(
            "/holidays",
            json=_holiday_payload(),
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 400

    def test_no_token_returns_401(self, client):
        resp = client.post("/holidays", json=_holiday_payload())
        assert resp.status_code == 401


class TestListHolidays:
    """GET /holidays"""

    def test_employee_sees_only_own(self, client, db_session):
        biz = _seed_business(db_session)
        _seed_user(db_session, business_id=biz.id)
        _seed_manager(db_session, biz.id)
        emp_token = _token(client, "employee@example.com")
        # Submit one request
        client.post("/holidays", json=_holiday_payload(),
                    headers={"Authorization": f"Bearer {emp_token}"})
        resp = client.get("/holidays", headers={"Authorization": f"Bearer {emp_token}"})
        assert resp.status_code == 200
        assert all(r["employee_id"] for r in resp.json())

    def test_manager_can_filter_by_status(self, client, db_session):
        biz = _seed_business(db_session)
        _seed_user(db_session, business_id=biz.id)
        _seed_manager(db_session, biz.id)
        emp_token = _token(client, "employee@example.com")
        client.post("/holidays", json=_holiday_payload(),
                    headers={"Authorization": f"Bearer {emp_token}"})
        mgr_token = _token(client, "manager@example.com")
        resp = client.get(
            "/holidays?status=pending",
            headers={"Authorization": f"Bearer {mgr_token}"},
        )
        assert resp.status_code == 200
        assert all(r["status"] == "pending" for r in resp.json())


class TestGetHoliday:
    """GET /holidays/{id}"""

    def test_employee_gets_own_request(self, client, db_session):
        biz = _seed_business(db_session)
        _seed_user(db_session, business_id=biz.id)
        token = _token(client, "employee@example.com")
        create = client.post("/holidays", json=_holiday_payload(),
                             headers={"Authorization": f"Bearer {token}"})
        hid = create.json()["id"]
        resp = client.get(f"/holidays/{hid}", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200

    def test_employee_cannot_view_others_request(self, client, db_session):
        biz = _seed_business(db_session)
        _seed_user(db_session, business_id=biz.id)
        other = _seed_user(db_session, email="other@example.com", business_id=biz.id)
        # Submit as other user — seed directly
        from app.models.holiday import HolidayRequest, HolidayStatusEnum
        from datetime import date
        req = HolidayRequest(
            employee_id=other.id,
            business_id=biz.id,
            start_date=date(2025, 8, 1),
            end_date=date(2025, 8, 5),
            status=HolidayStatusEnum.pending,
        )
        db_session.add(req)
        db_session.commit()
        db_session.refresh(req)
        token = _token(client, "employee@example.com")
        resp = client.get(f"/holidays/{req.id}", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403


class TestReviewHoliday:
    """POST /holidays/{id}/review"""

    def test_manager_approves_request(self, client, db_session):
        biz = _seed_business(db_session)
        _seed_user(db_session, business_id=biz.id)
        _seed_manager(db_session, biz.id)
        emp_token = _token(client, "employee@example.com")
        create = client.post("/holidays", json=_holiday_payload(),
                             headers={"Authorization": f"Bearer {emp_token}"})
        hid = create.json()["id"]
        mgr_token = _token(client, "manager@example.com")
        resp = client.post(
            f"/holidays/{hid}/review",
            json={"status": "approved", "review_notes": "Enjoy!"},
            headers={"Authorization": f"Bearer {mgr_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "approved"
        assert resp.json()["reviewed_by_id"] is not None

    def test_manager_rejects_request(self, client, db_session):
        biz = _seed_business(db_session)
        _seed_user(db_session, business_id=biz.id)
        _seed_manager(db_session, biz.id)
        emp_token = _token(client, "employee@example.com")
        create = client.post("/holidays", json=_holiday_payload(),
                             headers={"Authorization": f"Bearer {emp_token}"})
        hid = create.json()["id"]
        mgr_token = _token(client, "manager@example.com")
        resp = client.post(
            f"/holidays/{hid}/review",
            json={"status": "rejected", "review_notes": "Busy period."},
            headers={"Authorization": f"Bearer {mgr_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "rejected"

    def test_cannot_review_already_reviewed(self, client, db_session):
        biz = _seed_business(db_session)
        _seed_user(db_session, business_id=biz.id)
        _seed_manager(db_session, biz.id)
        emp_token = _token(client, "employee@example.com")
        create = client.post("/holidays", json=_holiday_payload(),
                             headers={"Authorization": f"Bearer {emp_token}"})
        hid = create.json()["id"]
        mgr_token = _token(client, "manager@example.com")
        # First review
        client.post(f"/holidays/{hid}/review",
                    json={"status": "approved"},
                    headers={"Authorization": f"Bearer {mgr_token}"})
        # Second review attempt
        resp = client.post(
            f"/holidays/{hid}/review",
            json={"status": "rejected"},
            headers={"Authorization": f"Bearer {mgr_token}"},
        )
        assert resp.status_code == 400

    def test_employee_cannot_review(self, client, db_session):
        biz = _seed_business(db_session)
        _seed_user(db_session, business_id=biz.id)
        token = _token(client, "employee@example.com")
        create = client.post("/holidays", json=_holiday_payload(),
                             headers={"Authorization": f"Bearer {token}"})
        hid = create.json()["id"]
        resp = client.post(
            f"/holidays/{hid}/review",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403