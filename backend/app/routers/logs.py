from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import require_manager_permission
from app.core.exceptions import NotFoundError
from app.database import get_db
from app.models.audit import AuditLog, AuditActionEnum
from app.models.user import User
from app.schemas.audit import AuditLogResponse

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=list[AuditLogResponse])
def list_logs(
    business_id: int | None = Query(default=None),
    action: AuditActionEnum | None = Query(default=None),
    actor_id: int | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    _user: User = Depends(require_manager_permission("can_see_logs")),
):
    """
    List audit log entries, newest first.
    Filterable by business_id, action type, and actor.
    Max 200 entries per request.
    """
    query = db.query(AuditLog)

    if business_id is not None:
        query = query.filter(AuditLog.business_id == business_id)
    if action is not None:
        query = query.filter(AuditLog.action == action)
    if actor_id is not None:
        query = query.filter(AuditLog.actor_id == actor_id)

    return query.order_by(AuditLog.created_at.desc()).limit(limit).all()


@router.get("/{log_id}", response_model=AuditLogResponse)
def get_log(
    log_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_manager_permission("can_see_logs")),
):
    """ Fetch a single audit log entry by id """
    entry = db.get(AuditLog, log_id)
    if entry is None:
        raise NotFoundError("Log entry")
    return entry