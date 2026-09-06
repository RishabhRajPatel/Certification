from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime


class MeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    name: str
    role: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class SessionInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    jti: str
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    current: bool = False
