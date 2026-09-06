from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlmodel import Session, or_, select

from app.api.v1._serialize import cert_read, offer_read
from app.core.constants import Audit
from app.core.deps import get_current_user
from app.db.session import get_session
from app.models import AdminUser, Certificate, Document, Intern, OfferLetter, ProgressTask
from app.schemas.intern import InternCreate, InternDetail, InternRead, InternUpdate
from app.schemas.progress import TaskRead
from app.services.audit import log_audit
from app.services.numbering import next_sequence
from app.services.settings_service import get_settings_row
from app.utils.dates import month_label
from app.utils.progress import compute_progress
from app.utils.time import utcnow

router = APIRouter(prefix="/interns", tags=["interns"])


@router.get("", response_model=list[InternRead])
def list_interns(
    q: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_user),
):
    stmt = select(Intern)
    if status_filter:
        stmt = stmt.where(Intern.status == status_filter)
    if q:
        needle = f"%{q}%"
        stmt = stmt.where(
            or_(
                Intern.full_name.ilike(needle),
                Intern.email.ilike(needle),
                Intern.intern_code.ilike(needle),
                Intern.role.ilike(needle),
            )
        )
    stmt = stmt.order_by(Intern.created_at.desc())
    return db.exec(stmt).all()


@router.post("", response_model=InternRead, status_code=status.HTTP_201_CREATED)
def create_intern(
    payload: InternCreate,
    request: Request,
    db: Session = Depends(get_session),
    user: AdminUser = Depends(get_current_user),
):
    existing = db.exec(select(Intern).where(Intern.email == payload.email.lower())).first()
    if existing:
        raise HTTPException(status_code=409, detail="An intern with this email already exists.")

    settings_row = get_settings_row(db)
    code = next_sequence(db, "INT", settings_row.intern_prefix)
    duration = payload.duration_label or month_label(payload.start_date, payload.end_date)

    intern = Intern(
        intern_code=code,
        full_name=payload.full_name,
        email=payload.email.lower(),
        phone=payload.phone,
        college=payload.college,
        course=payload.course,
        role=payload.role,
        department=payload.department,
        start_date=payload.start_date,
        end_date=payload.end_date,
        duration_label=duration,
        reporting_manager=payload.reporting_manager,
        stipend=payload.stipend,
        photo_url=payload.photo_url,
        status=payload.status,
    )
    db.add(intern)
    log_audit(db, action=Audit.CREATE_INTERN, user_id=user.id, entity="Intern", entity_id=intern.id, meta={"code": code}, request=request)
    db.commit()
    db.refresh(intern)
    return intern


@router.get("/{intern_id}", response_model=InternDetail)
def get_intern(intern_id: str, db: Session = Depends(get_session), _: AdminUser = Depends(get_current_user)):
    intern = db.get(Intern, intern_id)
    if not intern:
        raise HTTPException(status_code=404, detail="Intern not found.")

    tasks = db.exec(select(ProgressTask).where(ProgressTask.intern_id == intern_id).order_by(ProgressTask.order_index)).all()
    offers = db.exec(select(OfferLetter).where(OfferLetter.intern_id == intern_id).order_by(OfferLetter.created_at.desc())).all()
    certs = db.exec(select(Certificate).where(Certificate.intern_id == intern_id).order_by(Certificate.created_at.desc())).all()

    base = InternRead.model_validate(intern)
    return InternDetail(
        **base.model_dump(),
        progress=compute_progress(intern.start_date, intern.end_date),
        tasks=[TaskRead.model_validate(t) for t in tasks],
        offer_letters=[offer_read(o, intern.full_name, intern.intern_code) for o in offers],
        certificates=[cert_read(c, intern.full_name, intern.intern_code) for c in certs],
    )


@router.put("/{intern_id}", response_model=InternRead)
def update_intern(
    intern_id: str,
    payload: InternUpdate,
    request: Request,
    db: Session = Depends(get_session),
    user: AdminUser = Depends(get_current_user),
):
    intern = db.get(Intern, intern_id)
    if not intern:
        raise HTTPException(status_code=404, detail="Intern not found.")

    dupe = db.exec(
        select(Intern).where(Intern.email == payload.email.lower(), Intern.id != intern_id)
    ).first()
    if dupe:
        raise HTTPException(status_code=409, detail="Another intern already uses this email.")

    intern.full_name = payload.full_name
    intern.email = payload.email.lower()
    intern.phone = payload.phone
    intern.college = payload.college
    intern.course = payload.course
    intern.role = payload.role
    intern.department = payload.department
    intern.start_date = payload.start_date
    intern.end_date = payload.end_date
    intern.duration_label = payload.duration_label or month_label(payload.start_date, payload.end_date)
    intern.reporting_manager = payload.reporting_manager
    intern.stipend = payload.stipend
    intern.photo_url = payload.photo_url
    intern.status = payload.status
    intern.updated_at = utcnow()
    db.add(intern)
    log_audit(db, action=Audit.UPDATE_INTERN, user_id=user.id, entity="Intern", entity_id=intern.id, request=request)
    db.commit()
    db.refresh(intern)
    return intern


@router.delete("/{intern_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_intern(
    intern_id: str,
    request: Request,
    db: Session = Depends(get_session),
    user: AdminUser = Depends(get_current_user),
):
    intern = db.get(Intern, intern_id)
    if not intern:
        raise HTTPException(status_code=404, detail="Intern not found.")

    # Manual cascade (SQLite FKs are not enforced by default).
    for model in (OfferLetter, Certificate, ProgressTask, Document):
        for row in db.exec(select(model).where(model.intern_id == intern_id)).all():
            db.delete(row)
    db.delete(intern)
    log_audit(db, action=Audit.DELETE_INTERN, user_id=user.id, entity="Intern", entity_id=intern_id, meta={"name": intern.full_name}, request=request)
    db.commit()
    return None
