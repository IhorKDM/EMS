from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin, require_manager_permission, get_current_active_user
from app.core.exceptions import ConflictError, NotFoundError
from app.database import get_db
from app.models.business import Business
from app.models.section import Section
from app.models.user import User
from app.schemas.business import (
    BusinessResponse,
    CreateBusinessRequest,
    CreateSectionRequest,
    SectionResponse,
    UpdateBusinessRequest,
    UpdateSectionRequest,
)

router = APIRouter(prefix="/business", tags=["business"])


def _get_business_or_404(db: Session, business_id: int) -> Business:
    biz = db.get(Business, business_id)
    if biz is None:
        raise NotFoundError("Business")
    return biz


def _get_section_or_404(db: Session, section_id: int) -> Section:
    section = db.get(Section, section_id)
    if section is None:
        raise NotFoundError("Section")
    return section


@router.get("", response_model=list[BusinessResponse])
def list_businesses(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_active_user),
):
    """ Return all businesses """
    return db.query(Business).all()


@router.post("", response_model=BusinessResponse, status_code=201)
def create_business(
    payload: CreateBusinessRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """ Create a new business """
    if db.query(Business).filter(Business.name == payload.name).first():
        raise ConflictError(f"Business '{payload.name}' already exists.")
    biz = Business(name=payload.name, type=payload.type)
    db.add(biz)
    db.commit()
    db.refresh(biz)
    return biz


@router.get("/{business_id}", response_model=BusinessResponse)
def get_business(
    business_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_active_user),
):
    """ Fetch a single business by id """
    return _get_business_or_404(db, business_id)


@router.patch("/{business_id}", response_model=BusinessResponse)
def update_business(
    business_id: int,
    payload: UpdateBusinessRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """ Partially update a business """
    biz = _get_business_or_404(db, business_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(biz, field, value)
    db.commit()
    db.refresh(biz)
    return biz


@router.delete("/{business_id}", status_code=204)
def delete_business(
    business_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """ Delete a business and all its sections/positions (cascade) """
    biz = _get_business_or_404(db, business_id)
    db.delete(biz)
    db.commit()


@router.get("/{business_id}/sections", response_model=list[SectionResponse])
def list_sections(
    business_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_active_user),
):
    """ List all sections for a business """
    _get_business_or_404(db, business_id)
    return db.query(Section).filter(Section.business_id == business_id).all()


@router.post("/{business_id}/sections", response_model=SectionResponse, status_code=201)
def create_section(
    business_id: int,
    payload: CreateSectionRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_manager_permission("can_manage_sections")),
):
    """ Create a section inside a business """
    _get_business_or_404(db, business_id)
    section = Section(name=payload.name, business_id=business_id)
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.patch("/{business_id}/sections/{section_id}", response_model=SectionResponse)
def update_section(
    business_id: int,
    section_id: int,
    payload: UpdateSectionRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_manager_permission("can_manage_sections")),
):
    """ Update a section name """
    _get_business_or_404(db, business_id)
    section = _get_section_or_404(db, section_id)
    if section.business_id != business_id:
        raise NotFoundError("Section")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(section, field, value)
    db.commit()
    db.refresh(section)
    return section


@router.delete("/{business_id}/sections/{section_id}", status_code=204)
def delete_section(
    business_id: int,
    section_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_manager_permission("can_manage_sections")),
):
    """ Delete a section """
    _get_business_or_404(db, business_id)
    section = _get_section_or_404(db, section_id)
    if section.business_id != business_id:
        raise NotFoundError("Section")
    db.delete(section)
    db.commit()