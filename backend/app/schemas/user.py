from datetime import date, datetime
from pydantic import BaseModel, EmailStr
from app.models.user import RoleEnum, TitleEnum


class AddressSchema(BaseModel):
    """ Address object in responses """
    line1: str
    line2: str | None = None
    city: str
    postal_code: str
    country: str

class PermissionBriefResponse(BaseModel):
    """ Permission flags embedded in position response """
    can_add_user: bool = False
    can_promote_user: bool = False
    can_delete_user: bool = False
    can_manage_positions: bool = False
    can_manage_sections: bool = False
    can_accept_requests: bool = False
    can_manage_schedule: bool = False
    can_view_payroll: bool = False
    can_manage_payroll: bool = False
    can_see_logs: bool = False
    model_config = {"from_attributes": True}

class PositionBriefResponse(BaseModel):
    """ Position summary embedded in UserResponse """
    id: int
    title: str
    rank: int
    permissions: PermissionBriefResponse | None = None
    model_config = {"from_attributes": True}

class UserResponse(BaseModel):
    """ Full user object returned by the API """
    id: int
    title: TitleEnum
    first_name: str
    last_name: str
    email: EmailStr
    dob: date
    address: AddressSchema | None = None
    role: RoleEnum
    business_id: int | None = None
    section_id: int | None = None
    position_id: int | None = None
    position: PositionBriefResponse | None = None
    is_active: bool
    is_first_login: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class CreateUserBase(BaseModel):
    """ Shared fields for creating any user """
    title: TitleEnum
    first_name: str
    last_name: str
    email: EmailStr
    dob: date
    address_line1: str
    address_line2: str | None = None
    address_city: str
    address_postal_code: str
    address_country: str
    business_id: int
    section_id: int | None = None
    position_id: int


class CreateManagerRequest(CreateUserBase):
    """ Admin creates a manager account """
    pass


class CreateEmployeeRequest(CreateUserBase):
    """ Manager or admin creates an employee account """
    pass

class UpdateUserRequest(BaseModel):
    """ Partial update, all fields optional """
    title: TitleEnum  | None = None
    first_name: str | None = None
    last_name: str | None = None
    dob: date | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    address_city: str | None = None
    address_postal_code: str | None = None
    address_country: str | None = None


class PromoteUserRequest(BaseModel):
    """ Admin promotes a user to a new role and position """
    new_role: RoleEnum
    position_id: int


class PromotePositionRequest(BaseModel):
    """ Manager promotes an employee to a new position """
    position_id: int


class UserListResponse(BaseModel):
    """ Paginated user list """
    total: int
    users: list[UserResponse]