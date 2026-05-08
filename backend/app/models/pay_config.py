from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.position import PayTypeEnum


class PayConfig(Base):
    __tablename__ = "pay_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    business_id: Mapped[int] = mapped_column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)

    pay_type: Mapped[PayTypeEnum] = mapped_column(Enum(PayTypeEnum), nullable=False)
    rate: Mapped[float] = mapped_column(Float, nullable=False)
    contract_amount: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    employee: Mapped["User"] = relationship("User", back_populates="pay_config")

    def __repr__(self) -> str:
        return f"<PayConfig employee_id={self.employee_id} type={self.pay_type}>"