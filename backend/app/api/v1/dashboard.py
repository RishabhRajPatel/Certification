from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.constants import INTERN_STATUSES
from app.core.deps import get_current_user
from app.db.session import get_session
from app.models import AdminUser, Certificate, Intern, OfferLetter
from app.schemas.dashboard import DashboardResponse, RecentDoc, RecentIntern

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def dashboard(db: Session = Depends(get_session), _: AdminUser = Depends(get_current_user)):
    interns = db.exec(select(Intern).order_by(Intern.created_at.desc())).all()
    offers = db.exec(select(OfferLetter).order_by(OfferLetter.created_at.desc())).all()
    certs = db.exec(select(Certificate).order_by(Certificate.created_at.desc())).all()
    names = {i.id: i.full_name for i in interns}

    status_counts = {s: 0 for s in INTERN_STATUSES}
    for i in interns:
        status_counts[i.status] = status_counts.get(i.status, 0) + 1

    return DashboardResponse(
        total_interns=len(interns),
        offers_generated=len(offers),
        certificates=len(certs),
        active_internships=status_counts.get("ACTIVE", 0),
        status_counts=status_counts,
        recent_interns=[
            RecentIntern(
                id=i.id, full_name=i.full_name, intern_code=i.intern_code,
                role=i.role, status=i.status, photo_url=i.photo_url,
            )
            for i in interns[:5]
        ],
        recent_offers=[
            RecentDoc(
                id=o.id, number=o.number, intern_name=names.get(o.intern_id, "—"),
                subtitle=o.position, status=o.status, date=o.issue_date,
            )
            for o in offers[:5]
        ],
        recent_certificates=[
            RecentDoc(
                id=c.id, number=c.number, intern_name=names.get(c.intern_id, "—"),
                subtitle=c.role, status=c.status, date=c.issue_date,
            )
            for c in certs[:5]
        ],
    )
