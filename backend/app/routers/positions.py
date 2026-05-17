from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin, require_manager_permission, get_current_active_user
from app.core.exceptions import NotFoundError
from app.database import get_db
from app.models.business import Business
from app.models.permission import Permission
from app.models.position import Position
from app.models.user import User
from app.schemas.position import (
    CreatePositionRequest,
    PositionResponse,
    UpdatePositionRequest,
)

router = APIRouter(prefix="/positions", tags=["positions"])


def _get_position_or_404(db: Session, position_id: int) -> Position:
    position = db.get(Position, position_id)
    if position is None:
        raise NotFoundError("Position")
    return position

@router.get("", response_model=list[PositionResponse])
def list_positions(
    business_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_active_user),
):
    """ List all positions. Pass ?business_id=1 to filter by business """
    query = db.query(Position)
    if business_id is not None:
        query = query.filter(Position.business_id == business_id)
    return query.all()


@router.post("", response_model=PositionResponse, status_code=201)
def create_position(
    payload: CreatePositionRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_manager_permission("can_manage_positions")),
):
    """ Create a position and its permission record together """
    if db.get(Business, payload.business_id) is None:
        raise NotFoundError("Business")

    position = Position(
        title=payload.title,
        rank=payload.rank,
        business_id=payload.business_id,
        default_pay_type=payload.default_pay_type,
        default_rate=payload.default_rate,
        default_contract_amount=payload.default_contract_amount,
    )
    db.add(position)
    db.flush()

    permission = Permission(
        position_id=position.id,
        **payload.permissions.model_dump(),
    )
    db.add(permission)
    db.commit()
    db.refresh(position)
    return position


@router.get("/{position_id}", response_model=PositionResponse)
def get_position(
    position_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_manager_permission("can_manage_positions")),
):
    """ Fetch a single position by id """
    return _get_position_or_404(db, position_id)


@router.patch("/{position_id}", response_model=PositionResponse)
def update_position(
    position_id: int,
    payload: UpdatePositionRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_manager_permission("can_manage_positions")),
):
    """ Update position fields. If permissions are provided, all flags are replaced """
    position = _get_position_or_404(db, position_id)

    # Update scalar fields
    for field, value in payload.model_dump(exclude_none=True, exclude={"permissions"}).items():
        setattr(position, field, value)

    # Replace all permission flags if provided
    if payload.permissions is not None:
        perms = position.permissions
        if perms is None:
            perms = Permission(position_id=position.id)
            db.add(perms)
        for field, value in payload.permissions.model_dump().items():
            setattr(perms, field, value)

    db.commit()
    db.refresh(position)
    return position


@router.delete("/{position_id}", status_code=204)
def delete_position(
    position_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_manager_permission("can_manage_positions")),
):
    """ Delete a position. Its Permission record is cascade-deleted automatically """
    position = _get_position_or_404(db, position_id)
    db.delete(position)
    db.commit()