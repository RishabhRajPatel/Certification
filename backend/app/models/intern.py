import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.utils.time import utcnow


def _id() -> str:
    return uuid.uuid4().hex


class Intern(SQLModel, table=True):
    id: str = Field(default_factory=_id, primary_key=True)
    intern_code: str = Field(index=True, unique=True)  # INT-2026-00001
    full_name: str = Field(index=True)
    email: str = Field(index=True, unique=True)
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
    status: str = Field(default="UPCOMING", index=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ProgressTask(SQLModel, table=True):
    id: str = Field(default_factory=_id, primary_key=True)
    intern_id: str = Field(foreign_key="intern.id", index=True)
    title: str
    is_done: bool = Field(default=False)
    order_index: int = Field(default=0)
    created_at: datetime = Field(default_factory=utcnow)
