# ── Maayad FastAPI backend ───────────────────────────────────
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# libreoffice-writer (not the full libreoffice-fresh) converts uploaded .docx
# templates to PDF headlessly — see services/docx_convert.py. Everything else
# (ReportLab, qrcode, pypdf) is pure-Python wheels, kept minimal on purpose.
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

EXPOSE 8000

# Create tables + seed on first boot, then serve. (Use Alembic for prod migrations.)
CMD ["sh", "-c", "python -m app.db.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
