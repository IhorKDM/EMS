from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_manager_permission
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.database import get_db
from app.models.audit import AuditActionEnum
from app.models.holiday import HolidayRequest, HolidayStatusEnum
from app.models.user import RoleEnum, User
from app.schemas.holiday import CreateHolidayRequest, HolidayResponse, ReviewHolidayRequest
from app.services.audit import log_action

router = APIRouter(prefix="/holidays", tags=["holidays"])


def _get_holiday_or_404(db: Session, holiday_id: int) -> HolidayRequest:
    req = db.get(HolidayRequest, holiday_id)
    if req is None:
        raise NotFoundError("Holiday request")
    return req


@router.post("", response_model=HolidayResponse, status_code=201)
def submit_holiday(
    payload: CreateHolidayRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """ Any authenticated employee can submit a holiday request """
    if current_user.business_id is None:
        raise BadRequestError("You must belong to a business to submit a holiday request.")

    req = HolidayRequest(
        employee_id=current_user.id,
        business_id=current_user.business_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
        status=HolidayStatusEnum.pending,
    )
    db.add(req)
    db.flush()
    log_action(
        db,
        AuditActionEnum.holiday_submitted,
        actor=current_user,
        business_id=current_user.business_id,
        details=f"start={payload.start_date} end={payload.end_date}",
    )
    db.commit()
    db.refresh(req)
    return HolidayResponse.from_orm_with_name(req)


@router.get("", response_model=list[HolidayResponse])
def list_holidays(
    employee_id: int | None = Query(default=None),
    status: HolidayStatusEnum | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    List holiday requests.
    Employees always see only their own.
    Managers and admins can filter by employee_id or status.
    """
    query = db.query(HolidayRequest)

    if current_user.role == RoleEnum.employee:
        query = query.filter(HolidayRequest.employee_id == current_user.id)
    else:
        if employee_id is not None:
            query = query.filter(HolidayRequest.employee_id == employee_id)
        if status is not None:
            query = query.filter(HolidayRequest.status == status)

    requests = query.order_by(HolidayRequest.created_at.desc()).all()
    return [HolidayResponse.from_orm_with_name(r) for r in requests]


@router.get("/{holiday_id}", response_model=HolidayResponse)
def get_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """ Fetch a single holiday request. Employees can only view their own """
    req = _get_holiday_or_404(db, holiday_id)
    if current_user.role == RoleEnum.employee and req.employee_id != current_user.id:
        raise ForbiddenError()
    return HolidayResponse.from_orm_with_name(req)


@router.post("/{holiday_id}/review", response_model=HolidayResponse)
def review_holiday(
    holiday_id: int,
    payload: ReviewHolidayRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_permission("can_accept_requests")),
):
    """ Approve or reject a pending holiday request """
    req = _get_holiday_or_404(db, holiday_id)

    if req.status != HolidayStatusEnum.pending:
        raise BadRequestError("Only pending requests can be reviewed.")

    if payload.status == HolidayStatusEnum.pending:
        raise BadRequestError("Review status must be approved or rejected.")

    req.status = payload.status
    req.reviewed_by_id = current_user.id
    req.reviewed_at = datetime.now(timezone.utc)
    req.review_notes = payload.review_notes

    action = (
        AuditActionEnum.holiday_approved
        if payload.status == HolidayStatusEnum.approved
        else AuditActionEnum.holiday_rejected
    )
    log_action(
        db,
        action,
        actor=current_user,
        business_id=req.business_id,
        details=f"holiday_id={req.id} employee_id={req.employee_id}",
    )
    db.commit()
    db.refresh(req)
    return HolidayResponse.from_orm_with_name(req)