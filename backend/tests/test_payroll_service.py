from datetime import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.database import Base
from app.models.business import Business, BusinessTypeEnum
from app.models.pay_config import PayConfig
from app.models.position import Position, PayTypeEnum
from app.models.tax_config import BusinessTaxConfig
from app.models.user import User, RoleEnum, TitleEnum
from app.services.payroll import calculate_net, generate_payslip
from app.core.exceptions import NotFoundError


# Test database setup
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


# Helpers
def _seed_tax(db, business_id=1, income_tax=0.20, ni_rate=0.12):
    tax = BusinessTaxConfig(
        business_id=business_id,
        income_tax=income_tax,
        ni_rate=ni_rate,
    )
    db.add(tax)
    db.commit()
    return tax


def _seed_pay_config(db, employee_id=1, business_id=1, pay_type=PayTypeEnum.contract, rate=3000.0, contract_amount=3000.0):
    cfg = PayConfig(
        employee_id=employee_id,
        business_id=business_id,
        pay_type=pay_type,
        rate=rate,
        contract_amount=contract_amount,
    )
    db.add(cfg)
    db.commit()
    return cfg


def _seed_business(db, business_id=1):
    from app.models.business import BusinessTypeEnum
    biz = Business(id=business_id, name="Test Biz", type=BusinessTypeEnum.office)
    db.add(biz)
    db.commit()
    return biz


def _seed_position(db, business_id=1, pay_type=PayTypeEnum.hourly, rate=20.0, contract_amount=0.0):
    pos = Position(
        id=1,
        title="Test Role",
        rank=1,
        business_id=business_id,
        default_pay_type=pay_type,
        default_rate=rate,
        default_contract_amount=contract_amount,
    )
    db.add(pos)
    db.commit()
    return pos


def _seed_user(db, employee_id=1, business_id=1, position_id=None):
    u = User(
        id=employee_id,
        title=TitleEnum.mr,
        first_name="Test",
        last_name="User",
        email=f"emp{employee_id}@test.com",
        dob=datetime(1990, 1, 1).date(),
        address_line1="1 Test St",
        address_city="London",
        address_postcode="SW1A 1AA",
        address_country="UK",
        hashed_password=hash_password("Password1!"),
        role=RoleEnum.employee,
        business_id=business_id,
        position_id=position_id,
        is_first_login=False,
        is_active=True,
    )
    db.add(u)
    db.commit()
    return u


# Tests
class TestCalculateNet:
    """Unit tests for the gross-to-net calculation."""

    def test_correct_deductions(self):
        result = calculate_net(3000.0, 0.20, 0.12)
        assert result["income_tax"] == 600.0
        assert result["ni"]         == 360.0
        assert result["net"]        == 2040.0

    def test_zero_tax_rates(self):
        result = calculate_net(1000.0, 0.0, 0.0)
        assert result["net"] == 1000.0

    def test_rounding(self):
        result = calculate_net(1000.0, 0.333, 0.0)
        assert result["income_tax"] == 333.0


class TestContractPayslip:
    """Tests for contract pay type."""

    def test_contract_payslip_gross_to_net(self, db):
        _seed_tax(db)
        _seed_pay_config(db, pay_type=PayTypeEnum.contract, contract_amount=3000.0)
        payslip = generate_payslip(db, employee_id=1, business_id=1, period_label="2026-05")
        assert payslip.gross      == 3000.0
        assert payslip.income_tax == 600.0
        assert payslip.ni         == 360.0
        assert payslip.net        == 2040.0

    def test_contract_falls_back_to_rate(self, db):
        _seed_tax(db)
        _seed_pay_config(db, pay_type=PayTypeEnum.contract, rate=2500.0, contract_amount=None)
        payslip = generate_payslip(db, employee_id=1, business_id=1, period_label="2026-05")
        assert payslip.gross == 2500.0


class TestHourlyPayslip:
    """Tests for hourly pay type."""

    def test_hourly_multiplied_by_160(self, db):
        _seed_tax(db)
        _seed_pay_config(db, pay_type=PayTypeEnum.hourly, rate=20.0, contract_amount=None)
        payslip = generate_payslip(db, employee_id=1, business_id=1, period_label="2026-05")
        assert payslip.gross == 3200.0


class TestPayslipEdgeCases:
    """Edge case tests."""

    def test_missing_pay_config_raises(self, db):
        _seed_tax(db)
        with pytest.raises(NotFoundError):
            generate_payslip(db, employee_id=99, business_id=1, period_label="2026-05")

    def test_missing_tax_config_raises(self, db):
        _seed_pay_config(db)
        with pytest.raises(NotFoundError):
            generate_payslip(db, employee_id=1, business_id=99, period_label="2026-05")

    def test_payslip_saves_notes(self, db):
        _seed_tax(db)
        _seed_pay_config(db)
        payslip = generate_payslip(db, employee_id=1, business_id=1, period_label="2026-05", notes="Bonus month")
        db.commit()
        assert payslip.notes == "Bonus month"


class TestPositionFallback:
    """When no PayConfig exists, service falls back to position defaults."""

    def test_hourly_fallback_uses_position_rate(self, db):
        _seed_tax(db)
        _seed_business(db)
        pos = _seed_position(db, pay_type=PayTypeEnum.hourly, rate=25.0)
        _seed_user(db, position_id=pos.id)
        payslip = generate_payslip(db, employee_id=1, business_id=1, period_label="2026-05")
        assert payslip.gross == 25.0 * 160  # 4000.0

    def test_contract_fallback_uses_position_contract_amount(self, db):
        _seed_tax(db)
        _seed_business(db)
        pos = _seed_position(db, pay_type=PayTypeEnum.contract, rate=2000.0, contract_amount=3500.0)
        _seed_user(db, position_id=pos.id)
        payslip = generate_payslip(db, employee_id=1, business_id=1, period_label="2026-05")
        assert payslip.gross == 3500.0

    def test_pay_config_overrides_position(self, db):
        _seed_tax(db)
        _seed_business(db)
        pos = _seed_position(db, pay_type=PayTypeEnum.hourly, rate=10.0)
        _seed_user(db, position_id=pos.id)
        # PayConfig overrides position rate
        _seed_pay_config(db, pay_type=PayTypeEnum.hourly, rate=30.0, contract_amount=None)
        payslip = generate_payslip(db, employee_id=1, business_id=1, period_label="2026-05")
        assert payslip.gross == 30.0 * 160  # PayConfig wins, not position's 10.0

    def test_no_pay_config_and_no_position_raises(self, db):
        _seed_tax(db)
        _seed_business(db)
        _seed_user(db, position_id=None)  # user exists but no position
        with pytest.raises(NotFoundError):
            generate_payslip(db, employee_id=1, business_id=1, period_label="2026-05")