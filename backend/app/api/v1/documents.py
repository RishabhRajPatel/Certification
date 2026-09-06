from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_session
from app.models import AdminUser, Certificate, Document, Intern, OfferLetter
from app.schemas.document import DocumentRead

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=list[DocumentRead])
def list_documents(
    type: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_user),
):
    want = (type or "ALL").upper()

    offers = db.exec(select(OfferLetter)).all() if want in ("ALL", "OFFER") else []
    certs = db.exec(select(Certificate)).all() if want in ("ALL", "CERTIFICATE") else []
    others = db.exec(select(Document).where(Document.type == "OTHER")).all() if want in ("ALL", "OTHER") else []

    intern_ids = {o.intern_id for o in offers} | {c.intern_id for c in certs} | {d.intern_id for d in others if d.intern_id}
    interns = {i.id: i for i in db.exec(select(Intern).where(Intern.id.in_(intern_ids))).all()} if intern_ids else {}

    def name_of(intern_id: Optional[str]) -> Optional[str]:
        return interns[intern_id].full_name if intern_id in interns else None

    items: list[DocumentRead] = []
    for o in offers:
        items.append(DocumentRead(
            id=o.id, type="OFFER", title=f"Offer Letter · {o.position}",
            number=o.number, intern_id=o.intern_id, intern_name=name_of(o.intern_id),
            status=o.status, date=o.issue_date, download_url=f"/api/v1/offers/{o.id}/pdf",
        ))

    for c in certs:
        items.append(DocumentRead(
            id=c.id, type="CERTIFICATE", title=c.title,
            number=c.number, intern_id=c.intern_id, intern_name=name_of(c.intern_id),
            status=c.status, date=c.issue_date, download_url=f"/api/v1/certificates/{c.id}/pdf",
            verify_url=f"{settings.app_url}/verify/{c.verification_token}" if c.status != "DRAFT" else None,
        ))

    for d in others:
        items.append(DocumentRead(
            id=d.id, type="OTHER", title=d.title, intern_id=d.intern_id,
            intern_name=name_of(d.intern_id), status=d.status, date=d.created_at,
            download_url=d.file_url,
        ))

    items.sort(key=lambda x: x.date, reverse=True)

    if q:
        needle = q.lower()
        items = [
            d for d in items
            if needle in d.title.lower()
            or (d.number or "").lower().find(needle) >= 0
            or (d.intern_name or "").lower().find(needle) >= 0
        ]
    return items
