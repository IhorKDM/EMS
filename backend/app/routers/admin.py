import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.dependencies import require_admin, require_admin_or_manager, require_manager_permission, get_current_active_user
from app.core.exceptions import AdminLimitError, ConflictError, ForbiddenError, NotFoundError
from app.core.security import generate_temp_password, hash_password
from app.database import get_db
from app.models.audit import AuditActionEnum
from app.models.position import Position
from app.models.user import RoleEnum, User
from app.schemas.user import (
    CreateEmployeeRequest,
    CreateManagerRequest,
    PromoteUserRequest,
    UpdateUserRequest,
    UserListResponse,
    UserResponse,
)

from app.services.audit import log_action
from app.services.email import send_role_change_email, send_welcome_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])
settings = get_settings()


def _get_user_or_404(db: Session, user_id: int) -> User:
    """ Fetch a user by id or raise 404 """
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User")
    return user


def _assert_outranks(actor: User, target_position: "Position | None") -> None:
    """
    Enforce rank hierarchy for non-admins.
    The actor must have a strictly higher rank than the target position.
    Admins always bypass this check.
    """
    if actor.role == RoleEnum.admin:
        return
    my_rank     = actor.position.rank if actor.position else None
    target_rank = target_position.rank if target_position else None
    if my_rank is None or target_rank is None or target_rank >= my_rank:
        raise ForbiddenError(
            "You can only manage users whose position rank is strictly lower than your own."
        )


@router.get("/users", response_model=UserListResponse)
def list_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role != RoleEnum.admin:
        perms = current_user.position.permissions if current_user.position else None
        if not perms or not (perms.can_add_user or perms.can_delete_user):
            raise ForbiddenError()
    users = db.query(User).all()
    return {"users": users, "total": len(users)}

@router.post("/managers", response_model=UserResponse, status_code=201)
async def create_manager(
    payload: CreateManagerRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_manager_permission("can_add_user")),
):
    """ Create a manager account with a temp password and send a welcome email """
    if db.query(User).filter(User.email == payload.email).first():
        raise ConflictError(f"Email '{payload.email}' is already registered.")

    target_position = db.get(Position, payload.position_id)
    if target_position is None:
        raise NotFoundError("Position")
    _assert_outranks(admin, target_position)

    temp_pwd = generate_temp_password()
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.temp_password_ttl_hours)

    user = User(
        title=payload.title,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        dob=payload.dob,
        address_line1=payload.address_line1,
        address_line2=payload.address_line2,
        address_city=payload.address_city,
        address_postcode=payload.address_postcode,
        address_country=payload.address_country,
        hashed_password=hash_password(temp_pwd),
        role=RoleEnum.manager,
        business_id=payload.business_id,
        section_id=payload.section_id,
        position_id=payload.position_id,
        is_first_login=True,
        temp_password_expires_at=expires,
    )
    db.add(user)
    db.flush()
    log_action(
        db,
        AuditActionEnum.user_created,
        actor=admin,
        target=user,
        business_id=user.business_id,
        details="role=manager",
    )
    db.commit()
    db.refresh(user)

    if settings.debug:
        logger.warning("DEV — manager created  email=%s  temp_password=%s", user.email, temp_pwd)

    background_tasks.add_task(send_welcome_email, user.email, user.full_name, temp_pwd)
    return user


@router.post("/employees", response_model=UserResponse, status_code=201)
async def create_employee(
    payload: CreateEmployeeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_manager_permission("can_add_user")),
):
    """ Create an employee account with a temp password and send a welcome email """
    if db.query(User).filter(User.email == payload.email).first():
        raise ConflictError(f"Email '{payload.email}' is already registered.")

    target_position = db.get(Position, payload.position_id)
    if target_position is None:
        raise NotFoundError("Position")
    _assert_outranks(admin, target_position)

    temp_pwd = generate_temp_password()
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.temp_password_ttl_hours)

    user = User(
        title=payload.title,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        dob=payload.dob,
        address_line1=payload.address_line1,
        address_line2=payload.address_line2,
        address_city=payload.address_city,
        address_postcode=payload.address_postcode,
        address_country=payload.address_country,
        hashed_password=hash_password(temp_pwd),
        role=RoleEnum.employee,
        business_id=payload.business_id,
        section_id=payload.section_id,
        position_id=payload.position_id,
        is_first_login=True,
        temp_password_expires_at=expires,
    )
    db.add(user)
    db.flush()
    log_action(
        db,
        AuditActionEnum.user_created,
        actor=admin,
        target=user,
        business_id=user.business_id,
        details="role=employee",
    )
    db.commit()
    db.refresh(user)

    if settings.debug:
        logger.warning("DEV — employee created  email=%s  temp_password=%s", user.email, temp_pwd)

    background_tasks.add_task(send_welcome_email, user.email, user.full_name, temp_pwd)
    return user


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_admin_or_manager),
):
    """ Fetch a single user by id — accessible to all admins and managers """
    return _get_user_or_404(db, user_id)


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_permission("can_add_user")),
):
    """ Partially update user fields. Only supplied fields are changed """
    user = _get_user_or_404(db, user_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_permission("can_delete_user")),
):
    """ Delete a user. A user cannot delete their own account or anyone at/above their rank """
    user = _get_user_or_404(db, user_id)
    if user.id == current_user.id:
        raise ForbiddenError("You cannot delete your own account.")
    _assert_outranks(current_user, user.position)
    log_action(
        db,
        AuditActionEnum.user_deleted,
        actor=current_user,
        target=user,
        business_id=user.business_id,
    )
    db.delete(user)
    db.commit()


@router.post("/users/{user_id}/promote", response_model=UserResponse)
async def promote_user(
    user_id: int,
    payload: PromoteUserRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_manager_permission("can_add_user")),
):
    """ Change a user's role and position. Enforces the max_admins limit and rank hierarchy """
    user = _get_user_or_404(db, user_id)

    if payload.new_role == RoleEnum.admin:
        count = db.query(User).filter(User.role == RoleEnum.admin).count()
        if count >= settings.max_admins:
            raise AdminLimitError(settings.max_admins)

    position = db.get(Position, payload.position_id)
    if position is None:
        raise NotFoundError("Position")

    # Cannot promote someone to a position at or above your own rank
    _assert_outranks(admin, position)
    # Cannot promote someone who is already at or above your rank
    _assert_outranks(admin, user.position)

    user.role = payload.new_role
    user.position_id = payload.position_id
    log_action(
        db,
        AuditActionEnum.user_promoted,
        actor=admin,
        target=user,
        business_id=user.business_id,
        details=f"new_role={payload.new_role.value} position={position.title}",
    )
    db.commit()
    db.refresh(user)

    background_tasks.add_task(
        send_role_change_email,
        user.email,
        user.full_name,
        payload.new_role.value,
        position.title,
    )
    return user