import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.utils.time import utcnow


def _id() -> str:
    return uuid.uuid4().hex


class AdminUser(SQLModel, table=True):
    id: str = Field(default_factory=_id, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: str
    password_hash: str
    role: str = Field(default="ADMIN")  # ADMIN | SUPERADMIN
    is_active: bool = Field(default=True)
    last_login_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class SessionToken(SQLModel, table=True):
    """Server-side session record enabling 'active sessions' + revocation."""

    jti: str = Field(primary_key=True)
    user_id: str = Field(foreign_key="adminuser.id", index=True)
    user_agent: Optional[str] = None
    ip: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    expires_at: datetime
    revoked_at: Optional[datetime] = None
