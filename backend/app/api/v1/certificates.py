from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlmodel import Session, select

from app.api.v1._serialize import cert_read
from app.core.config import settings
from app.core.constants import Audit
from app.core.deps import get_current_user
from app.db.session import get_session
from app.models import AdminUser, Certificate, Document, Intern, Setting, Template
from app.schemas.common import OkResponse
from app.schemas.document import CertCreate, CertRead
from app.services.audit import document_history, log_audit
from app.services.email import build_certificate_email, send_email
from app.services.numbering import next_sequence
from app.services.pdf_certificate import build_certificate_pdf, default_certificate_text
from app.services.settings_service import get_settings_row
from app.services.verification import generate_verification_token, hash_token, verification_stats
from app.utils.time import utcnow

router = APIRouter(prefix="/certificates", tags=["certificates"])


def _send_certificate_email(
    db: Session, cert: Certificate, intern: Intern, settings_row: Setting, request: Request, user: AdminUser
) -> None:
    """Builds the PDF + email and attempts to send it. Never raises — any
    failure (including SMTP not being configured) is recorded on the
    certificate instead, so issuing a document never fails because of email."""
    try:
        verify_url = f"{settings.app_url}/verify/{cert.verification_token}"
        template = db.exec(select(Template).where(Template.type == "CERTIFICATE", Template.key == cert.template_key)).first()
        pdf_bytes = build_certificate_pdf(cert, intern, settings_row, verify_url, template)
        subject, html, text = build_certificate_email(cert, intern, settings_row)
        attachments = [(f"{cert.number}.pdf", pdf_bytes, "pdf")] if settings_row.cert_email_attach_pdf else []
        send_email(intern.email, subject, html, text, attachments)
    except Exception as e:  # EmailNotConfiguredError, missing/invalid address, smtplib/OSError, etc.
        cert.email_status = "FAILED"
        cert.email_error = str(e)
        db.add(cert)
        log_audit(db, action=Audit.EMAIL_SEND_FAILED, user_id=user.id, entity="Certificate", entity_id=cert.id, meta={"error": str(e)}, request=request)
        return

    cert.email_status = "SENT"
    cert.email_sent_at = utcnow()
    cert.email_recipient = intern.email
    cert.email_error = None
    db.add(cert)
    log_audit(db, action=Audit.SEND_CERT_EMAIL, user_id=user.id, entity="Certificate", entity_id=cert.id, meta={"to": intern.email}, request=request)


@router.get("", response_model=list[CertRead])
def list_certificates(db: Session = Depends(get_session), _: AdminUser = Depends(get_current_user)):
    certs = db.exec(select(Certificate).order_by(Certificate.created_at.desc())).all()
    intern_ids = {c.intern_id for c in certs}
    interns = {i.id: i for i in db.exec(select(Intern).where(Intern.id.in_(intern_ids))).all()} if intern_ids else {}
    stats = verification_stats(db, (c.id for c in certs))
    return [
        cert_read(
            c, interns[c.intern_id].full_name if c.intern_id in interns else None,
            interns[c.intern_id].intern_code if c.intern_id in interns else None,
            *stats.get(c.id, (0, None)),
        )
        for c in certs
    ]


@router.post("", response_model=CertRead, status_code=status.HTTP_201_CREATED)
def create_certificate(
    payload: CertCreate,
    request: Request,
    db: Session = Depends(get_session),
    user: AdminUser = Depends(get_current_user),
):
    intern = db.get(Intern, payload.intern_id)
    if not intern:
        raise HTTPException(status_code=404, detail="Selected intern no longer exists.")

    settings_row = get_settings_row(db)
    number = next_sequence(db, "CERT", settings_row.cert_prefix)
    token = generate_verification_token()

    cert = Certificate(
        number=number,
        verification_token=token,
        verification_token_hash=hash_token(token),
        intern_id=payload.intern_id,
        template_key=payload.template_key,
        certificate_type=payload.certificate_type,
        title=payload.title,
        role=payload.role,
        department=payload.department,
        duration_label=payload.duration_label,
        work_mode=payload.work_mode,
        start_date=payload.start_date,
        end_date=payload.end_date,
        performance_rating=payload.performance_rating,
        skills=payload.skills,
        remarks=payload.remarks,
        expires_at=payload.expires_at,
        authorized_name=payload.authorized_name,
        authorized_designation=payload.authorized_designation,
    )
    # Blank certificate_text -> auto-generate from the fields above (mirrors
    # the admin-editable-but-prefilled pattern used for offer compensation text).
    cert.certificate_text = payload.certificate_text or default_certificate_text(cert, intern, settings_row)
    db.add(cert)
    db.add(Document(intern_id=intern.id, type="CERTIFICATE", title=f"Certificate — {intern.full_name}", ref_id=cert.id))
    log_audit(db, action=Audit.GENERATE_CERTIFICATE, user_id=user.id, entity="Certificate", entity_id=cert.id, meta={"number": number}, request=request)
    db.commit()
    db.refresh(cert)
    return cert_read(cert, intern.full_name, intern.intern_code)


