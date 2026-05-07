import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class BusinessTypeEnum(str, enum.Enum):
    office = "office"
    retail = "retail"
    warehouse = "warehouse"
    restaurant = "restaurant"
    other = "other"

class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[BusinessTypeEnum] = mapped_column(Enum(BusinessTypeEnum), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


    # Relationships
    employees: Mapped[list["User"]] = relationship("User", back_populates="business", foreign_keys="User.business_id")
    sections: Mapped[list["Section"]] = relationship("Section", back_populates="business", cascade="all, delete-orphan")
    positions: Mapped[list["Position"]] = relationship("Position", back_populates="business", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Business(id={self.id}, name={self.name})>"