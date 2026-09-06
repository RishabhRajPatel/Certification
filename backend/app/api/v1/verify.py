from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from app.core.constants import Audit
from app.core.deps import client_meta
from app.core.rate_limit import check_rate_limit
from app.db.session import get_session
from app.models import Certificate, Intern
from app.schemas.document import VerifyResponse
from app.services.audit import log_audit
from app.services.settings_service import get_settings_row
from app.services.verification import hash_token
from app.utils.time import utcnow

# PUBLIC router — no authentication dependency. This is the QR target.
router = APIRouter(prefix="/verify", tags=["verify (public)"])

# Real tokens are ~22 chars (secrets.token_urlsafe(16)). Anything wildly
# longer is junk/abuse input — reject before touching the DB or the log.
MAX_CODE_LENGTH = 128


@router.get("/{code}", response_model=VerifyResponse)
def verify_certificate(code: str, request: Request, db: Session = Depends(get_session)):
    ip, _ = client_meta(request)

    allowed, retry = check_rate_limit(f"verify:{ip}", limit=30, window_seconds=60)
    if not allowed:
        log_audit(db, action=Audit.VERIFY_RATE_LIMITED, entity="Certificate", request=request)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many verification requests. Try again in {retry}s.",
            headers={"Retry-After": str(retry)},
        )

    # Input validation: malformed/oversized input can't match a real token —
    # short-circuit before hashing or hitting the DB, no different a response
    # than any other not-found lookup (no behavioral tell for attackers).
    cert = None
    if code and len(code) <= MAX_CODE_LENGTH:
        # Lookup is by the token's hash, never by the human-readable `number` —
        # `number` is sequential and would let an enumeration attack dump every
        # certificate's public data. See services/verification.py.
        cert = db.exec(select(Certificate).where(Certificate.verification_token_hash == hash_token(code))).first()
        if cert and cert.status == "DRAFT":
            # Not yet issued — the candidate hasn't received this token, and a
            # draft shouldn't be publicly verifiable. Treat exactly like unknown.
            cert = None

    if not cert:
        log_audit(db, action=Audit.VERIFY_ATTEMPT, entity="Certificate", meta={"result": "NOT_FOUND"}, request=request)
        db.commit()
        return VerifyResponse(
            valid=False, status="NOT_FOUND", number=code[:64],
            message="No certificate found with this ID.",
        )

    intern = db.get(Intern, cert.intern_id)
    settings_row = get_settings_row(db)

    # Server-computed effective status — REVOKED wins over EXPIRED (an admin
    # revoking a lapsed certificate should still read as REVOKED), everything
    # else falls back to VALID. Never trust the requester's input for this.
    if cert.status == "REVOKED":
        effective_status = "REVOKED"
    elif cert.expires_at and cert.expires_at < utcnow():
        effective_status = "EXPIRED"
    else:
        effective_status = "VALID"

    messages = {
        "REVOKED": "This certificate has been revoked and is no longer valid.",
        "EXPIRED": "This certificate has expired and is no longer valid for verification purposes.",
        "VALID": "This certificate is valid and authentic.",
    }

    log_audit(
        db, action=Audit.VERIFY_ATTEMPT, entity="Certificate", entity_id=cert.id,
        meta={"result": effective_status}, request=request,
    )
    db.commit()

    return VerifyResponse(
        valid=effective_status == "VALID",
        status=effective_status,
        number=cert.number,
        message=messages[effective_status],
        title=cert.title,
        intern_name=intern.full_name if intern else None,
        role=cert.role,
        department=cert.department,
        duration_label=cert.duration_label,
        start_date=cert.start_date,
        end_date=cert.end_date,
        issue_date=cert.issue_date,
        expires_at=cert.expires_at,
        company_name=settings_row.company_name,
        company_logo_url=settings_row.company_logo_url,
        authorized_name=cert.authorized_name,
        authorized_designation=cert.authorized_designation,
    )
