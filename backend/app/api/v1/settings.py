from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from app.core.constants import Audit
from app.core.deps import get_current_user
from app.db.session import get_session
from app.models import AdminUser
from app.schemas.system import SettingRead, SettingUpdate
from app.services.audit import log_audit
from app.services.settings_service import get_settings_row
from app.utils.time import utcnow

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingRead)
def read_settings(db: Session = Depends(get_session), _: AdminUser = Depends(get_current_user)):
    return get_settings_row(db)


@router.put("", response_model=SettingRead)
def update_settings(
    payload: SettingUpdate,
    request: Request,
    db: Session = Depends(get_session),
    user: AdminUser = Depends(get_current_user),
):
    row = get_settings_row(db)
    for field, value in payload.model_dump().items():
        setattr(row, field, value)
    row.updated_at = utcnow()
    db.add(row)
    log_audit(db, action=Audit.UPDATE_SETTINGS, user_id=user.id, entity="Setting", entity_id="app", request=request)
    db.commit()
    db.refresh(row)
    return row
