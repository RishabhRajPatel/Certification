import hashlib
import secrets
from datetime import datetime
from typing import Iterable

from sqlmodel import Session, func, select

from app.core.constants import Audit
from app.models import AuditLog


def generate_verification_token() -> str:
    """128 bits of entropy, URL-safe — enumeration is computationally
    infeasible regardless of any rate limiting in front of it."""
    return secrets.token_urlsafe(16)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verification_stats(db: Session, cert_ids: Iterable[str]) -> dict[str, tuple[int, datetime | None]]:
    """Per-certificate (verification_count, last_verified_at), derived from
    the VERIFY_ATTEMPT audit trail. One grouped query, not N+1."""
    ids = list(cert_ids)
    if not ids:
        return {}
    rows = db.exec(
        select(AuditLog.entity_id, func.count(), func.max(AuditLog.created_at))
        .where(AuditLog.action == Audit.VERIFY_ATTEMPT, AuditLog.entity_id.in_(ids))
        .group_by(AuditLog.entity_id)
    ).all()
    return {entity_id: (count, last) for entity_id, count, last in rows}
