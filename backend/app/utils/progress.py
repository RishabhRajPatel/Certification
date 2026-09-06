from datetime import datetime
from typing import Optional

from app.schemas.progress import ProgressInfo
from app.utils.time import utcnow

_DAY = 86400.0


def compute_progress(start: datetime, end: datetime, now: Optional[datetime] = None) -> ProgressInfo:
    now = now or utcnow()
    total_days = max(1, round((end - start).total_seconds() / _DAY))

    if now < start:
        return ProgressInfo(
            percent=0, total_days=total_days, days_completed=0,
            days_remaining=total_days, phase="UPCOMING",
        )
    if now >= end:
        return ProgressInfo(
            percent=100, total_days=total_days, days_completed=total_days,
            days_remaining=0, phase="COMPLETED",
        )

    days_completed = max(0, round((now - start).total_seconds() / _DAY))
    days_remaining = max(0, total_days - days_completed)
    percent = min(100, round((days_completed / total_days) * 100))
    return ProgressInfo(
        percent=percent, total_days=total_days, days_completed=days_completed,
        days_remaining=days_remaining, phase="ACTIVE",
    )
