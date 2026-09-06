from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.core.constants import INTERN_STATUSES


class TaskCreate(BaseModel):
    title: str

    @field_validator("title")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Task title is required.")
        return v


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    intern_id: str
    title: str
    is_done: bool
    order_index: int


class StatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        if v not in INTERN_STATUSES:
            raise ValueError(f"Invalid status. Must be one of {INTERN_STATUSES}.")
        return v


class ProgressInfo(BaseModel):
    percent: int
    total_days: int
    days_completed: int
    days_remaining: int
    phase: str
