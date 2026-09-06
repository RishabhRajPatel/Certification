from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RecentIntern(BaseModel):
    id: str
    full_name: str
    intern_code: str
    role: Optional[str] = None
    status: str
    photo_url: Optional[str] = None


class RecentDoc(BaseModel):
    id: str
    number: str
    intern_name: str
    subtitle: Optional[str] = None
    status: str
    date: datetime


class DashboardResponse(BaseModel):
    total_interns: int
    offers_generated: int
    certificates: int
    active_internships: int
    status_counts: dict[str, int]
    recent_interns: list[RecentIntern]
    recent_offers: list[RecentDoc]
    recent_certificates: list[RecentDoc]
