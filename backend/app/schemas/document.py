from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.constants import (
    CERTIFICATE_TYPES,
    COMPENSATION_TYPES,
    EVALUATION_FREQUENCIES,
    WORK_MODES,
)


class HistoryEntry(BaseModel):
    action: str
    created_at: datetime
    meta: Optional[dict] = None


# ── Offer letters ──────────────────────────────────────────────
class OfferCreate(BaseModel):
    intern_id: str
    template_key: str = "corporate"
    position: str
    department: Optional[str] = None
    duration_label: Optional[str] = None
    joining_date: datetime
    compensation_type: str = "FIXED"  # UNPAID | FIXED | PERFORMANCE
    stipend: Optional[int] = None  # FIXED: required monthly amount. PERFORMANCE: optional max incentive.
    performance_criteria: Optional[str] = None
    evaluation_frequency: Optional[str] = None
    authorized_name: str
    authorized_designation: str
    terms: Optional[str] = None

    @field_validator("compensation_type")
    @classmethod
    def valid_compensation_type(cls, v: str) -> str:
        if v not in COMPENSATION_TYPES:
            raise ValueError(f"compensation_type must be one of {COMPENSATION_TYPES}.")
        return v

    @field_validator("evaluation_frequency")
    @classmethod
    def valid_evaluation_frequency(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in EVALUATION_FREQUENCIES:
            raise ValueError(f"evaluation_frequency must be one of {EVALUATION_FREQUENCIES}.")
        return v

    @field_validator("stipend")
    @classmethod
    def non_negative_stipend(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("Stipend cannot be negative.")
        return v

    @model_validator(mode="after")
    def check_compensation_fields(self):
        if self.compensation_type == "FIXED":
            if not self.stipend:
                raise ValueError("Monthly stipend is required for Fixed Stipend compensation.")
            self.performance_criteria = None
            self.evaluation_frequency = None
        elif self.compensation_type == "PERFORMANCE":
            if not self.performance_criteria or not self.performance_criteria.strip():
                raise ValueError("Performance criteria is required for Performance-Based compensation.")
            if not self.evaluation_frequency:
                raise ValueError("Evaluation frequency is required for Performance-Based compensation.")
        else:  # UNPAID
            self.stipend = None
            self.performance_criteria = None
            self.evaluation_frequency = None
        return self


class OfferRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    number: str
    intern_id: str
    template_key: str
    position: str
    department: Optional[str] = None
    duration_label: Optional[str] = None
    joining_date: datetime
    compensation_type: str
    stipend: Optional[int] = None
    performance_criteria: Optional[str] = None
    evaluation_frequency: Optional[str] = None
    issue_date: datetime
    authorized_name: str
    authorized_designation: str
    terms: Optional[str] = None
    status: str
    email_status: Optional[str] = None
    email_sent_at: Optional[datetime] = None
    email_error: Optional[str] = None
    email_recipient: Optional[str] = None
    created_at: datetime
    # enriched
    intern_name: Optional[str] = None
    intern_code: Optional[str] = None
    download_url: Optional[str] = None
    history: list[HistoryEntry] = []


# ── Certificates ───────────────────────────────────────────────
class CertCreate(BaseModel):
    intern_id: str
    template_key: str = "premium"
    certificate_type: str = "COMPLETION"
    title: str = "Certificate of Completion"
    role: str
    department: Optional[str] = None
    duration_label: Optional[str] = None
    work_mode: Optional[str] = None
    start_date: datetime
    end_date: datetime
    performance_rating: Optional[int] = None
    skills: Optional[str] = Field(default=None, max_length=300)
    remarks: Optional[str] = Field(default=None, max_length=400)
    # blank -> auto-generated from the fields above. Capped: the certificate PDF
    # draws this at a fixed canvas position (not a flowing layout) — too long
    # and it collides with the QR/seal/signature row below it. Limit stays
    # comfortably above skills(300) + remarks(400) + the fixed sentences
    # default_certificate_text() adds (~230 chars), so a maxed-out
    # auto-generated text never gets rejected by its own cap.
    certificate_text: Optional[str] = Field(default=None, max_length=1200)
    expires_at: Optional[datetime] = None
    authorized_name: str
    authorized_designation: str

    @field_validator("certificate_type")
    @classmethod
    def valid_certificate_type(cls, v: str) -> str:
        if v not in CERTIFICATE_TYPES:
            raise ValueError(f"certificate_type must be one of {CERTIFICATE_TYPES}.")
        return v

    @field_validator("work_mode")
    @classmethod
    def valid_work_mode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in WORK_MODES:
            raise ValueError(f"work_mode must be one of {WORK_MODES}.")
        return v

    @field_validator("performance_rating")
    @classmethod
    def valid_rating(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("performance_rating must be between 1 and 5.")
        return v

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("End date must be after the start date.")
        if self.expires_at is not None and self.expires_at <= self.end_date:
            raise ValueError("Expiry date must be after the internship end date.")
        return self


class CertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    number: str
    intern_id: str
    template_key: str
    certificate_type: str
    title: str
    role: str
    department: Optional[str] = None
    duration_label: Optional[str] = None
    work_mode: Optional[str] = None
    start_date: datetime
    end_date: datetime
    performance_rating: Optional[int] = None
    skills: Optional[str] = None
    remarks: Optional[str] = None
    certificate_text: Optional[str] = None
    issue_date: datetime
    expires_at: Optional[datetime] = None
    authorized_name: str
    authorized_designation: str
    status: str
    email_status: Optional[str] = None
    email_sent_at: Optional[datetime] = None
    email_error: Optional[str] = None
    email_recipient: Optional[str] = None
    created_at: datetime
    # enriched
    intern_name: Optional[str] = None
    intern_code: Optional[str] = None
    download_url: Optional[str] = None
    verify_url: Optional[str] = None
    is_expired: bool = False
    verification_count: int = 0
    last_verified_at: Optional[datetime] = None
    history: list[HistoryEntry] = []


# ── Unified document (Documents page) ──────────────────────────
class DocumentRead(BaseModel):
    id: str
    type: str  # OFFER | CERTIFICATE | OTHER
    title: str
    number: Optional[str] = None
    intern_id: Optional[str] = None
    intern_name: Optional[str] = None
    status: str
    date: datetime
    download_url: Optional[str] = None
    verify_url: Optional[str] = None


# ── Public verification ────────────────────────────────────────
class VerifyResponse(BaseModel):
    valid: bool
    status: str  # VALID | REVOKED | EXPIRED | NOT_FOUND
    number: str
    message: str
    title: Optional[str] = None
    intern_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    duration_label: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    issue_date: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    authorized_name: Optional[str] = None
    authorized_designation: Optional[str] = None
