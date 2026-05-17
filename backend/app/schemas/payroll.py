from datetime import datetime
from pydantic import BaseModel

from datetime import datetime, date

from app.models.position import PayTypeEnum

class CreatePayConfigRequest(BaseModel):
    """ Set pay configuration for an employee """
    employee_id: int
    business_id: int
    pay_type: PayTypeEnum
    rate: float
    contract_amount: float | None = None

class UpdatePayConfigRequest(BaseModel):
    """ Partial update, all fields optional """
    pay_type: PayTypeEnum | None = None
    rate: float | None = None
    contract_amount: float | None = None

class PayConfigResponse(BaseModel):
    """ Pay config object returned by the API """
    id: int
    employee_id: int
    business_id: int
    pay_type: PayTypeEnum
    rate: float
    contract_amount: float | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class PayslipResponse(BaseModel):
    """ Payslip object returned by the API """
    id: int
    employee_id: int
    business_id: int
    period_label: str
    gross: float
    income_tax: float
    ni: float
    net: float
    notes: str | None = None
    breakdown: str | None = None
    period_start: date | None = None
    period_end: date | None = None
    created_at: datetime
    model_config = {"from_attributes": True}

class TaxConfigRequest(BaseModel):
    """ Set income tax and NI rates for a business """
    income_tax: float
    ni_rate: float
    tax_threshold: float = 0.0

class TaxConfigResponse(BaseModel):
    """ Tax config object returned by the API """
    id: int
    business_id: int
    income_tax: float
    ni_rate: float
    tax_threshold: float
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class GeneratePayslipRequest(BaseModel):
    employee_id: int
    period_label: str
    period_start: date | None = None
    period_end: date | None = None
    notes: str | None = None