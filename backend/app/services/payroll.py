import json
from datetime import date
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.pay_config import PayConfig
from app.models.payslip import Payslip
from app.models.position import PayTypeEnum
from app.models.shift import Shift
from app.models.tax_config import BusinessTaxConfig
from app.models.user import User


def calculate_net(gross: float, income_tax_rate: float, ni_rate: float, threshold: float = 0.0) -> dict:
    taxable = max(0.0, gross - threshold)
    income_tax = round(taxable * income_tax_rate, 2)
    ni = round(taxable * ni_rate, 2)
    net = round(gross - income_tax - ni, 2)
    return {"income_tax": income_tax, "ni": ni, "net": net}


def generate_payslip(
    db: Session,
    employee_id: int,
    business_id: int,
    period_label: str,
    period_start: date | None = None,
    period_end: date | None = None,
    notes: str | None = None,
) -> Payslip:
    # 1. Try PayConfig (per-employee override) first
    pay_config = db.query(PayConfig).filter(PayConfig.employee_id == employee_id).first()

    if pay_config is not None:
        pay_type = pay_config.pay_type
        rate = pay_config.rate
        contract_amount = pay_config.contract_amount
    else:
        # 2. Fall back to position defaults
        employee = db.get(User, employee_id)
        if employee is None or employee.position is None:
            raise NotFoundError("Pay configuration")
        pay_type = employee.position.default_pay_type
        rate = employee.position.default_rate
        contract_amount = employee.position.default_contract_amount

    tax_cfg = db.query(BusinessTaxConfig).filter(
        BusinessTaxConfig.business_id == business_id
    ).first()
    if tax_cfg is None:
        raise NotFoundError("Tax configuration")

    breakdown = []

    if pay_type == PayTypeEnum.contract:
        gross = contract_amount or rate
        breakdown = [{"label": "Contract", "amount": gross}]
    elif period_start and period_end:
        shifts = db.query(Shift).filter(
            Shift.employee_id == employee_id,
            Shift.work_date >= period_start,
            Shift.work_date <= period_end,
        ).all()
        if pay_type == PayTypeEnum.hourly:
            total_hours = 0.0
            for s in shifts:
                sh, sm = map(int, s.start_time.split(':'))
                eh, em = map(int, s.end_time.split(':'))
                hours = round((eh * 60 + em - sh * 60 - sm) / 60, 2)
                amount = round(rate * hours, 2)
                breakdown.append({"label": f"{s.work_date} · {hours} hrs @ £{rate}", "amount": amount})
                total_hours += hours
            gross = round(rate * total_hours, 2)
        else:
            for s in shifts:
                breakdown.append({"label": str(s.work_date), "amount": rate})
            gross = round(rate * len(shifts), 2)
    else:
        gross = round(rate * (160 if pay_type == PayTypeEnum.hourly else 20), 2)
        breakdown = [{"label": "Standard period", "amount": gross}]

    deductions = calculate_net(gross, tax_cfg.income_tax, tax_cfg.ni_rate, tax_cfg.tax_threshold)

    payslip = Payslip(
        employee_id=employee_id,
        business_id=business_id,
        period_label=period_label,
        gross=gross,
        income_tax=deductions["income_tax"],
        ni=deductions["ni"],
        net=deductions["net"],
        notes=notes,
        period_start=period_start,
        period_end=period_end,
        breakdown=json.dumps(breakdown),
    )
    db.add(payslip)
    return payslip
