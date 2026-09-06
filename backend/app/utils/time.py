from datetime import datetime, timezone


def utcnow() -> datetime:
    """Naive UTC timestamp — consistent with values read back from SQLite."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
