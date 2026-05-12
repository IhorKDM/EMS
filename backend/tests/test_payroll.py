from datetime import datetime

from app.core.security import hash_password
from app.models.business import Business, BusinessTypeEnum
from app.models.pay_config import PayConfig
from app.models.permission import Permission
from app.models.position import PayTypeEnum, Position
from app.models.tax_config import BusinessTaxConfig
from app.models.user import RoleEnum, TitleEnum, User


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


def _seed_admin(db) -> User:
    return _seed_user(db, email="admin@example.com", role=RoleEnum.admin)


def _seed_business(db) -> Business:
    biz = Business(name="Test Corp", type=BusinessTypeEnum.office)
    db.add(biz)
    db.commit()
    db.refresh(biz)
    return biz


def _seed_manager(db, biz_id: int) -> User:
    pos = Position(
        title="Payroll Manager",
        rank=2,
        business_id=biz_id,
        default_pay_type=PayTypeEnum.hourly,
        default_rate=25.0,
        default_contract_amount=0.0,
    )
    db.add(pos)
    db.flush()
    db.add(Permission(position_id=pos.id, can_manage_payroll=True))
    db.commit()
    db.refresh(pos)
    return _seed_user(db,
        email="manager@example.com",
        role=RoleEnum.manager,
        business_id=biz_id,
        position_id=pos.id,
    )


def _seed_tax_config(db, business_id: int) -> BusinessTaxConfig:
    cfg = BusinessTaxConfig(
        business_id=business_id,
        income_tax=0.20,
        ni_rate=0.12,
    )
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


def _seed_pay_config(db, employee_id: int, business_id: int) -> PayConfig:
    cfg = PayConfig(
        employee_id=employee_id,
        business_id=business_id,
        pay_type=PayTypeEnum.hourly,
        rate=15.0,
    )
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


def _token(client, email: str) -> str:
    resp = client.post("/auth/login", json={
        "email": email,
        "password": "Password1!",
    })
    return resp.json()["access_token"]


# ── Tests ──────────────────────────────────────────────

class TestTaxConfig:
    """POST /payroll/tax-config  |  GET /payroll/tax-config/{business_id}"""

    def test_admin_creates_tax_config(self, client, db_session):
        _seed_admin(db_session)
        biz = _seed_business(db_session)
        token = _token(client, "admin@example.com")
        resp = client.post(
            f"/payroll/tax-config?business_id={biz.id}",
            json={"income_tax": 0.20, "ni_rate": 0.12},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["income_tax"] == 0.20

    def test_admin_updates_existing_tax_config(self, client, db_session):
        _seed_admin(db_session)
        biz = _seed_business(db_session)
        _seed_tax_config(db_session, biz.id)
        token = _token(client, "admin@example.com")
        resp = client.post(
            f"/payroll/tax-config?business_id={biz.id}",
            json={"income_tax": 0.25, "ni_rate": 0.13},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["income_tax"] == 0.25

    def test_get_tax_config(self, client, db_session):
        _seed_admin(db_session)
        biz = _seed_business(db_session)
        _seed_tax_config(db_session, biz.id)
        token = _token(client, "admin@example.com")
        resp = client.get(
            f"/payroll/tax-config/{biz.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["business_id"] == biz.id

    def test_not_found_returns_404(self, client, db_session):
        _seed_admin(db_session)
        token = _token(client, "admin@example.com")
        resp = client.get("/payroll/tax-config/99999", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 404


class TestPayConfig:
    """POST/GET/PATCH /payroll/pay-config"""

    def test_manager_creates_pay_config(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        _seed_manager(db_session, biz.id)
        token = _token(client, "manager@example.com")
        resp = client.post(
            "/payroll/pay-config",
            json={
                "employee_id": employee.id,
                "business_id": biz.id,
                "pay_type": "hourly",
                "rate": 15.0,
                "contract_amount": None,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["employee_id"] == employee.id

    def test_duplicate_pay_config_returns_409(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        _seed_pay_config(db_session, employee.id, biz.id)
        _seed_manager(db_session, biz.id)
        token = _token(client, "manager@example.com")
        resp = client.post(
            "/payroll/pay-config",
            json={
                "employee_id": employee.id,
                "business_id": biz.id,
                "pay_type": "hourly",
                "rate": 15.0,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 409

    def test_get_pay_config(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        _seed_pay_config(db_session, employee.id, biz.id)
        _seed_manager(db_session, biz.id)
        token = _token(client, "manager@example.com")
        resp = client.get(
            f"/payroll/pay-config/{employee.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["rate"] == 15.0

    def test_employee_can_view_own_pay_config(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        _seed_pay_config(db_session, employee.id, biz.id)
        token = _token(client, "employee@example.com")
        resp = client.get(
            f"/payroll/pay-config/{employee.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

    def test_employee_cannot_view_others_pay_config(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        other = _seed_user(db_session, email="other@example.com", business_id=biz.id)
        _seed_pay_config(db_session, other.id, biz.id)
        token = _token(client, "employee@example.com")
        resp = client.get(
            f"/payroll/pay-config/{other.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403

    def test_update_pay_config(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        _seed_pay_config(db_session, employee.id, biz.id)
        _seed_manager(db_session, biz.id)
        token = _token(client, "manager@example.com")
        resp = client.patch(
            f"/payroll/pay-config/{employee.id}",
            json={"rate": 20.0},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["rate"] == 20.0


class TestPayslips:
    """POST /payroll/payslips  |  GET /payroll/payslips"""

    def test_generate_payslip(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        _seed_pay_config(db_session, employee.id, biz.id)
        _seed_tax_config(db_session, biz.id)
        _seed_manager(db_session, biz.id)
        token = _token(client, "manager@example.com")
        resp = client.post(
            "/payroll/payslips",
            json={"employee_id": employee.id, "period_label": "May 2025"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["period_label"] == "May 2025"
        assert data["gross"] == 2400.0   # 15 * 160
        assert data["net"] > 0

    def test_generate_missing_pay_config_returns_404(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        _seed_tax_config(db_session, biz.id)
        _seed_manager(db_session, biz.id)
        token = _token(client, "manager@example.com")
        resp = client.post(
            "/payroll/payslips",
            json={"employee_id": employee.id, "period_label": "May 2025"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404

    def test_generate_missing_tax_config_returns_404(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        _seed_pay_config(db_session, employee.id, biz.id)
        _seed_manager(db_session, biz.id)
        token = _token(client, "manager@example.com")
        resp = client.post(
            "/payroll/payslips",
            json={"employee_id": employee.id, "period_label": "May 2025"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404

    def test_employee_sees_own_payslips_only(self, client, db_session):
        biz = _seed_business(db_session)
        employee = _seed_user(db_session, business_id=biz.id)
        other = _seed_user(db_session, email="other@example.com", business_id=biz.id)
        _seed_pay_config(db_session, employee.id, biz.id)
        _seed_tax_config(db_session, biz.id)
        _seed_manager(db_session, biz.id)
        mgr_token = _token(client, "manager@example.com")
        # Generate payslip for employee
        client.post("/payroll/payslips",
            json={"employee_id": employee.id, "period_label": "May 2025"},
            headers={"Authorization": f"Bearer {mgr_token}"},
        )
        emp_token = _token(client, "employee@example.com")
        resp = client.get("/payroll/payslips", headers={"Authorization": f"Bearer {emp_token}"})
        assert resp.status_code == 200
        assert all(p["employee_id"] == employee.id for p in resp.json())