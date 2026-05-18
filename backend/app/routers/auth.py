from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.dependencies import get_current_active_user
from app.core.exceptions import BadRequestError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    generate_temp_password,
    hash_password,
    validate_password_strength,
    verify_password,
)

from app.database import get_db
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.email import send_forgot_password_email

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Self-service password reset. Generates a temporary password and emails it.
    Always returns the same response to avoid leaking whether an email is registered.
    """
    user = db.query(User).filter(User.email == payload.email).first()

    if user and user.is_active:
        temp_pwd = generate_temp_password()
        expires = datetime.now(timezone.utc) + timedelta(hours=settings.temp_password_ttl_hours)
        user.hashed_password = hash_password(temp_pwd)
        user.is_first_login = True
        user.temp_password_expires_at = expires
        db.commit()

        if settings.debug:
            import logging
            logging.getLogger(__name__).warning(
                "DEV — password reset  email=%s  temp_password=%s", user.email, temp_pwd
            )

        background_tasks.add_task(send_forgot_password_email, user.email, user.full_name, temp_pwd)

    return {"message": "If that email is registered, a temporary password has been sent."}


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user and return JWT tokens.
    Raises 401 if credentials are invalid or account is inactive
    """
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise UnauthorizedError()

    if not user.is_active:
        raise UnauthorizedError("Account is deactivated.")

    if user.is_first_login and user.temp_password_expires_at:
        if datetime.now(timezone.utc) > user.temp_password_expires_at.replace(tzinfo=timezone.utc):
            raise UnauthorizedError("Temporary password has expired. Contact your administrator.")

    return TokenResponse(
        access_token = create_access_token(subject = user.id, extra={"role": user.role}),
        refresh_token = create_refresh_token(subject = user.id),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user)):
    """Return the currently authenticated user's profile."""
    return current_user


@router.post("/change-password", response_model=UserResponse)
def change_password(
    payload:      ChangePasswordRequest,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
):
    """
    Change the current user's password.
    Clears the first-login flag on success.
    """
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise UnauthorizedError("Current password is incorrect.")

    if payload.new_password != payload.confirm_password:
        raise BadRequestError("Passwords do not match.")

    errors = validate_password_strength(payload.new_password)
    if errors:
        raise BadRequestError(errors[0])

    current_user.hashed_password          = hash_password(payload.new_password)
    current_user.is_first_login           = False
    current_user.temp_password_expires_at = None
    db.commit()
    db.refresh(current_user)
    return current_user