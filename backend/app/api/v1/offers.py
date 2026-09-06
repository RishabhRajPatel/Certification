from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlmodel import Session, select

from app.api.v1._serialize import offer_read
from app.core.constants import Audit
from app.core.deps import get_current_user
from app.db.session import get_session
from app.models import AdminUser, Document, Intern, OfferLetter, Setting, Template
from app.schemas.document import OfferCreate, OfferRead
from app.schemas.common import OkResponse
from app.services.audit import document_history, log_audit
from app.services.email import build_offer_email, send_email
from app.services.numbering import next_sequence
from app.services.pdf_offer import build_offer_pdf
from app.services.settings_service import get_settings_row
from app.utils.time import utcnow

router = APIRouter(prefix="/offers", tags=["offers"])


def _send_offer_email(
    db: Session, offer: OfferLetter, intern: Intern, settings_row: Setting, request: Request, user: AdminUser
) -> None:
    """Mirrors _send_certificate_email in certificates.py — never raises,
    records success/failure on the offer letter instead."""
    try:
        template = db.exec(select(Template).where(Template.type == "OFFER", Template.key == offer.template_key)).first()
        pdf_bytes = build_offer_pdf(offer, intern, settings_row, template)
        subject, html, text = build_offer_email(offer, intern, settings_row)
        attachments = [(f"{offer.number}.pdf", pdf_bytes, "pdf")] if settings_row.offer_email_attach_pdf else []
        send_email(intern.email, subject, html, text, attachments)
    except Exception as e:
        offer.email_status = "FAILED"
        offer.email_error = str(e)
        db.add(offer)
        log_audit(db, action=Audit.EMAIL_SEND_FAILED, user_id=user.id, entity="OfferLetter", entity_id=offer.id, meta={"error": str(e)}, request=request)
        return

    offer.email_status = "SENT"
    offer.email_sent_at = utcnow()
    offer.email_recipient = intern.email
    offer.email_error = None
    db.add(offer)
    log_audit(db, action=Audit.SEND_OFFER_EMAIL, user_id=user.id, entity="OfferLetter", entity_id=offer.id, meta={"to": intern.email}, request=request)


@router.get("", response_model=list[OfferRead])
def list_offers(db: Session = Depends(get_session), _: AdminUser = Depends(get_current_user)):
    offers = db.exec(select(OfferLetter).order_by(OfferLetter.created_at.desc())).all()
    intern_ids = {o.intern_id for o in offers}
    interns = {i.id: i for i in db.exec(select(Intern).where(Intern.id.in_(intern_ids))).all()} if intern_ids else {}
    return [
        offer_read(o, interns[o.intern_id].full_name if o.intern_id in interns else None,
                   interns[o.intern_id].intern_code if o.intern_id in interns else None)
        for o in offers
    ]


@router.post("", response_model=OfferRead, status_code=status.HTTP_201_CREATED)
def create_offer(
    payload: OfferCreate,
    request: Request,
    db: Session = Depends(get_session),
    user: AdminUser = Depends(get_current_user),
):
    intern = db.get(Intern, payload.intern_id)
    if not intern:
        raise HTTPException(status_code=404, detail="Selected intern no longer exists.")

    settings_row = get_settings_row(db)
    number = next_sequence(db, "OFFER", settings_row.letter_prefix)

    offer = OfferLetter(
        number=number,
        intern_id=payload.intern_id,
        template_key=payload.template_key,
        position=payload.position,
        department=payload.department,
        duration_label=payload.duration_label,
        joining_date=payload.joining_date,
        compensation_type=payload.compensation_type,
        stipend=payload.stipend,
        performance_criteria=payload.performance_criteria,
        evaluation_frequency=payload.evaluation_frequency,
        authorized_name=payload.authorized_name,
        authorized_designation=payload.authorized_designation,
        terms=payload.terms,
    )
    db.add(offer)
    db.add(Document(intern_id=intern.id, type="OFFER", title=f"Offer Letter — {intern.full_name}", ref_id=offer.id))
    log_audit(db, action=Audit.GENERATE_OFFER, user_id=user.id, entity="OfferLetter", entity_id=offer.id, meta={"number": number}, request=request)
    db.commit()
    db.refresh(offer)
    return offer_read(offer, intern.full_name, intern.intern_code)


