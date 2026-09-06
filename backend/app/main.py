from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import create_db_and_tables
from app.services.storage import ensure_dirs


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Dev convenience: ensure tables exist. Use Alembic for prod migrations.
    create_db_and_tables()
    ensure_dirs()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Maayad — Internship, offer letter & certificate management API.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_DOCS_PATHS = {"/docs", "/redoc", "/openapi.json"}


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # Skip on /docs & friends — Swagger/Redoc load their UI assets from a CDN
    # and would be broken by a locked-down CSP. Everywhere else is pure JSON.
    if request.url.path not in _DOCS_PATHS:
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


app.include_router(api_router, prefix="/api/v1")

# Uploaded template backgrounds — served unauthenticated, same trust level as
# the existing plain-URL logo/signature/stamp fields in Settings.
ensure_dirs()
app.mount("/media", StaticFiles(directory=settings.UPLOAD_DIR), name="media")


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.ENV}


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")
