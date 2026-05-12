from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_admin, require_manager_permission
from app.core.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from app.database import get_db
from app.models.audit import AuditActionEnum
from app.models.pay_config import PayConfig
from app.models.payslip import Payslip
from app.models.tax_config import BusinessTaxConfig
from app.models.user import RoleEnum, User
from app.schemas.payroll import (
    CreatePayConfigRequest,
    GeneratePayslipRequest,
    PayConfigResponse,
    PayslipResponse,
    TaxConfigRequest,
    TaxConfigResponse,
    UpdatePayConfigRequest,
)

from app.services.audit import log_action
from app.services.payroll import generate_payslip

router = APIRouter(prefix="/payroll", tags=["payroll"])


@router.post("/tax-config", response_model=TaxConfigResponse)
def set_tax_config(
    payload: TaxConfigRequest,
    business_id: int = Query(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """ Create or update the tax config for a business """
    cfg = db.query(BusinessTaxConfig).filter(
        BusinessTaxConfig.business_id == business_id
    ).first()

    if cfg is None:
        cfg = BusinessTaxConfig(
            business_id=business_id,
            income_tax=payload.income_tax,
            ni_rate=payload.ni_rate,
        )
        db.add(cfg)
    else:
        cfg.income_tax = payload.income_tax
        cfg.ni_rate = payload.ni_rate

    log_action(
        db,
        AuditActionEnum.tax_config_updated,
        actor=admin,
        business_id=business_id,
        details=f"income_tax={payload.income_tax} ni_rate={payload.ni_rate}",
    )
    db.commit()
    db.refresh(cfg)
    return cfg


@router.get("/tax-config/{business_id}", response_model=TaxConfigResponse)
def get_tax_config(
    business_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """ Get the tax config for a business """
    cfg = db.query(BusinessTaxConfig).filter(
        BusinessTaxConfig.business_id == business_id
    ).first()
    if cfg is None:
        raise NotFoundError("Tax configuration")
    return cfg


@router.post("/pay-config", response_model=PayConfigResponse, status_code=201)
def create_pay_config(
    payload: CreatePayConfigRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_manager_permission("can_manage_payroll")),
):
    """ Set pay configuration for an employee """
    existing = db.query(PayConfig).filter(
        PayConfig.employee_id == payload.employee_id
    ).first()
    if existing:
        raise ConflictError("Pay config already exists for this employee. Use PATCH to update.")

    cfg = PayConfig(
        employee_id=payload.employee_id,
        business_id=payload.business_id,
        pay_type=payload.pay_type,
        rate=payload.rate,
        contract_amount=payload.contract_amount,
    )
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


@router.get("/pay-config/{employee_id}", response_model=PayConfigResponse)
def get_pay_config(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """ Get an employee's pay config. Employees can only view their own """
    if current_user.role == RoleEnum.employee and current_user.id != employee_id:
        raise ForbiddenError()
    cfg = db.query(PayConfig).filter(PayConfig.employee_id == employee_id).first()
    if cfg is None:
        raise NotFoundError("Pay configuration")
    return cfg


@router.patch("/pay-config/{employee_id}", response_model=PayConfigResponse)
def update_pay_config(
    employee_id: int,
    payload: UpdatePayConfigRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_manager_permission("can_manage_payroll")),
):
    """ Update an employee's pay config """
    cfg = db.query(PayConfig).filter(PayConfig.employee_id == employee_id).first()
    if cfg is None:
        raise NotFoundError("Pay configuration")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(cfg, field, value)
    db.commit()
    db.refresh(cfg)
    return cfg


@router.post("/payslips", response_model=PayslipResponse, status_code=201)
def generate(
    payload: GeneratePayslipRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_permission("can_manage_payroll")),
):
    """ Generate a payslip for an employee for a given period """
    employee = db.get(User, payload.employee_id)
    if employee is None:
        raise NotFoundError("Employee")
    if employee.business_id is None:
        raise BadRequestError("Employee has no business assigned.")

    payslip = generate_payslip(
        db,
        employee_id = payload.employee_id,
        business_id = employee.business_id,
        period_label = payload.period_label,
        notes = payload.notes,
    )
    log_action(
        db,
        AuditActionEnum.payslip_generated,
        actor=current_user,
        business_id = employee.business_id,
        details = f"employee_id={payload.employee_id} period={payload.period_label}",
    )
    db.commit()
    db.refresh(payslip)
    return payslip


@router.get("/payslips", response_model=list[PayslipResponse])
def list_payslips(
    employee_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    List payslips. Employees always see only their own.
    Admins and managers can filter by employee_id.
    """
    query = db.query(Payslip)
    if current_user.role == RoleEnum.employee:
        query = query.filter(Payslip.employee_id == current_user.id)
    elif employee_id is not None:
        query = query.filter(Payslip.employee_id == employee_id)
    return query.order_by(Payslip.created_at.desc()).all()


@router.get("/payslips/{payslip_id}", response_model=PayslipResponse)
def get_payslip(
    payslip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """ Fetch a single payslip. Employees can only view their own """
    payslip = db.get(Payslip, payslip_id)
    if payslip is None:
        raise NotFoundError("Payslip")
    if current_user.role == RoleEnum.employee and payslip.employee_id != current_user.id:
        raise ForbiddenError()
    return payslip