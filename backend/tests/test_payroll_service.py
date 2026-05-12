import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.pay_config import PayConfig
from app.models.tax_config import BusinessTaxConfig
from app.models.position import PayTypeEnum
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