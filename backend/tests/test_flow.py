def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login_rejects_bad_credentials(client):
    r = client.post("/api/v1/auth/login", json={"email": "admin@certifypro.com", "password": "wrong"})
    assert r.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_with_auth(auth_client):
    r = auth_client.get("/api/v1/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == "admin@certifypro.com"


def test_dashboard(auth_client):
    r = auth_client.get("/api/v1/dashboard")
    assert r.status_code == 200
    body = r.json()
    assert body["total_interns"] >= 1
    assert "status_counts" in body


def test_intern_crud_and_numbering(auth_client):
    payload = {
        "full_name": "Test Intern",
        "email": "test.intern@example.com",
        "role": "QA Intern",
        "department": "Quality",
        "start_date": "2026-01-01T00:00:00",
        "end_date": "2026-04-01T00:00:00",
        "status": "ACTIVE",
    }
    r = auth_client.post("/api/v1/interns", json=payload)
    assert r.status_code == 201, r.text
    intern = r.json()
    assert intern["intern_code"].startswith("INT-")
    intern_id = intern["id"]

    # duplicate email rejected
    assert auth_client.post("/api/v1/interns", json=payload).status_code == 409

    # detail includes progress
    d = auth_client.get(f"/api/v1/interns/{intern_id}")
    assert d.status_code == 200
    assert "progress" in d.json()


def test_generate_certificate_pdf_and_public_verify(auth_client, client):
    # create an intern
    r = auth_client.post("/api/v1/interns", json={
        "full_name": "Cert Candidate",
        "email": "cert.candidate@example.com",
        "role": "Backend Intern",
        "start_date": "2026-01-01T00:00:00",
        "end_date": "2026-03-01T00:00:00",
        "status": "COMPLETED",
    })
    assert r.status_code == 201, r.text
    intern_id = r.json()["id"]

    # generate a certificate
    c = auth_client.post("/api/v1/certificates", json={
        "intern_id": intern_id,
        "role": "Backend Intern",
        "start_date": "2026-01-01T00:00:00",
        "end_date": "2026-03-01T00:00:00",
        "authorized_name": "Aarti Mehra",
        "authorized_designation": "Head of HR",
    })
    assert c.status_code == 201, c.text
    cert = c.json()
    assert cert["status"] == "DRAFT"
    assert cert["number"].startswith("CERT-")
    # A draft's verify_url isn't exposed via the API (it's not publicly
    # verifiable yet) — read the raw token straight from the DB for this check.
    from app.db.session import engine
    from app.models import Certificate as CertificateModel
    from sqlmodel import Session

    with Session(engine) as db:
        draft_token = db.get(CertificateModel, cert["id"]).verification_token

    # PDF renders even while still a draft (admin needs to preview it)
    pdf = auth_client.get(f"/api/v1/certificates/{cert['id']}/pdf")
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert pdf.content[:4] == b"%PDF"

    # a draft is not publicly verifiable yet — it hasn't been issued
    draft_verify = client.get(f"/api/v1/verify/{draft_token}")
    assert draft_verify.json()["status"] == "NOT_FOUND"

    # issuing flips it to VALID (email auto-send is off by default, so no
    # email attempt happens here)
    issued = auth_client.post(f"/api/v1/certificates/{cert['id']}/issue")
    assert issued.status_code == 200, issued.text
    assert issued.json()["status"] == "VALID"
    token = issued.json()["verify_url"].rsplit("/", 1)[-1]
    assert token == draft_token  # same token throughout — only its visibility/validity changes

    # public verification (no auth) works via the token...
    v = client.get(f"/api/v1/verify/{token}")
    assert v.status_code == 200
    body = v.json()
    assert body["valid"] is True
    assert body["intern_name"] == "Cert Candidate"

    # ...but NOT via the human-readable certificate number (closes enumeration).
    by_number = client.get(f"/api/v1/verify/{cert['number']}")
    assert by_number.json()["status"] == "NOT_FOUND"

    # revoke -> verification invalid
    assert auth_client.post(f"/api/v1/certificates/{cert['id']}/revoke").status_code == 200
    v2 = client.get(f"/api/v1/verify/{token}")
    assert v2.json()["valid"] is False


def test_verify_unknown_code(client):
    r = client.get("/api/v1/verify/CERT-9999-99999")
    assert r.status_code == 200
    assert r.json()["status"] == "NOT_FOUND"
