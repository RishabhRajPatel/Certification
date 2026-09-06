from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    APP_NAME: str = "Maayad API"
    ENV: str = "development"

    DATABASE_URL: str = "sqlite:///./certifypro.db"

    AUTH_SECRET: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 8

    APP_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:3000"

    UPLOAD_DIR: str = "uploads"

    # SMTP — infra-level config, unlike company-facing content in Setting (DB).
    # Sending gracefully fails (see services/email.py) until SMTP_HOST is set.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Maayad"
    SMTP_USE_TLS: bool = True

    SEED_ADMIN_EMAIL: str = "admin@maayad.com"
    SEED_ADMIN_PASSWORD: str = "Admin@12345"
    SEED_ADMIN_NAME: str = "System Administrator"

    # False on every automated boot in production — the seed script's demo-data
    # reset deletes all interns/certificates/offers unconditionally, which is
    # fine for local dev but must never run against a live database.
    SEED_DEMO_DATA: bool = True

    @property
    def is_production(self) -> bool:
        return self.ENV.lower() == "production"

    @property
    def database_url(self) -> str:
        # Render/Heroku-style Postgres URLs come as "postgres://" or a driverless
        # "postgresql://" — SQLAlchemy needs an explicit DBAPI, so pin psycopg.
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            return "postgresql+psycopg://" + url[len("postgres://"):]
        if url.startswith("postgresql://"):
            return "postgresql+psycopg://" + url[len("postgresql://"):]
        return url

    @staticmethod
    def _with_scheme(url: str) -> str:
        # Render's `fromService` blueprint var injects a bare hostname with no
        # scheme — assume https so the value is still a usable origin/URL.
        return url if url.startswith(("http://", "https://")) else f"https://{url}"

    @property
    def cors_origins_list(self) -> list[str]:
        return [self._with_scheme(o.strip()) for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def app_url(self) -> str:
        return self._with_scheme(self.APP_URL).rstrip("/")


_INSECURE_AUTH_SECRETS = {
    "change-me",
    "change-me-please-generate-a-long-random-secret",
    "change-me-in-production-use-a-long-random-secret",
}


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.is_production and (s.AUTH_SECRET in _INSECURE_AUTH_SECRETS or len(s.AUTH_SECRET) < 32):
        raise RuntimeError(
            "AUTH_SECRET is missing or insecure for ENV=production. "
            "Generate one with `openssl rand -hex 32` and set it via the AUTH_SECRET env var."
        )
    return s


settings = get_settings()
