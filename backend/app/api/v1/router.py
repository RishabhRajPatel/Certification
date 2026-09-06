from fastapi import APIRouter

from app.api.v1 import (
    auth,
    certificates,
    dashboard,
    documents,
    interns,
    offers,
    progress,
    templates,
    verify,
)
from app.api.v1 import settings as settings_api

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(interns.router)
api_router.include_router(offers.router)
api_router.include_router(certificates.router)
api_router.include_router(templates.router)
api_router.include_router(progress.router)
api_router.include_router(documents.router)
api_router.include_router(settings_api.router)
api_router.include_router(verify.router)
