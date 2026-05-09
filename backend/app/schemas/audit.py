from datetime import datetime
from pydantic import BaseModel

from app.models.audit import AuditActionEnum

class AuditLogResponse(BaseModel):
    """ Audit log entry returned by the API """
    id: int
    action: AuditActionEnum
    actor_id: int | None = None
    actor_name: str | None = None
    target_user_id: int | None = None
    target_name: str | None = None
    business_id: int | None = None
    details: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}