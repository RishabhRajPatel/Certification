import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.utils.time import utcnow


def _id() -> str:
    return uuid.uuid4().hex


class OfferLetter(SQLModel, table=True):
    id: str = Field(default_factory=_id, primary_key=True)
    number: str = Field(index=True, unique=True)  # OFF-2026-00001
    intern_id: str = Field(foreign_key="intern.id", index=True)
    template_key: str = Field(default="corporate")
    position: str
    department: Optional[str] = None
    duration_label: Optional[str] = None
    joining_date: datetime
    compensation_type: str = Field(default="FIXED")  # UNPAID | FIXED | PERFORMANCE
    stipend: Optional[int] = None  # FIXED: monthly amount. PERFORMANCE: optional max incentive. UNPAID: unused.
    performance_criteria: Optional[str] = None  # PERFORMANCE only
    evaluation_frequency: Optional[str] = None  # PERFORMANCE only — Monthly | Quarterly | Half-Yearly | Annually
    issue_date: datetime = Field(default_factory=utcnow)
    authorized_name: str
    authorized_designation: str
    terms: Optional[str] = None
    status: str = Field(default="DRAFT", index=True)  # DRAFT | GENERATED | VOID
    email_status: Optional[str] = None  # None | SENT | FAILED
    email_sent_at: Optional[datetime] = None
    email_error: Optional[str] = None
    email_recipient: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)


class Certificate(SQLModel, table=True):
    id: str = Field(default_factory=_id, primary_key=True)
    number: str = Field(index=True, unique=True)  # CERT-2026-00001 — human-readable display only, NOT the verify lookup key (sequential, enumerable)
    # Public verification uses a separate, cryptographically random token instead of `number`.
    # The hash is what /verify/{token} looks up by; the raw copy is kept only because the PDF
    # (and its embedded QR) is regenerated on every download rather than persisted at issue time,
    # so the same token needs to be re-embedded each time. See verification.py.
    verification_token: Optional[str] = Field(default=None, index=True)
    verification_token_hash: Optional[str] = Field(default=None, index=True)
    intern_id: str = Field(foreign_key="intern.id", index=True)
    template_key: str = Field(default="premium")
    certificate_type: str = Field(default="COMPLETION")  # COMPLETION | EXCELLENCE | PARTICIPATION | APPRECIATION
    title: str = Field(default="Certificate of Completion")
    role: str
    department: Optional[str] = None
    duration_label: Optional[str] = None
    work_mode: Optional[str] = None  # REMOTE | ON_SITE | HYBRID
    start_date: datetime
    end_date: datetime
    performance_rating: Optional[int] = None  # 1-5
    skills: Optional[str] = None
    remarks: Optional[str] = None
    certificate_text: Optional[str] = None  # body paragraph — auto-generated if left blank at creation
    issue_date: datetime = Field(default_factory=utcnow)
    expires_at: Optional[datetime] = None  # None = never expires
    authorized_name: str
    authorized_designation: str
    status: str = Field(default="DRAFT", index=True)  # DRAFT | VALID | REVOKED (EXPIRED is derived at read time from expires_at)
    email_status: Optional[str] = None  # None | SENT | FAILED
    email_sent_at: Optional[datetime] = None
    email_error: Optional[str] = None
    email_recipient: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)


class Document(SQLModel, table=True):
    id: str = Field(default_factory=_id, primary_key=True)
    intern_id: Optional[str] = Field(default=None, foreign_key="intern.id", index=True)
    type: str = Field(default="OTHER", index=True)  # OFFER | CERTIFICATE | OTHER
    title: str
    ref_id: Optional[str] = None
    file_url: Optional[str] = None
    status: str = Field(default="ACTIVE")
    created_at: datetime = Field(default_factory=utcnow)
