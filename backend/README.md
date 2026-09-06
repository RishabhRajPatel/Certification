# CertifyPro — Backend (FastAPI)

REST API for interns, offer letters, certificates (with QR verification), progress, documents and settings.

## Run

```bash
python3 -m venv .venv && .\.venv\Scripts\Activate
pip install -r requirements.txt
cp .env.example .env          # set a real AUTH_SECRET (openssl rand -hex 32)
python -m app.db.seed         # tables + admin + sample data
uvicorn app.main:app --reload
```

- API base: `http://localhost:8000/api/v1`
- Interactive docs (Swagger): `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

## Tests

```bash
pytest
```

## Project structure

```
backend/
├── app/
│   ├── main.py                 # app, CORS, security headers, router mount, lifespan
│   ├── core/
│   │   ├── config.py           # pydantic-settings (env)
│   │   ├── security.py         # bcrypt hashing + JWT (PyJWT)
│   │   ├── deps.py             # get_current_user, client_meta
│   │   ├── rate_limit.py       # in-memory login throttle
│   │   └── constants.py        # statuses, templates, audit actions
│   ├── db/
│   │   ├── session.py          # engine + get_session
│   │   └── seed.py             # `python -m app.db.seed`
│   ├── models/                 # SQLModel tables (user, intern, document, system)
│   ├── schemas/                # Pydantic request/response DTOs
│   ├── services/               # pdf_offer, pdf_certificate, qr, numbering, audit, settings
│   ├── api/v1/                 # one router per resource + public verify
│   └── utils/                  # time, dates, progress
├── tests/                      # pytest (auth, interns, certificate flow)
├── requirements.txt
├── Dockerfile
└── .env.example
```

## Key endpoints

| Method | Path | Auth | Purpose |
|-------|------|------|---------|
| POST | `/api/v1/auth/login` | – | Login, returns JWT (also sets cookie) |
| POST | `/api/v1/auth/logout` | ✓ | Revoke current session |
| GET | `/api/v1/auth/me` | ✓ | Current admin |
| GET/POST | `/api/v1/interns` | ✓ | List / create interns |
| GET/PUT/DELETE | `/api/v1/interns/{id}` | ✓ | Detail / update / delete |
| GET/POST | `/api/v1/offers` | ✓ | List / generate offer letters |
| GET | `/api/v1/offers/{id}/pdf` | ✓ | Offer letter PDF |
| GET/POST | `/api/v1/certificates` | ✓ | List / generate certificates |
| POST | `/api/v1/certificates/{id}/revoke` | ✓ | Revoke a certificate |
| GET | `/api/v1/certificates/{id}/pdf` | ✓ | Certificate PDF (with QR) |
| GET | `/api/v1/verify/{code}` | **public** | Verify a certificate (QR target) |
| GET | `/api/v1/dashboard` | ✓ | Dashboard aggregates |
| GET/PUT | `/api/v1/settings` | ✓ | Company & document settings |

## Production notes

- Set `ENV=production`, a strong `AUTH_SECRET`, and switch `DATABASE_URL` to PostgreSQL
  (`postgresql+psycopg://...`) — the schema is enum/JSON-free and portable.
- Replace the in-memory rate limiter with Redis for multi-instance deployments.
- Use Alembic for migrations instead of the dev-time `create_all`.
