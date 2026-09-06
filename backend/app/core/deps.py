from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlmodel import Session

from app.core.security import decode_token
from app.db.session import get_session
from app.models import AdminUser, SessionToken
from app.utils.time import utcnow

COOKIE_NAME = "cf_token"


def client_meta(request: Request) -> tuple[Optional[str], Optional[str]]:
    fwd = request.headers.get("x-forwarded-for")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else None)
    return ip, request.headers.get("user-agent")


def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return request.cookies.get(COOKIE_NAME)


def get_current_user(
    request: Request,
    db: Session = Depends(get_session),
) -> AdminUser:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = _extract_token(request)
    if not token:
        raise credentials_exc

    payload = decode_token(token)
    if not payload or not payload.get("sub") or not payload.get("jti"):
        raise credentials_exc

    session = db.get(SessionToken, payload["jti"])
    if (
        not session
        or session.revoked_at is not None
        or session.expires_at < utcnow()
    ):
        raise credentials_exc

    user = db.get(AdminUser, payload["sub"])
    if not user or not user.is_active:
        raise credentials_exc

    # Stash the active session id for logout / session management endpoints.
    request.state.jti = session.jti
    return user


def require_superadmin(user: AdminUser = Depends(get_current_user)) -> AdminUser:
    if user.role != "SUPERADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requires super-admin.")
    return user