@router.get("/{offer_id}", response_model=OfferRead)
def get_offer(offer_id: str, db: Session = Depends(get_session), _: AdminUser = Depends(get_current_user)):
    offer = db.get(OfferLetter, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer letter not found.")
    intern = db.get(Intern, offer.intern_id)
    history = document_history(db, offer.id)
    return offer_read(offer, intern.full_name if intern else None, intern.intern_code if intern else None, history)


@router.post("/{offer_id}/issue", response_model=OfferRead)
def issue_offer(offer_id: str, request: Request, db: Session = Depends(get_session), user: AdminUser = Depends(get_current_user)):
    offer = db.get(OfferLetter, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer letter not found.")
    if offer.status != "DRAFT":
        raise HTTPException(status_code=400, detail="Only draft offer letters can be issued.")

    intern = db.get(Intern, offer.intern_id)
    if not intern:
        raise HTTPException(status_code=404, detail="Intern not found.")
    settings_row = get_settings_row(db)

    offer.status = "GENERATED"
    db.add(offer)
    log_audit(db, action=Audit.ISSUE_OFFER, user_id=user.id, entity="OfferLetter", entity_id=offer.id, meta={"number": offer.number}, request=request)

    if settings_row.offer_email_auto_send:
        _send_offer_email(db, offer, intern, settings_row, request, user)

    db.commit()
    db.refresh(offer)
    return offer_read(offer, intern.full_name, intern.intern_code, document_history(db, offer.id))


@router.post("/{offer_id}/send-email", response_model=OfferRead)
def send_offer_email(offer_id: str, request: Request, db: Session = Depends(get_session), user: AdminUser = Depends(get_current_user)):
    offer = db.get(OfferLetter, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer letter not found.")
    if offer.status in ("DRAFT", "VOID"):
        raise HTTPException(status_code=400, detail="Only issued, non-void offer letters can be emailed.")

    intern = db.get(Intern, offer.intern_id)
    if not intern:
        raise HTTPException(status_code=404, detail="Intern not found.")
    settings_row = get_settings_row(db)

    _send_offer_email(db, offer, intern, settings_row, request, user)
    db.commit()
    db.refresh(offer)
    return offer_read(offer, intern.full_name, intern.intern_code, document_history(db, offer.id))


@router.post("/{offer_id}/void", response_model=OkResponse)
def void_offer(offer_id: str, request: Request, db: Session = Depends(get_session), user: AdminUser = Depends(get_current_user)):
    offer = db.get(OfferLetter, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer letter not found.")
    offer.status = "VOID"
    db.add(offer)
    log_audit(db, action=Audit.VOID_OFFER, user_id=user.id, entity="OfferLetter", entity_id=offer.id, request=request)
    db.commit()
    return OkResponse()


@router.get("/{offer_id}/pdf")
def offer_pdf(offer_id: str, request: Request, db: Session = Depends(get_session), user: AdminUser = Depends(get_current_user)):
    offer = db.get(OfferLetter, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer letter not found.")
    intern = db.get(Intern, offer.intern_id)
    if not intern:
        raise HTTPException(status_code=404, detail="Intern not found.")
    settings_row = get_settings_row(db)
    template = db.exec(select(Template).where(Template.type == "OFFER", Template.key == offer.template_key)).first()

    pdf = build_offer_pdf(offer, intern, settings_row, template)
    log_audit(db, action=Audit.DOWNLOAD_OFFER, user_id=user.id, entity="OfferLetter", entity_id=offer.id, request=request)
    db.commit()
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{offer.number}.pdf"',
            "Cache-Control": "private, no-store",
        },
    )
