from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(
    token: str     = Depends(oauth2_scheme),
    db:    Session = Depends(get_db),
):
    """ Extract user from JWT token. Raises 401 if token is invalid """
    from app.models.user import User

    try:
        payload = decode_token(token)
    except JWTError:
        raise UnauthorizedError("Invalid or expired token.")

    user_id = int(payload.get("sub", 0))
    user = db.get(User, user_id)
    if user is None:
        raise UnauthorizedError("User not found.")
    return user

def get_current_active_user(user=Depends(get_current_user)):
    """ Ensures the user account is active. Raises 401 if deactivated """
    if not user.is_active:
        raise UnauthorizedError("Account is deactivated.")
    return user

def require_admin(user=Depends(get_current_active_user)):
    """ Allows only admin users. Raises 403 for everyone else ga"""
    from app.models.user import RoleEnum

    if user.role != RoleEnum.admin:
        raise ForbiddenError()
    return user


def require_manager_permission(perm_name: str):
    """
    Factory that returns a dependency allowing admins and managers
    who have a specific permission flag set on their position
    """
    def _checker(user=Depends(get_current_active_user)):
        from app.models.user import RoleEnum

        if user.role == RoleEnum.admin:
            return user
        if user.role == RoleEnum.manager:
            perms = user.position.permissions if user.position else None
            if perms and getattr(perms, perm_name, False):
                return user
        raise ForbiddenError()
    return _checker