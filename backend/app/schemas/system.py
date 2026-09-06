from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.core.constants import OFFER_LETTER_VARIABLES


class TemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    type: str
    key: str
    name: str
    description: Optional[str] = None
    accent: Optional[str] = None
    is_default: bool
    is_custom: bool = False
    background_type: Optional[str] = None
    background_url: Optional[str] = None
    bg_width_pt: Optional[float] = None
    bg_height_pt: Optional[float] = None
    layout: Optional[dict] = None


class LayoutField(BaseModel):
    x: float
    y: float
    font_size: Optional[float] = None
    align: Optional[str] = None
    bold: Optional[bool] = None
    color: Optional[str] = None
    size: Optional[float] = None  # QR box size, as a fraction of min(page width, height)


class TemplateLayoutUpdate(BaseModel):
    layout: dict[str, LayoutField]


class SetDefaultTemplateRequest(BaseModel):
    type: str  # OFFER | CERTIFICATE
    key: str

    @field_validator("type")
    @classmethod
    def valid_type(cls, v: str) -> str:
        if v not in ("OFFER", "CERTIFICATE"):
            raise ValueError("type must be OFFER or CERTIFICATE.")
        return v


class SettingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_name: str
    company_logo_url: Optional[str] = None
    company_address: Optional[str] = None
    company_email: Optional[str] = None
    company_phone: Optional[str] = None
    company_website: Optional[str] = None
    letter_prefix: str
    cert_prefix: str
    intern_prefix: str
    signature_name: str
    signature_designation: str
    signature_image_url: Optional[str] = None
    stamp_image_url: Optional[str] = None
    default_offer_template: str
    default_cert_template: str
    brand_color: str
    cert_email_auto_send: bool
    cert_email_subject: str
    cert_email_attach_pdf: bool
    cert_email_include_verify_link: bool
    offer_email_auto_send: bool
    offer_email_subject: str
    offer_email_attach_pdf: bool
    offer_letter_template: str
    updated_at: datetime


class SettingUpdate(BaseModel):
    company_name: str
    company_logo_url: Optional[str] = None
    company_address: Optional[str] = None
    company_email: Optional[str] = None
    company_phone: Optional[str] = None
    company_website: Optional[str] = None
    letter_prefix: str
    cert_prefix: str
    intern_prefix: str
    signature_name: str
    signature_designation: str
    signature_image_url: Optional[str] = None
    stamp_image_url: Optional[str] = None
    default_offer_template: str
    default_cert_template: str
    brand_color: str
    cert_email_auto_send: bool
    cert_email_subject: str
    cert_email_attach_pdf: bool
    cert_email_include_verify_link: bool
    offer_email_auto_send: bool
    offer_email_subject: str
    offer_email_attach_pdf: bool
    offer_letter_template: str

    @field_validator("offer_letter_template")
    @classmethod
    def valid_template(cls, v: str) -> str:
        import re

        if not v.strip():
            raise ValueError("Offer letter template cannot be empty.")
        unknown = sorted(set(re.findall(r"\{\{(\w+)\}\}", v)) - set(OFFER_LETTER_VARIABLES))
        if unknown:
            raise ValueError(
                f"Unknown template variable(s): {', '.join('{{' + u + '}}' for u in unknown)}. "
                f"Available: {', '.join('{{' + a + '}}' for a in OFFER_LETTER_VARIABLES)}."
            )
        return v

    @field_validator("brand_color")
    @classmethod
    def valid_hex(cls, v: str) -> str:
        v = v.strip()
        import re

        if not re.fullmatch(r"#[0-9a-fA-F]{6}", v):
            raise ValueError("brand_color must be a hex color like #4F46E5.")
        return v

    @field_validator("letter_prefix", "cert_prefix", "intern_prefix")
    @classmethod
    def prefix_ok(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Prefix is required.")
        return v
