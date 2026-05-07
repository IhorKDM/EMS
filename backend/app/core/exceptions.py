from fastapi import HTTPException, status


class BadRequestError(HTTPException):
    """400 — malformed request or business rule violation."""
    def __init__(self, detail: str = "Bad request."):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class UnauthorizedError(HTTPException):
    """401 — missing or invalid credentials."""
    def __init__(self, detail: str = "Incorrect email or password."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenError(HTTPException):
    """403 — authenticated but not allowed."""
    def __init__(self, detail: str = "You do not have permission to perform this action."):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class NotFoundError(HTTPException):
    """404 — resource not found."""
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found.",
        )


class ConflictError(HTTPException):
    """409 — resource already exists."""
    def __init__(self, detail: str = "Resource already exists."):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class AdminLimitError(HTTPException):
    """403 — maximum number of admins reached."""
    def __init__(self, limit: int):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Maximum number of admins ({limit}) already reached.",
        )