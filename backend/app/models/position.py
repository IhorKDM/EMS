import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, Boolean, Float, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class PayTypeEnum(str, enum.Enum):
    hourly = "hourly"
    daily = "daily"
    contract = "contract"

class Position(Base):
    __tablename__ = "positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(50), nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    business_id: Mapped[int] = mapped_column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)

    default_pay_type: Mapped[PayTypeEnum] = mapped_column(Enum(PayTypeEnum), nullable=False)
    default_rate: Mapped[float] = mapped_column(Float, nullable=False)
    default_contract_amount: Mapped[float] = mapped_column(Float, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="positions")
    holders: Mapped[list["User"]] = relationship("User", back_populates="position")
    permissions: Mapped["Permission | None"] = relationship("Permission", back_populates="position", uselist=False, cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Position(id={self.id}, title={self.title}, rank={self.rank}, business_id={self.business_id})>"