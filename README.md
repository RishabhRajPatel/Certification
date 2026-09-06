# CertifyPro

**Industrial-grade Internship, Offer Letter & Certificate management platform.**

A secure admin panel to manage interns, generate auto-numbered **offer letters** and **QR-verifiable certificates** as PDFs, track internship progress, and let anyone verify a certificate's authenticity from a public link.

It is a decoupled monorepo:

```
certifypro/
├── backend/     FastAPI + SQLModel REST API (auth, PDF/QR, business logic)
├── frontend/    Next.js 14 admin UI (consumes the API, BFF auth)
└── docker-compose.yml
```

---

## Architecture

```
Browser ──► Next.js frontend (BFF) ──► FastAPI backend ──► Database (SQLite/Postgres)
             • server components fetch      • JWT auth (bcrypt)
               data from the API            • ReportLab PDF generation
             • /api/auth/* sets an           • QR verification
               HTTP-only cookie             • audit logging
             • /api/**/pdf proxies           • auto document numbering
               downloads with the token      • OpenAPI docs at /docs
```

- **Backend owns everything sensitive**: the database, authentication, and all document generation. Certificates and offer letters can **only** be generated/downloaded by an authenticated admin request — never from a public API.
- **Frontend is a BFF (Backend-for-Frontend)**: on login it stores the JWT in an **HTTP-only cookie**; server components attach it as a Bearer token when calling the API, and PDF downloads are proxied so the token never touches the browser's JS.
- **Public verification** (`/verify/{code}`) is the only unauthenticated surface — it's the QR-code target printed on every certificate.

---

## Quick start

### Option A — Docker (one command)

```bash
docker compose up --build
# Frontend → http://localhost:3000
# Backend  → http://localhost:8000/docs
```

The backend seeds an admin + sample data on first boot.

### Option B — Run locally

**1. Backend**

```bash
cd backend
python -m venv .venv && source .venv/Scripts/Activate
pip install -r requirements.txt
cp .env.example .env            # then set a real AUTH_SECRET
python -m app.db.seed           # creates tables + admin + sample data
uvicorn app.main:app --reload   # http://localhost:8000  (docs at /docs)
```

**2. Frontend** (new terminal)

```bash
cd frontend
npm install
cp .env.example .env            # BACKEND_URL=http://localhost:8000
npm run dev                     # http://localhost:3000
```

### Demo login

```
admin@certifypro.com  /  Admin@12345
```

---

## Features

| Area | What it does |
|------|--------------|
| **Auth** | JWT (HS256) in HTTP-only cookies, bcrypt hashing, login rate-limiting, server-side sessions with remote logout, audit log, password policy |
| **Interns** | Full CRUD, search & status filters, auto ID `INT-YYYY-#####`, progress + documents per intern |
| **Offer letters** | Guided generate flow, 3 templates, auto number `OFF-YYYY-#####`, professional ReportLab PDF |
| **Certificates** | Guided generate flow, 3 templates, auto number `CERT-YYYY-#####`, **QR code** → public verify page, revoke/reinstate |
| **Verification** | Public `/verify/{code}` shows Valid / Revoked / Not-found with full details |
| **Progress** | Timeline % + task checklist per intern, inline status changes |
| **Documents** | Unified library of all offers/certificates with type & search filters |
| **Templates** | Preview designs, set defaults per document type |
| **Settings** | Company profile, document prefixes, signatory, brand color, active sessions, change password |

---

## Security highlights

- Passwords hashed with **bcrypt** (cost 12); enforced strength policy.
- Stateless **JWT** + server-side **session records** → real remote logout / "sign out other devices".
- **HTTP-only, SameSite** cookies on the frontend; token never exposed to client JS.
- **Login rate-limiting** to blunt brute-force.
- **CORS** locked to configured origins; **security headers** on every response.
- Document generation & download require **authenticated admin** requests only.
- **Audit log** of logins, generation, downloads, revocations, and setting changes.
- All secrets via **environment variables** (`.env`, never committed).

---

## Tech stack

**Backend:** FastAPI · SQLModel (SQLAlchemy 2) · Pydantic v2 · PyJWT · bcrypt · ReportLab · qrcode/Pillow · pytest
**Frontend:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Server Actions · lucide-react

**Database:** SQLite for zero-config dev; switch `DATABASE_URL` to PostgreSQL for production.

---

## Tests

```bash
cd backend && source .venv/bin/activate && pytest      # 8 tests: auth, interns, cert+PDF+verify
cd frontend && npm run typecheck && npm run build       # strict TS + production build
```

See `backend/README.md` and `frontend/README.md` for details.
