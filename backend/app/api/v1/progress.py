from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.deps import get_current_user
from app.core.constants import Audit
from app.db.session import get_session
from app.models import AdminUser, Intern, ProgressTask
from app.schemas.common import OkResponse
from app.schemas.intern import InternRead
from app.schemas.progress import ProgressInfo, StatusUpdate, TaskCreate, TaskRead
from app.services.audit import log_audit
from app.utils.progress import compute_progress
from app.utils.time import utcnow

router = APIRouter(prefix="/progress", tags=["progress"])

_ORDER = {"ACTIVE": 0, "UPCOMING": 1, "COMPLETED": 2, "TERMINATED": 3}


class ProgressBoardItem(BaseModel):
    intern: InternRead
    progress: ProgressInfo
    tasks: list[TaskRead]


@router.get("", response_model=list[ProgressBoardItem])
def board(db: Session = Depends(get_session), _: AdminUser = Depends(get_current_user)):
    interns = db.exec(select(Intern)).all()
    interns.sort(key=lambda i: (_ORDER.get(i.status, 9), i.full_name.lower()))

    # One query for every intern's tasks instead of one query per intern.
    tasks_by_intern: dict[str, list[ProgressTask]] = {}
    for t in db.exec(select(ProgressTask).order_by(ProgressTask.order_index)).all():
        tasks_by_intern.setdefault(t.intern_id, []).append(t)

    return [
        ProgressBoardItem(
            intern=InternRead.model_validate(intern),
            progress=compute_progress(intern.start_date, intern.end_date),
            tasks=[TaskRead.model_validate(t) for t in tasks_by_intern.get(intern.id, [])],
        )
        for intern in interns
    ]


@router.post("/interns/{intern_id}/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def add_task(intern_id: str, payload: TaskCreate, db: Session = Depends(get_session), _: AdminUser = Depends(get_current_user)):
    intern = db.get(Intern, intern_id)
    if not intern:
        raise HTTPException(status_code=404, detail="Intern not found.")
    count = len(db.exec(select(ProgressTask).where(ProgressTask.intern_id == intern_id)).all())
    task = ProgressTask(intern_id=intern_id, title=payload.title, order_index=count)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.post("/tasks/{task_id}/toggle", response_model=TaskRead)
def toggle_task(task_id: str, db: Session = Depends(get_session), _: AdminUser = Depends(get_current_user)):
    task = db.get(ProgressTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    task.is_done = not task.is_done
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: str, db: Session = Depends(get_session), _: AdminUser = Depends(get_current_user)):
    task = db.get(ProgressTask, task_id)
    if task:
        db.delete(task)
        db.commit()
    return None


@router.post("/interns/{intern_id}/status", response_model=InternRead)
def update_status(intern_id: str, payload: StatusUpdate, db: Session = Depends(get_session), user: AdminUser = Depends(get_current_user)):
    intern = db.get(Intern, intern_id)
    if not intern:
        raise HTTPException(status_code=404, detail="Intern not found.")
    intern.status = payload.status
    intern.updated_at = utcnow()
    db.add(intern)
    log_audit(db, action=Audit.UPDATE_STATUS, user_id=user.id, entity="Intern", entity_id=intern.id, meta={"status": payload.status})
    db.commit()
    db.refresh(intern)
    return intern
