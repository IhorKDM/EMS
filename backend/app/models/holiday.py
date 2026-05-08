import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class HolidayStatusEnum(str, enum.Enum):
    pending  = "pending"
    approved = "approved"
    rejected = "rejected"

class HolidayRequest(Base):
    __tablename__ = "holiday_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    business_id: Mapped[int] = mapped_column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(512), nullable=True)

    status: Mapped[HolidayStatusEnum] = mapped_column(Enum(HolidayStatusEnum), default=HolidayStatusEnum.pending, nullable=False)
    reviewed_by_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    review_notes: Mapped[str | None] = mapped_column(String(512), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    employee: Mapped["User"] = relationship("User", foreign_keys=[employee_id], passive_deletes=True)
    reviewer: Mapped["User | None"] = relationship("User", foreign_keys=[reviewed_by_id], passive_deletes=True)

    def __repr__(self) -> str:
        return f"<HolidayRequest id={self.id} employee_id={self.employee_id} status={self.status}>"