@router.get("/{cert_id}", response_model=CertRead)
def get_certificate(cert_id: str, db: Session = Depends(get_session), _: AdminUser = Depends(get_current_user)):
    cert = db.get(Certificate, cert_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found.")
    intern = db.get(Intern, cert.intern_id)
    count, last = verification_stats(db, [cert.id]).get(cert.id, (0, None))
    history = document_history(db, cert.id)
    return cert_read(cert, intern.full_name if intern else None, intern.intern_code if intern else None, count, last, history)


@router.post("/{cert_id}/issue", response_model=CertRead)
def issue_certificate(cert_id: str, request: Request, db: Session = Depends(get_session), user: AdminUser = Depends(get_current_user)):
    cert = db.get(Certificate, cert_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found.")
    if cert.status != "DRAFT":
        raise HTTPException(status_code=400, detail="Only draft certificates can be issued.")

    intern = db.get(Intern, cert.intern_id)
    if not intern:
        raise HTTPException(status_code=404, detail="Intern not found.")
    settings_row = get_settings_row(db)

    cert.status = "VALID"
    db.add(cert)
    log_audit(db, action=Audit.ISSUE_CERTIFICATE, user_id=user.id, entity="Certificate", entity_id=cert.id, meta={"number": cert.number}, request=request)

    if settings_row.cert_email_auto_send:
        _send_certificate_email(db, cert, intern, settings_row, request, user)

    db.commit()
    db.refresh(cert)
    count, last = verification_stats(db, [cert.id]).get(cert.id, (0, None))
    return cert_read(cert, intern.full_name, intern.intern_code, count, last, document_history(db, cert.id))


@router.post("/{cert_id}/send-email", response_model=CertRead)
def send_certificate_email(cert_id: str, request: Request, db: Session = Depends(get_session), user: AdminUser = Depends(get_current_user)):
    cert = db.get(Certificate, cert_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found.")
    if cert.status in ("DRAFT", "REVOKED"):
        raise HTTPException(status_code=400, detail="Only issued, non-revoked certificates can be emailed.")

    intern = db.get(Intern, cert.intern_id)
    if not intern:
        raise HTTPException(status_code=404, detail="Intern not found.")
    settings_row = get_settings_row(db)

    _send_certificate_email(db, cert, intern, settings_row, request, user)
    db.commit()
    db.refresh(cert)
    count, last = verification_stats(db, [cert.id]).get(cert.id, (0, None))
    return cert_read(cert, intern.full_name, intern.intern_code, count, last, document_history(db, cert.id))


def _set_status(cert_id: str, new_status: str, action: str, request: Request, db: Session, user: AdminUser):
    cert = db.get(Certificate, cert_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found.")
    cert.status = new_status
    db.add(cert)
    log_audit(db, action=action, user_id=user.id, entity="Certificate", entity_id=cert.id, request=request)
    db.commit()
    return OkResponse()


@router.post("/{cert_id}/revoke", response_model=OkResponse)
def revoke_certificate(cert_id: str, request: Request, db: Session = Depends(get_session), user: AdminUser = Depends(get_current_user)):
    return _set_status(cert_id, "REVOKED", Audit.REVOKE_CERTIFICATE, request, db, user)


@router.post("/{cert_id}/reinstate", response_model=OkResponse)
def reinstate_certificate(cert_id: str, request: Request, db: Session = Depends(get_session), user: AdminUser = Depends(get_current_user)):
    return _set_status(cert_id, "VALID", Audit.REVOKE_CERTIFICATE, request, db, user)


@router.get("/{cert_id}/pdf")
def certificate_pdf(cert_id: str, request: Request, db: Session = Depends(get_session), user: AdminUser = Depends(get_current_user)):
    cert = db.get(Certificate, cert_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found.")
    intern = db.get(Intern, cert.intern_id)
    if not intern:
        raise HTTPException(status_code=404, detail="Intern not found.")
    settings_row = get_settings_row(db)
    verify_url = f"{settings.app_url}/verify/{cert.verification_token}"
    template = db.exec(select(Template).where(Template.type == "CERTIFICATE", Template.key == cert.template_key)).first()

    pdf = build_certificate_pdf(cert, intern, settings_row, verify_url, template)
    log_audit(db, action=Audit.DOWNLOAD_CERTIFICATE, user_id=user.id, entity="Certificate", entity_id=cert.id, request=request)
    db.commit()
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{cert.number}.pdf"',
            "Cache-Control": "private, no-store",
        },
    )
