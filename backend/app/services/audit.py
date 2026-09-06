import json
from typing import Optional

from fastapi import Request
from sqlmodel import Session, select

from app.core.deps import client_meta
from app.models import AuditLog


def log_audit(
    db: Session,
    *,
    action: str,
    user_id: Optional[str] = None,
    entity: Optional[str] = None,
    entity_id: Optional[str] = None,
    meta: Optional[dict] = None,
    request: Optional[Request] = None,
) -> None:
    """Best-effort audit entry. The caller commits the transaction."""
    ip, ua = client_meta(request) if request else (None, None)
    db.add(
        AuditLog(
            user_id=user_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            meta=json.dumps(meta) if meta else None,
            ip=ip,
            user_agent=ua,
        )
    )


def document_history(db: Session, entity_id: str, limit: int = 10) -> list[dict]:
    rows = db.exec(
        select(AuditLog)
        .where(AuditLog.entity_id == entity_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    ).all()
    return [
        {"action": r.action, "created_at": r.created_at, "meta": json.loads(r.meta) if r.meta else None}
        for r in rows
    ]
