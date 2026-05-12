from sqlalchemy.orm import Session
from app.models.audit import AuditLog, AuditActionEnum

def log_action(
    db: Session,
    action: AuditActionEnum,
    actor = None,
    target = None,
    business_id: int | None = None,
    details: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        action = action,
        actor_id = actor.id if actor  else None,
        actor_name = actor.full_name if actor  else None,
        target_user_id = target.id if target else None,
        target_name = target.full_name if target else None,
        business_id = business_id,
        details = details,
    )
    db.add(entry)
    return entry