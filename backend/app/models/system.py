import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.core.constants import DEFAULT_OFFER_LETTER_TEMPLATE
from app.utils.time import utcnow


def _id() -> str:
    return uuid.uuid4().hex


class Template(SQLModel, table=True):
    id: str = Field(default_factory=_id, primary_key=True)
    type: str = Field(index=True)  # OFFER | CERTIFICATE
    key: str = Field(index=True)  # modern | corporate | minimal | premium | custom-xxxxxxxxxx
    name: str
    description: Optional[str] = None
    accent: Optional[str] = None
    is_default: bool = Field(default=False)
    is_custom: bool = Field(default=False)
    background_type: Optional[str] = None  # IMAGE | PDF
    bg_width_pt: Optional[float] = None
    bg_height_pt: Optional[float] = None
    layout_json: Optional[str] = None  # JSON string: {field: {x,y,fontSize,align,bold,color,size}}
    created_at: datetime = Field(default_factory=utcnow)


class AuditLog(SQLModel, table=True):
    id: str = Field(default_factory=_id, primary_key=True)
    user_id: Optional[str] = Field(default=None, index=True)
    action: str = Field(index=True)
    entity: Optional[str] = None
    entity_id: Optional[str] = None
    meta: Optional[str] = None  # JSON string
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow, index=True)


class Counter(SQLModel, table=True):
    key: str = Field(primary_key=True)  # e.g. "OFFER-2026"
    value: int = Field(default=0)


class Setting(SQLModel, table=True):
    id: str = Field(default="app", primary_key=True)
    company_name: str = Field(default="Your Company Pvt. Ltd.")
    company_logo_url: Optional[str] = None
    company_address: Optional[str] = None
    company_email: Optional[str] = None
    company_phone: Optional[str] = None
    company_website: Optional[str] = None
    letter_prefix: str = Field(default="OFF")
    cert_prefix: str = Field(default="CERT")
    intern_prefix: str = Field(default="INT")
    signature_name: str = Field(default="Authorized Signatory")
    signature_designation: str = Field(default="HR Manager")
    signature_image_url: Optional[str] = None
    stamp_image_url: Optional[str] = None
    default_offer_template: str = Field(default="corporate")
    default_cert_template: str = Field(default="premium")
    brand_color: str = Field(default="#4F46E5")
    cert_email_auto_send: bool = Field(default=False)
    cert_email_subject: str = Field(default="Your Certificate – {{company_name}}")
    cert_email_attach_pdf: bool = Field(default=True)
    cert_email_include_verify_link: bool = Field(default=True)
    offer_email_auto_send: bool = Field(default=False)
    offer_email_subject: str = Field(default="Your Offer Letter – {{company_name}}")
    offer_email_attach_pdf: bool = Field(default=True)
    offer_letter_template: str = Field(default=DEFAULT_OFFER_LETTER_TEMPLATE)
    updated_at: datetime = Field(default_factory=utcnow)
