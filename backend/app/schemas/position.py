from datetime import datetime
from pydantic import BaseModel

from app.models.position import PayTypeEnum
from app.schemas.shared import PermissionSchema

class CreatePositionRequest(BaseModel):
    """ Create a new position within a business """
    title: str
    rank: int
    business_id: int
    default_pay_type: PayTypeEnum
    default_rate: float
    default_contract_amount: float
    permissions: PermissionSchema = PermissionSchema()

class UpdatePositionRequest(BaseModel):
    """ Partial update, all fields optional """
    title: str | None = None
    rank: int | None = None
    default_pay_type: PayTypeEnum | None = None
    default_rate: float | None = None
    default_contract_amount: float | None = None
    permissions: PermissionSchema | None = None

class PositionResponse(BaseModel):
    """ Full position object returned by the API """
    id: int
    title: str
    rank: int
    business_id: int
    default_pay_type: PayTypeEnum
    default_rate: float
    default_contract_amount: float
    permissions: PermissionSchema | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}