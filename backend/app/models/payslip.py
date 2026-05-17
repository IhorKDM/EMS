from datetime import datetime, date

from sqlalchemy import DateTime, Date, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class Payslip(Base):
    __tablename__ = "payslips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    business_id: Mapped[int] = mapped_column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)

    period_label: Mapped[str] = mapped_column(String(50), nullable=False)
    gross: Mapped[float] = mapped_column(Float, nullable=False)
    income_tax: Mapped[float] = mapped_column(Float, nullable=False)
    ni: Mapped[float] = mapped_column(Float, nullable=False)
    net: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text,  nullable=True)
    period_start: Mapped[date] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    breakdown: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    employee: Mapped["User"] = relationship("User", back_populates="payslips")

    def __repr__(self) -> str:
        return f"<Payslip id={self.id} employee_id={self.employee_id} period={self.period_label}>"