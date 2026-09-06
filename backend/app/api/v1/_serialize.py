import json
from typing import Optional

from app.core.config import settings
from app.models import Certificate, OfferLetter, Template
from app.schemas.document import CertRead, HistoryEntry, OfferRead
from app.schemas.system import TemplateRead
from app.utils.time import utcnow


def _history_entries(history: Optional[list[dict]]) -> list[HistoryEntry]:
    return [HistoryEntry(**h) for h in (history or [])]


def offer_read(
    offer: OfferLetter,
    intern_name: Optional[str] = None,
    intern_code: Optional[str] = None,
    history: Optional[list[dict]] = None,
) -> OfferRead:
    r = OfferRead.model_validate(offer)
    r.intern_name = intern_name
    r.intern_code = intern_code
    r.download_url = f"/api/v1/offers/{offer.id}/pdf"
    r.history = _history_entries(history)
    return r


def cert_read(
    cert: Certificate,
    intern_name: Optional[str] = None,
    intern_code: Optional[str] = None,
    verification_count: int = 0,
    last_verified_at=None,
    history: Optional[list[dict]] = None,
) -> CertRead:
    r = CertRead.model_validate(cert)
    r.intern_name = intern_name
    r.intern_code = intern_code
    r.download_url = f"/api/v1/certificates/{cert.id}/pdf"
    # A draft isn't publicly verifiable yet (see verify.py) — don't hand out a link that 404s.
    r.verify_url = f"{settings.app_url}/verify/{cert.verification_token}" if cert.status != "DRAFT" else None
    r.is_expired = bool(cert.expires_at and cert.expires_at < utcnow() and cert.status != "REVOKED")
    r.verification_count = verification_count
    r.last_verified_at = last_verified_at
    r.history = _history_entries(history)
    return r


def template_read(t: Template) -> TemplateRead:
    r = TemplateRead.model_validate(t)
    if t.background_type:
        ext = "pdf" if t.background_type == "PDF" else "png"
        r.background_url = f"/media/templates/{t.id}.{ext}"
    r.layout = json.loads(t.layout_json) if t.layout_json else None
    return r
