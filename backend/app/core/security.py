import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings

# bcrypt only uses the first 72 bytes.
_BCRYPT_MAX = 72


def _prep(pw: str) -> bytes:
    return pw.encode("utf-8")[:_BCRYPT_MAX]


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(_prep(pw), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prep(pw), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def new_jti() -> str:
    return uuid.uuid4().hex


def create_access_token(subject: str, jti: str, extra: dict | None = None) -> tuple[str, datetime]:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    payload: dict = {"sub": subject, "jti": jti, "iat": now, "exp": expire}
    if extra:
        payload.update(extra)
    token = jwt.encode(payload, settings.AUTH_SECRET, algorithm=settings.ALGORITHM)
    return token, expire


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.AUTH_SECRET, algorithms=[settings.ALGORITHM])
    except jwt.PyJWTError:
        return None


def validate_password_strength(pw: str) -> str | None:
    if len(pw) < 8:
        return "Password must be at least 8 characters."
    if not any(c.islower() for c in pw):
        return "Password must contain a lowercase letter."
    if not any(c.isupper() for c in pw):
        return "Password must contain an uppercase letter."
    if not any(c.isdigit() for c in pw):
        return "Password must contain a number."
    return None
