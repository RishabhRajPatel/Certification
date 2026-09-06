import os

# Configure an isolated test environment BEFORE importing the app.
os.environ["DATABASE_URL"] = "sqlite:///./test_certifypro.db"
os.environ["AUTH_SECRET"] = "test-secret-0123456789abcdef0123456789abcdef"
os.environ["APP_URL"] = "http://testserver"
os.environ.setdefault("SEED_ADMIN_EMAIL", "admin@certifypro.com")
os.environ.setdefault("SEED_ADMIN_PASSWORD", "Admin@12345")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _prepare_db():
    # Fresh database for the test session.
    for f in ("./test_certifypro.db", "./test_certifypro.db-journal"):
        if os.path.exists(f):
            os.remove(f)
    from app.db import seed as seed_module

    seed_module.seed()
    yield
    for f in ("./test_certifypro.db", "./test_certifypro.db-journal"):
        if os.path.exists(f):
            os.remove(f)


@pytest.fixture
def client():
    from app.main import app

    return TestClient(app)


@pytest.fixture
def auth_client(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@certifypro.com", "password": "Admin@12345"},
    )
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client
