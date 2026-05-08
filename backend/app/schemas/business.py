from datetime import datetime
from pydantic import BaseModel
from app.models.business import BusinessTypeEnum

class CreateBusinessRequest(BaseModel):
    """ Create a new business """
    name: str
    type: BusinessTypeEnum

class UpdateBusinessRequest(BaseModel):
    """ Partial update, all fields optional """
    name: str | None = None
    type: BusinessTypeEnum | None = None


class BusinessResponse(BaseModel):
    """ Business object returned by the API """
    id: int
    name: str
    type: BusinessTypeEnum
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class CreateSectionRequest(BaseModel):
    """ Create a new section within a business """
    name: str
    business_id: int

class UpdateSectionRequest(BaseModel):
    """ Partial update, all fields optional """
    name: str | None = None


class SectionResponse(BaseModel):
    """ Section object returned by the API """
    id: int
    name: str
    business_id: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}