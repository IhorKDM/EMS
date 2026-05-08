from sqlalchemy import Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    position_id: Mapped[int] = mapped_column(Integer, ForeignKey("positions.id", ondelete="CASCADE"), nullable=False, unique=True)

    can_add_user: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_promote_user: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_delete_user: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_manage_positions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_manage_sections: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_accept_requests: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_manage_schedule: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_view_payroll: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_manage_payroll: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_see_logs: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    position: Mapped["Position"] = relationship("Position", back_populates="permissions")

    def __repr__(self) -> str:
        return f"<Permission(id={self.id}, position_id={self.position_id})>"