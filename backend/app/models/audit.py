import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

class AuditActionEnum(str, enum.Enum):
    user_created       = "user_created"
    user_deleted       = "user_deleted"
    user_promoted      = "user_promoted"
    holiday_submitted  = "holiday_submitted"
    holiday_approved   = "holiday_approved"
    holiday_rejected   = "holiday_rejected"
    payslip_generated  = "payslip_generated"
    shift_created      = "shift_created"
    shift_deleted      = "shift_deleted"
    tax_config_updated = "tax_config_updated"

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    action: Mapped[AuditActionEnum] = mapped_column(Enum(AuditActionEnum), nullable=False, index=True)

    actor_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    target_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    business_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("businesses.id", ondelete="SET NULL"), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action} actor={self.actor_name}>"