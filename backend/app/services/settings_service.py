from sqlmodel import Session

from app.models import Setting


def get_settings_row(db: Session) -> Setting:
    """Return the singleton settings row, creating it on first access."""
    row = db.get(Setting, "app")
    if not row:
        row = Setting(id="app")
        db.add(row)
        db.commit()
        db.refresh(row)
    return row
