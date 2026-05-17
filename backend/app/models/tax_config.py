from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

class BusinessTaxConfig(Base):
    __tablename__ = "business_tax_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, unique=True)
    income_tax: Mapped[float] = mapped_column(Float, nullable=False, default=0.20)
    ni_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.12)
    tax_threshold: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<BusinessTaxConfig business_id={self.business_id}>"