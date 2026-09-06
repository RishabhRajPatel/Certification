from datetime import datetime


def month_label(start: datetime, end: datetime) -> str:
    months = (end.year - start.year) * 12 + (end.month - start.month)
    if months <= 0:
        days = max(0, (end - start).days)
        return f"{days} Day{'' if days == 1 else 's'}"
    return f"{months} Month{'' if months == 1 else 's'}"
