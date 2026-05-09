from datetime import date, datetime
from pydantic import BaseModel, model_validator

from app.models.holiday import HolidayStatusEnum

class CreateHolidayRequest(BaseModel):
    """ Employee submits a holiday request """
    start_date: date
    end_date: date
    reason: str | None = None

    @model_validator(mode="after")
    def end_after_start(self) -> "CreateHolidayRequest":
        """ Ensure end date is not before start date """
        if self.end_date < self.start_date:
            raise ValueError("end date must be on or after start date.")
        return self

class ReviewHolidayRequest(BaseModel):
    """ Manager approves or rejects a holiday request """
    status: HolidayStatusEnum
    review_notes: str | None = None


class HolidayResponse(BaseModel):
    """ Holiday request object returned by the API """
    id: int
    employee_id: int
    employee_name: str | None = None
    business_id: int
    start_date: date
    end_date: date
    reason: str | None = None
    status: HolidayStatusEnum
    reviewed_by_id: int | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_name(cls, req: object) -> "HolidayResponse":
        """ Populate employee_name from the loaded relationship """
        obj = cls.model_validate(req)
        if hasattr(req, "employee") and req.employee:
            obj.employee_name = req.employee.full_name
        return obj