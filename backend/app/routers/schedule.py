from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_manager_permission
from app.core.exceptions import ForbiddenError, NotFoundError
from app.database import get_db
from app.models.audit import AuditActionEnum
from app.models.shift import Shift
from app.models.user import RoleEnum, User
from app.schemas.schedule import CreateShiftRequest, ShiftResponse, UpdateShiftRequest
from app.services.audit import log_action

router = APIRouter(prefix="/schedule", tags=["schedule"])

def _get_shift_or_404(db: Session, shift_id: int) -> Shift:
    shift = db.get(Shift, shift_id)
    if shift is None:
        raise NotFoundError("Shift")
    return shift


@router.get("", response_model=list[ShiftResponse])
def list_shifts(
    business_id: int | None = Query(default=None),
    employee_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    List shifts
    Employees always see only their own shifts
    Admins and managers can filter
    """
    query = db.query(Shift)

    if current_user.role == RoleEnum.employee:
        query = query.filter(Shift.employee_id == current_user.id)
    else:
        if business_id is not None:
            query = query.filter(Shift.business_id == business_id)
        if employee_id is not None:
            query = query.filter(Shift.employee_id == employee_id)

    return query.order_by(Shift.work_date).all()


@router.post("", response_model=ShiftResponse, status_code=201)
def create_shift(
    payload: CreateShiftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_permission("can_manage_schedule")),
):
    """ Create a shift. The creating manager is recorded on the shift """
    manager_id = current_user.id if current_user.role == RoleEnum.manager else None

    shift = Shift(
        employee_id=payload.employee_id,
        business_id=payload.business_id,
        manager_id=manager_id,
        work_date=payload.work_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        notes=payload.notes,
    )
    db.add(shift)
    db.flush()
    log_action(
        db,
        AuditActionEnum.shift_created,
        actor=current_user,
        business_id=payload.business_id,
        details=f"employee_id={payload.employee_id} date={payload.work_date}",
    )
    db.commit()
    db.refresh(shift)
    return shift


@router.get("/{shift_id}", response_model=ShiftResponse)
def get_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """ Fetch a single shift. Employees can only view their own """
    shift = _get_shift_or_404(db, shift_id)
    if current_user.role == RoleEnum.employee and shift.employee_id != current_user.id:
        raise ForbiddenError()
    return shift


@router.patch("/{shift_id}", response_model=ShiftResponse)
def update_shift(
    shift_id: int,
    payload: UpdateShiftRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_manager_permission("can_manage_schedule")),
):
    """ Update shift details """
    shift = _get_shift_or_404(db, shift_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(shift, field, value)
    db.commit()
    db.refresh(shift)
    return shift


@router.delete("/{shift_id}", status_code=204)
def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_permission("can_manage_schedule")),
):
    """ Delete a shift """
    shift = _get_shift_or_404(db, shift_id)
    log_action(
        db,
        AuditActionEnum.shift_deleted,
        actor=current_user,
        business_id=shift.business_id,
        details=f"employee_id={shift.employee_id} date={shift.work_date}",
    )
    db.delete(shift)
    db.commit()