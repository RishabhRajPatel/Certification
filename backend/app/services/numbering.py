from datetime import datetime
from typing import Optional

from sqlmodel import Session

from app.models import Counter


def next_sequence(db: Session, scope: str, prefix: str, year: Optional[int] = None) -> str:
    """Produce the next sequential number, e.g. next_sequence(db, "OFFER", "OFF")
    -> "OFF-2026-00001". The caller is responsible for committing the txn."""
    year = year or datetime.now().year
    key = f"{scope}-{year}"
    counter = db.get(Counter, key)
    if counter is None:
        counter = Counter(key=key, value=1)
    else:
        counter.value += 1
    db.add(counter)
    db.flush()
    return f"{prefix}-{year}-{counter.value:05d}"
