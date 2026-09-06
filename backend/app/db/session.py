from collections.abc import Generator

from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings
from app.core.constants import DEFAULT_OFFER_LETTER_TEMPLATE


def _sql_default(value: str) -> str:
    """Quote a string for use as a raw SQL DEFAULT literal."""
    return "'" + value.replace("'", "''") + "'"

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=not _is_sqlite,
)


# Columns added after the initial release. `create_all()` only creates missing
# tables, it never alters existing ones — so on an existing DB file these need
# a manual, additive `ALTER TABLE` to show up. Safe to re-run: each column is
# only added if it isn't already present.
_TEMPLATE_MIGRATIONS = [
    ("is_custom", "BOOLEAN NOT NULL DEFAULT 0"),
    ("background_type", "VARCHAR"),
    ("bg_width_pt", "FLOAT"),
    ("bg_height_pt", "FLOAT"),
    ("layout_json", "TEXT"),
]

_CERTIFICATE_MIGRATIONS = [
    ("verification_token", "VARCHAR"),
    ("verification_token_hash", "VARCHAR"),
    ("expires_at", "DATETIME"),
    ("email_status", "VARCHAR"),
    ("email_sent_at", "DATETIME"),
    ("email_error", "VARCHAR"),
    ("email_recipient", "VARCHAR"),
    ("certificate_type", "VARCHAR NOT NULL DEFAULT 'COMPLETION'"),
    ("work_mode", "VARCHAR"),
    ("performance_rating", "INTEGER"),
    ("skills", "TEXT"),
    ("remarks", "TEXT"),
    ("certificate_text", "TEXT"),
]

_OFFERLETTER_MIGRATIONS = [
    ("email_status", "VARCHAR"),
    ("email_sent_at", "DATETIME"),
    ("email_error", "VARCHAR"),
    ("email_recipient", "VARCHAR"),
    ("compensation_type", "VARCHAR NOT NULL DEFAULT 'FIXED'"),
    ("performance_criteria", "TEXT"),
    ("evaluation_frequency", "VARCHAR"),
]

_SETTING_MIGRATIONS = [
    ("cert_email_auto_send", "BOOLEAN NOT NULL DEFAULT 0"),
    ("cert_email_subject", "VARCHAR NOT NULL DEFAULT 'Your Certificate – {{company_name}}'"),
    ("cert_email_attach_pdf", "BOOLEAN NOT NULL DEFAULT 1"),
    ("cert_email_include_verify_link", "BOOLEAN NOT NULL DEFAULT 1"),
    ("offer_email_auto_send", "BOOLEAN NOT NULL DEFAULT 0"),
    ("offer_email_subject", "VARCHAR NOT NULL DEFAULT 'Your Offer Letter – {{company_name}}'"),
    ("offer_email_attach_pdf", "BOOLEAN NOT NULL DEFAULT 1"),
    ("offer_letter_template", f"TEXT NOT NULL DEFAULT {_sql_default(DEFAULT_OFFER_LETTER_TEMPLATE)}"),
]


def _migrate_columns(table: str, migrations: list[tuple[str, str]]) -> None:
    inspector = inspect(engine)
    if table not in inspector.get_table_names():
        return  # fresh DB — create_all() below will create it with all columns.
    existing = {col["name"] for col in inspector.get_columns(table)}
    with engine.begin() as conn:
        for name, ddl_type in migrations:
            if name not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl_type}"))


def _backfill_certificate_tokens() -> None:
    from sqlmodel import select

    from app.models import Certificate
    from app.services.verification import generate_verification_token, hash_token

    with Session(engine) as db:
        rows = db.exec(select(Certificate).where(Certificate.verification_token_hash == None)).all()  # noqa: E711
        if not rows:
            return
        for cert in rows:
            token = generate_verification_token()
            cert.verification_token = token
            cert.verification_token_hash = hash_token(token)
            db.add(cert)
        db.commit()


def _backfill_certificate_text() -> None:
    from sqlmodel import select

    from app.models import Certificate, Intern, Setting
    from app.services.pdf_certificate import default_certificate_text

    with Session(engine) as db:
        rows = db.exec(select(Certificate).where(Certificate.certificate_text == None)).all()  # noqa: E711
        if not rows:
            return
        settings_row = db.get(Setting, "app") or Setting(id="app")
        for cert in rows:
            intern = db.get(Intern, cert.intern_id)
            cert.certificate_text = default_certificate_text(cert, intern, settings_row)
            db.add(cert)
        db.commit()


def _backfill_offer_compensation_type() -> None:
    """The compensation_type column defaulted every existing row to FIXED —
    rows that never had a stipend were actually unpaid, not fixed-at-zero."""
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE offerletter SET compensation_type = 'UNPAID' "
                "WHERE stipend IS NULL AND compensation_type = 'FIXED'"
            )
        )


def create_db_and_tables() -> None:
    # Import models so their tables are registered on SQLModel.metadata.
    import app.models  # noqa: F401

    _migrate_columns("template", _TEMPLATE_MIGRATIONS)
    _migrate_columns("certificate", _CERTIFICATE_MIGRATIONS)
    _migrate_columns("offerletter", _OFFERLETTER_MIGRATIONS)
    _migrate_columns("setting", _SETTING_MIGRATIONS)
    SQLModel.metadata.create_all(engine)
    _backfill_certificate_tokens()
    _backfill_certificate_text()
    _backfill_offer_compensation_type()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
