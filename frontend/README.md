# CertifyPro — Frontend (Next.js 14)

Admin UI for CertifyPro. It is a **Backend-for-Frontend**: it never talks to the database, only to the FastAPI backend over HTTP.

## Run

```bash
npm install
cp .env.example .env        # BACKEND_URL=http://localhost:8000
npm run dev                 # http://localhost:3000
```

Requires the backend running (see ../backend).

## How auth works

1. The login form posts to the frontend route `/api/auth/login`, which calls the backend and stores the returned JWT in an **HTTP-only cookie** (`cf_token`).
2. Server Components read data through `src/lib/api.ts`, which attaches the cookie's token as a `Bearer` header and converts snake_case ↔ camelCase.
3. PDF downloads go through `/api/offers/[id]/pdf` and `/api/certificates/[id]/pdf` route handlers that **proxy** to the backend with the token — so the JWT never reaches browser JavaScript.
4. `middleware.ts` gates every private route on the cookie's presence; the backend remains the real authority (a 401 from the API redirects to `/login`).

## Structure

```
frontend/src/
├── app/
│   ├── (admin)/            # authenticated shell + pages
│   │   ├── dashboard, interns, offers, certificates,
│   │   ├── progress, documents, templates, settings
│   ├── login/              # public login
│   ├── verify/[code]/      # public QR verification page
│   └── api/                # BFF route handlers (auth, pdf proxy)
├── components/             # UI kit + feature components
└── lib/
    ├── api.ts              # typed API client (cookie → Bearer, case convert)
    ├── session.ts          # getCurrentUser / requireUser
    ├── settings.ts, auth.ts, types.ts, constants.ts, utils.ts
    └── actions/            # server actions → call the API
```

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # serve production build
npm run typecheck   # tsc --noEmit
```

## Environment

| Var | Purpose |
|-----|---------|
| `BACKEND_URL` | Base URL of the FastAPI backend (server-side) |
| `NEXT_PUBLIC_APP_URL` | Public URL of this app |
| `NEXT_PUBLIC_COMPANY_NAME` | Company name shown on the public login screen |
