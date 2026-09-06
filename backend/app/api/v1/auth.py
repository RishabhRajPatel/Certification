from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlmodel import Session, select

from app.core.config import settings
from app.core.constants import Audit
from app.core.deps import COOKIE_NAME, client_meta, get_current_user
from app.core.rate_limit import check_rate_limit
from app.core.security import (
    create_access_token,
    hash_password,
    new_jti,
    validate_password_strength,
    verify_password,
)
from app.db.session import get_session
from app.models import AdminUser, SessionToken
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    MeResponse,
    SessionInfo,
    TokenResponse,
)
from app.schemas.common import OkResponse
from app.services.audit import log_audit
from app.utils.time import utcnow

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_cookie(response: Response, token: str, expire: datetime) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        path="/",
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_session)):
    ip, ua = client_meta(request)
    allowed, retry = check_rate_limit(f"login:{ip}", limit=5, window_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many attempts. Try again in {retry}s.",
            headers={"Retry-After": str(retry)},
        )

    email = payload.email.lower()
    user = db.exec(select(AdminUser).where(AdminUser.email == email)).first()

    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        log_audit(
            db, action=Audit.LOGIN_FAILED, entity="AdminUser",
            user_id=user.id if user else None, meta={"email": email}, request=request,
        )
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    jti = new_jti()
    token, expire = create_access_token(
        user.id, jti, {"email": user.email, "name": user.name, "role": user.role}
    )
    db.add(SessionToken(jti=jti, user_id=user.id, ip=ip, user_agent=ua, expires_at=expire.replace(tzinfo=None)))
    user.last_login_at = utcnow()
    db.add(user)
    log_audit(db, action=Audit.LOGIN, user_id=user.id, entity="AdminUser", entity_id=user.id, request=request)
    db.commit()

    _set_cookie(response, token, expire)
    return TokenResponse(access_token=token, expires_at=expire)


@router.post("/logout", response_model=OkResponse)
def logout(request: Request, response: Response, user: AdminUser = Depends(get_current_user), db: Session = Depends(get_session)):
    jti = getattr(request.state, "jti", None)
    if jti:
        sess = db.get(SessionToken, jti)
        if sess and sess.revoked_at is None:
            sess.revoked_at = utcnow()
            db.add(sess)
    log_audit(db, action=Audit.LOGOUT, user_id=user.id, entity="AdminUser", entity_id=user.id, request=request)
    db.commit()
    response.delete_cookie(COOKIE_NAME, path="/")
    return OkResponse()


@router.get("/me", response_model=MeResponse)
def me(user: AdminUser = Depends(get_current_user)):
    return user


@router.post("/change-password", response_model=OkResponse)
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    err = validate_password_strength(payload.new_password)
    if err:
        raise HTTPException(status_code=400, detail=err)

    user.password_hash = hash_password(payload.new_password)
    user.updated_at = utcnow()
    db.add(user)

    # Sign out all other sessions after a password change.
    current_jti = getattr(request.state, "jti", None)
    others = db.exec(
        select(SessionToken).where(
            SessionToken.user_id == user.id,
            SessionToken.jti != current_jti,
            SessionToken.revoked_at == None,  # noqa: E711
        )
    ).all()
    for s in others:
        s.revoked_at = utcnow()
        db.add(s)

    log_audit(db, action=Audit.CHANGE_PASSWORD, user_id=user.id, entity="AdminUser", entity_id=user.id, request=request)
    db.commit()
    return OkResponse()


@router.get("/sessions", response_model=list[SessionInfo])
def list_sessions(request: Request, user: AdminUser = Depends(get_current_user), db: Session = Depends(get_session)):
    current_jti = getattr(request.state, "jti", None)
    now = utcnow()
    rows = db.exec(
        select(SessionToken).where(
            SessionToken.user_id == user.id,
            SessionToken.revoked_at == None,  # noqa: E711
            SessionToken.expires_at > now,
        ).order_by(SessionToken.created_at.desc())
    ).all()
    return [
        SessionInfo(
            jti=s.jti, ip=s.ip, user_agent=s.user_agent,
            created_at=s.created_at, expires_at=s.expires_at, current=(s.jti == current_jti),
        )
        for s in rows
    ]


@router.post("/sessions/revoke-others", response_model=OkResponse)
def revoke_others(request: Request, user: AdminUser = Depends(get_current_user), db: Session = Depends(get_session)):
    current_jti = getattr(request.state, "jti", None)
    rows = db.exec(
        select(SessionToken).where(
            SessionToken.user_id == user.id,
            SessionToken.jti != current_jti,
            SessionToken.revoked_at == None,  # noqa: E711
        )
    ).all()
    for s in rows:
        s.revoked_at = utcnow()
        db.add(s)
    log_audit(db, action=Audit.REVOKE_SESSIONS, user_id=user.id, entity="AdminUser", entity_id=user.id, request=request)
    db.commit()
    return OkResponse()
