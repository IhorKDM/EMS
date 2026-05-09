from datetime import date, datetime
from pydantic import BaseModel

class CreateShiftRequest(BaseModel):
    """ Create a new shift for an employee """
    employee_id: int
    business_id: int
    work_date: date
    start_time: str
    end_time: str
    notes: str | None = None

class UpdateShiftRequest(BaseModel):
    """ Partial update, all fields optional """
    work_date: date | None = None
    start_time: str | None = None
    end_time: str | None = None
    notes: str | None = None

class ShiftResponse(BaseModel):
    """ Shift object returned by the API """
    id: int
    business_id: int
    employee_id: int
    manager_id: int | None = None
    work_date: date
    start_time: str
    end_time: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}