from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.pay_config import PayConfig
from app.models.payslip import Payslip
from app.models.position import PayTypeEnum
from app.models.tax_config import BusinessTaxConfig

def calculate_net(gross: float, income_tax_rate: float, ni_rate: float) -> dict:
    """
    Calculate deductions and net pay from gross amount.
    Returns a dict with income_tax, ni, and net.
    """
    income_tax = round(gross * income_tax_rate, 2)
    ni = round(gross * ni_rate, 2)
    net = round(gross - income_tax - ni, 2)
    return {"income_tax": income_tax, "ni": ni, "net": net}

def generate_payslip(
    db: Session,
    employee_id: int,
    business_id: int,
    period_label: str,
    notes: str | None = None,
) -> Payslip:
    """
    Generate a payslip for an employee for a given period.
    Raises NotFoundError if pay config or tax config is missing.
    """
    # Get pay config
    pay_cfg = db.query(PayConfig).filter(
        PayConfig.employee_id == employee_id
    ).first()
    if pay_cfg is None:
        raise NotFoundError("Pay configuration")

    # Get tax config
    tax_cfg = db.query(BusinessTaxConfig).filter(
        BusinessTaxConfig.business_id == business_id
    ).first()
    if tax_cfg is None:
        raise NotFoundError("Tax configuration")

    # Calculate gross
    if pay_cfg.pay_type == PayTypeEnum.contract:
        gross = pay_cfg.contract_amount or pay_cfg.rate
    else:
        # Hourly/daily — rate is per hour/day, multiply by standard period
        # Default: 160 hours per month for hourly, 20 days for daily
        if pay_cfg.pay_type == PayTypeEnum.hourly:
            gross = round(pay_cfg.rate * 160, 2)
        else:
            gross = round(pay_cfg.rate * 20, 2)

    # Calculate deductions
    deductions = calculate_net(gross, tax_cfg.income_tax, tax_cfg.ni_rate)

    # Create payslip
    payslip = Payslip(
        employee_id = employee_id,
        business_id = business_id,
        period_label = period_label,
        gross = gross,
        income_tax = deductions["income_tax"],
        ni = deductions["ni"],
        net = deductions["net"],
        notes = notes,
    )
    db.add(payslip)
    return payslip