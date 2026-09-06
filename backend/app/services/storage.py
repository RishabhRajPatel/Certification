from pathlib import Path

from app.core.config import settings

TEMPLATES_DIR = Path(settings.UPLOAD_DIR) / "templates"


def ensure_dirs() -> None:
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)


def template_file_path(template_id: str, ext: str) -> Path:
    return TEMPLATES_DIR / f"{template_id}.{ext}"


def delete_template_file(template_id: str, ext: str) -> None:
    template_file_path(template_id, ext).unlink(missing_ok=True)
