import enum
from datetime import datetime
from types import SimpleNamespace

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class TitleEnum(str, enum.Enum):
    mr = "Mr"
    mrs = "Mrs"
    ms = "Ms"
    dr = "Dr"
    prof = "Prof"

class RoleEnum(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    employee = "employee"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Personal information
    title: Mapped[TitleEnum] = mapped_column(Enum(TitleEnum), nullable=False)
    first_name: Mapped[str] = mapped_column(String(50), nullable=False)
    last_name: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    dob: Mapped[Date] = mapped_column(Date, nullable=False)

    # Address information
    address_line1: Mapped[str] = mapped_column(String(100), nullable=False)
    address_line2: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address_city: Mapped[str] = mapped_column(String(100), nullable=False)
    address_postcode: Mapped[str] = mapped_column(String(20), nullable=False)
    address_country: Mapped[str] = mapped_column(String(50), nullable=False)

    # Auth
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_first_login: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    temp_password_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Role and assignment
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum), nullable=False)
    business_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("businesses.id", ondelete="SET NULL"), nullable=True)
    section_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True)
    position_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("positions.id", ondelete="SET NULL"), nullable=True)

    # Time
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="employees", foreign_keys=[business_id])
    section: Mapped["Section"] = relationship("Section", back_populates="members")
    position: Mapped["Position"] = relationship("Position", back_populates="holders")
    shifts: Mapped[list["Shift"]] = relationship("Shift", back_populates="employee", foreign_keys="Shift.employee_id", passive_deletes=True)
    managed_shifts: Mapped[list["Shift"]] = relationship("Shift", back_populates="manager", foreign_keys="Shift.manager_id", passive_deletes=True)
    payslips: Mapped[list["Payslip"]] = relationship("Payslip", back_populates="employee", passive_deletes=True)
    pay_config: Mapped["PayConfig | None"] = relationship("PayConfig", back_populates="employee", uselist=False, passive_deletes=True)

    @property
    def full_name(self) -> str:
        return f"{self.title.value} {self.first_name} {self.last_name}"

    @property
    def address(self) -> SimpleNamespace:
        return SimpleNamespace(
            line1=self.address_line1,
            line2=self.address_line2,
            city=self.address_city,
            postcode=self.address_postcode,
            country=self.address_country,
        )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, role={self.role.value})>"
