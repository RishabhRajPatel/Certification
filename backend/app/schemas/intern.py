from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator

from app.core.constants import INTERN_STATUSES
from app.schemas.document import CertRead, OfferRead
from app.schemas.progress import ProgressInfo, TaskRead


class InternBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    college: Optional[str] = None
    course: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    start_date: datetime
    end_date: datetime
    duration_label: Optional[str] = None
    reporting_manager: Optional[str] = None
    stipend: Optional[int] = None
    photo_url: Optional[str] = None
    status: str = "UPCOMING"

    @field_validator("full_name")
    @classmethod
    def name_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Full name is required.")
        return v.strip()

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        if v not in INTERN_STATUSES:
            raise ValueError(f"Invalid status. Must be one of {INTERN_STATUSES}.")
        return v

    @field_validator("stipend")
    @classmethod
    def non_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("Stipend cannot be negative.")
        return v

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("End date must be after the start date.")
        return self


class InternCreate(InternBase):
    pass


class InternUpdate(InternBase):
    pass


class InternRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    intern_code: str
    full_name: str
    email: str
    phone: Optional[str] = None
    college: Optional[str] = None
    course: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    start_date: datetime
    end_date: datetime
    duration_label: Optional[str] = None
    reporting_manager: Optional[str] = None
    stipend: Optional[int] = None
    photo_url: Optional[str] = None
    status: str
    created_at: datetime


class InternDetail(InternRead):
    progress: ProgressInfo
    tasks: list[TaskRead] = []
    offer_letters: list[OfferRead] = []
    certificates: list[CertRead] = []
