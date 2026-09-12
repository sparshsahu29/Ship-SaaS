# SaaS Starter

A minimal, production-oriented full-stack starter for new SaaS products. Clone it,
change the branding, and start building your product — authentication, users,
sessions, email and the app shell are already done.

**Stack:** React 19 + Vite + Tailwind CSS v4 (JavaScript) · FastAPI + SQLAlchemy 2 + Alembic · PostgreSQL

See [FEATURES.md](FEATURES.md) for a detailed feature inventory.

**Included**

- Email/password signup & login, Google OAuth, logout
- Forgot/reset password, change password, welcome email on signup
- Server-side sessions in httpOnly cookies, CSRF protection, rate limiting
- Profile update, account deletion
- Blank public landing page, responsive dashboard shell (top bar + user menu) with placeholder dashboard and settings page
- Transactional email abstraction (console / SMTP / Resend)
- Alembic migrations, Docker Compose for local dev, backend + frontend tests

---

## Table of contents

1. [Requirements](#1-requirements)
2. [Installation](#2-installation)
3. [Environment variables](#3-environment-variables)
4. [PostgreSQL setup](#4-postgresql-setup)
5. [Database migrations](#5-database-migrations)
6. [Running the backend](#6-running-the-backend)
7. [Running the frontend](#7-running-the-frontend)
8. [Google OAuth setup](#8-google-oauth-setup)
9. [Email provider setup](#9-email-provider-setup)
10. [Testing](#10-testing)
11. [Production deployment](#11-production-deployment)
12. [Starting a new SaaS from this template](#12-starting-a-new-saas-from-this-template)
13. [Architecture](#13-architecture)
14. [Security decisions](#14-security-decisions)
15. [API reference](#15-api-reference)

---

## 1. Requirements

- Python 3.11+
- Node.js 20+
- PostgreSQL 14+ (or Docker)
- Docker + Docker Compose (optional, for the one-command setup)

## 2. Installation

```bash
git clone <this-repo> my-saas
cd my-saas
cp .env.example .env
cp frontend/.env.example frontend/.env
```

### Option A — Docker (everything)

```bash
docker compose up
```

Starts PostgreSQL, runs migrations, and serves the API on http://localhost:8000
and the frontend on http://localhost:5173.

### Option B — Local

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

## 3. Environment variables

Root `.env` (backend). See `.env.example` for the full annotated list.

| Variable | Required | Description |
| --- | --- | --- |
| `APP_ENV` | yes | `development` \| `production` \| `test` |
| `SECRET_KEY` | yes (prod) | ≥32 random chars. `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `DATABASE_URL` | yes | `postgresql+psycopg://user:pass@host:5432/dbname` |
| `FRONTEND_URL` | yes | Public URL of the frontend. Used for CORS, CSRF, email links, OAuth redirect |
| `BACKEND_URL` | yes | Public URL of the API. Used to build the Google callback URL |
| `CORS_ORIGINS` | no | Extra comma-separated allowed origins |
| `SESSION_COOKIE_NAME` / `SESSION_TTL_DAYS` | no | Defaults `session` / `14` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | Enables the Google button when both are set |
| `EMAIL_PROVIDER` | yes | `console` \| `smtp` \| `resend` |
| `EMAIL_API_KEY` | resend | API key |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | yes | Sender identity |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` / `SMTP_USE_TLS` | smtp | SMTP settings |
| `LOG_LEVEL` | no | Default `INFO` |

`frontend/.env`:

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Base URL of the API, e.g. `http://localhost:8000` |

In `APP_ENV=production` the backend refuses to start if `SECRET_KEY` is weak,
URLs are not `https`, or the email provider is still `console`
(see `backend/app/core/config.py`).

## 4. PostgreSQL setup

With Docker (only the database):

```bash
docker compose up -d db
```

Or on an existing server:

```sql
CREATE USER saas WITH PASSWORD 'change-me';
CREATE DATABASE saas_starter OWNER saas;
```

Then set `DATABASE_URL=postgresql+psycopg://saas:change-me@localhost:5432/saas_starter`.

## 5. Database migrations

```bash
cd backend
alembic upgrade head                          # apply all migrations
alembic revision --autogenerate -m "add projects"   # create a new one after editing models
alembic downgrade -1                          # roll back one step
```

New models must be imported in `backend/app/models/__init__.py` so autogenerate
sees them. `create_all()` is never used; the schema is managed by Alembic only.

## 6. Running the backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs (disabled in production)
- Health: http://localhost:8000/api/health

## 7. Running the frontend

```bash
cd frontend
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## 8. Google OAuth setup

1. Go to https://console.cloud.google.com/apis/credentials and create an
   **OAuth client ID** of type **Web application**.
2. Add **Authorised JavaScript origins**: your `FRONTEND_URL` (e.g. `http://localhost:5173`).
3. Add **Authorised redirect URIs**: `<BACKEND_URL>/api/auth/google/callback`
   (e.g. `http://localhost:8000/api/auth/google/callback`). This must match
   exactly, including scheme and port.
4. Configure the OAuth consent screen (scopes: `openid`, `email`, `profile`).
5. Put the client ID and secret in `.env`:

   ```
   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=...
   ```

The Google button appears automatically. If the variables are not set,
`GET /api/auth/google` returns 404 and the button redirects to a failure message.

**Behaviour:** an existing user with the same (Google-verified) email gets
their `google_id` linked instead of a duplicate account being created. New
Google users are created with `is_email_verified=true` and no password; they can
set one from Settings → Security.

## 9. Email provider setup

Set `EMAIL_PROVIDER` in `.env`:

| Provider | Config | Notes |
| --- | --- | --- |
| `console` | none | Prints emails to the backend log. Development only. |
| `smtp` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_USE_TLS` | Works with any SMTP relay (Postmark, SES, Mailgun, Gmail…). |
| `resend` | `EMAIL_API_KEY` | Uses the Resend HTTP API. |

To add a provider, implement `send(to, subject, html, text)` in
`backend/app/email/providers.py` and register it in `PROVIDERS`. Templates live
in `backend/app/email/templates/*.html|txt` (`$placeholder` syntax).

## 10. Testing

```bash
# Backend — runs against in-memory SQLite, no PostgreSQL needed
cd backend
pytest

# Frontend — Vitest + Testing Library (jsdom), fetch is mocked
cd frontend
npm test
```

Backend tests cover signup, login, logout, `/me`, invalid credentials,
duplicate emails, session expiry, CSRF, password reset (invalid/expired/single-use tokens),
password change with session revocation, Google OAuth (state validation,
account creation and linking), profile update, cascading account deletion and
rate limiting. Frontend tests cover the login/signup forms, protected and guest
routes, auth state restoration, logout and the settings page.

## 11. Production deployment

**Backend** (any container host: Fly, Render, Railway, ECS, a VPS…)

```bash
docker build -t my-saas-api ./backend
# The image runs `alembic upgrade head` and then uvicorn on :8000
```

- Set `APP_ENV=production` and all variables from §3. Put the API behind TLS.
- Run at least one migration step before switching traffic: `alembic upgrade head`.
- Run several uvicorn workers (`--workers 4`) or several instances behind a load
  balancer. If you run more than one instance, swap the in-memory rate limiter
  store for Redis (`backend/app/core/rate_limit.py`, one class).
- If the API and frontend are on different registrable domains (e.g.
  `app.example.com` and `api.example.io`) the `SameSite=Lax` cookie still works
  for XHR but browsers treat them as cross-site; prefer same-site subdomains
  (`app.example.com` + `api.example.com`).

**Frontend** (Vercel, Netlify, Cloudflare Pages, S3+CDN…)

```bash
cd frontend
VITE_API_URL=https://api.example.com npm run build   # deploy dist/
```

Configure SPA fallback so every path serves `index.html`.

## 12. Starting a new SaaS from this template

1. **Fork/clone** this repository into a new repo.
2. **Rename** the project: `frontend/package.json` → `name`, `.env` → `APP_NAME`
   (used in emails and API title).
3. **Brand it:** edit `frontend/src/config/appConfig.js` (name, description,
   support email), swap `frontend/public/logo.svg`, and adjust the CSS variables
   at the top of `frontend/src/index.css` (primary colour, radius, etc.).
4. **Create a database** and set `DATABASE_URL`.
5. **Configure environment variables** (§3).
6. **Configure Google OAuth** (§8) — optional.
7. **Configure the email provider** (§9).
8. **Run migrations:** `alembic upgrade head`.
9. **Replace the placeholders**: the dashboard in `frontend/src/pages/DashboardPage.jsx`
    and the landing hero in `frontend/src/pages/LandingPage.jsx`.
10. **Add product models** under `backend/app/features/<feature>/models.py`,
    import them in `backend/app/models/__init__.py`, and
    `alembic revision --autogenerate`.
11. **Add product API routes** in `backend/app/features/<feature>/router.py`
    and include the router in `backend/app/main.py`. Use `CurrentUser` and `DB`
    from `app.core.dependencies`.
12. **Add product pages** under `frontend/src/features/<feature>/`, register
    routes in `frontend/src/App.jsx` and top-bar links in the `navigation`
    array in `frontend/src/components/Navbar.jsx`.
13. **Deploy** (§11).

Nothing in `backend/app/auth`, `backend/app/users`, `backend/app/core` or
`frontend/src/auth` needs to change for any of the above.

## 13. Architecture

```
saas-starter/
  backend/
    app/
      main.py                  FastAPI app, middleware, router registration, /api/health
      core/
        config.py              Pydantic Settings; fails fast on bad production config
        security.py            Argon2id hashing, token generation/hashing, HMAC-signed values
        dependencies.py        get_db, CurrentUser
        exceptions.py          AppError hierarchy + consistent JSON error handlers
        middleware.py          CSRF origin check, security headers
        rate_limit.py          In-memory fixed-window limiter (dependency)
        logging.py             JSON logs in production
      database/                engine/session factory, Base, TZDateTime, mixins
      models/                  User, Session, OneTimeToken
      schemas/                 Pydantic request/response models
      auth/                    router, service (business logic), google (OAuth), cookies
      users/                   router, service (profile update, deletion)
      email/                   EmailService, providers, HTML/text templates
      features/                <- your product code goes here
    alembic/                   migrations (initial schema included)
    tests/                     pytest suite (SQLite)
  frontend/
    src/
      config/appConfig.js      branding + API URL
      index.css                design tokens (CSS variables) + Tailwind theme mapping
      services/                api.js (fetch wrapper, error normalisation), auth.js, users.js
      auth/                    AuthContext (user, loading, login, signup, logout, refreshUser), ProtectedRoute
      components/              Button, Input, PasswordInput, Card, Modal, Toast, Avatar, Dropdown,
                               Navbar, UserMenu, EmptyState, FormError, LoadingSpinner…
      layouts/                 AuthLayout (public), AppLayout (top bar + content)
      pages/                   Landing, Login, Signup, ForgotPassword, ResetPassword, Dashboard, settings/
      hooks/useForm.js         small form state/validation helper
      features/                <- your product code goes here
    tests/                     Vitest + Testing Library
  docker-compose.yml           postgres + backend + frontend
  .env.example
```

**Request flow:** React → `services/api.js` (fetch, `credentials: 'include'`) →
FastAPI router → service → SQLAlchemy → PostgreSQL. Routers are thin; all logic
lives in `service.py` modules so it can be reused and unit-tested.

**Auth state:** on load the frontend calls `GET /api/auth/me`. Until it
resolves, `ProtectedRoute`/`GuestRoute` render a spinner, so protected UI never
flashes. A `401 not_authenticated` from any call clears the user.

**Extensibility hooks:** `user.role` (default `user`) for future admin
features; `features/` folders on both sides for product code; optional
`billing/` (Stripe) and `usage/` modules can be added as features without
touching auth. None are implemented — nothing fake is shipped.

## 14. Security decisions

| Topic | Decision |
| --- | --- |
| **Sessions** | Server-side sessions, not JWTs. A 256-bit random token is stored in an `httpOnly`, `SameSite=Lax`, `Secure` (prod) cookie; only its SHA-256 hash is stored in `sessions`. Logout, password reset and account deletion revoke sessions instantly — no refresh-token/rotation machinery needed. TTL 14 days (configurable). |
| **Passwords** | Argon2id via `argon2-cffi` with library defaults; hashes are transparently upgraded on login if parameters change. Minimum 8 chars, max 128. Users created via Google have no password until they set one. |
| **CSRF** | `SameSite=Lax` cookie + Origin/Referer check on every `POST/PUT/PATCH/DELETE` (must match `FRONTEND_URL`/`CORS_ORIGINS`). Browsers always send `Origin` on cross-origin fetches and it cannot be spoofed by a page, so no CSRF token is needed for a JSON API. |
| **CORS** | Only `FRONTEND_URL` + `CORS_ORIGINS`, `allow_credentials=True`, explicit methods/headers. Never `*`. |
| **One-time tokens** | Password reset tokens (60 min) are random, stored hashed, single-use, and superseded when a new one is issued. Successful reset revokes all sessions. The `one_time_tokens` table is generic (`purpose` enum) so further flows can reuse it. |
| **Enumeration** | `forgot-password` always returns the same message; login returns the same error for unknown email and wrong password; failed logins are logged with only the email domain. |
| **Google OAuth** | Authorization-code flow entirely server-side. `state` is HMAC-signed with `SECRET_KEY`, time-limited (10 min) and mirrored in a cookie scoped to `/api/auth/google`. Profile is fetched from Google's userinfo endpoint over the back channel; `email_verified` is required before linking. |
| **Rate limiting** | Auth endpoints: 10 req/min per IP; forgot-password: 5 per 15 min. `X-Forwarded-For` is only trusted in production (behind your proxy). |
| **Errors** | One shape: `{"error": {"code", "message", "details?"}}`. Unhandled exceptions are logged with stack trace and returned as a generic 500. OpenAPI docs disabled in production. |
| **Headers** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Cache-Control: no-store`, HSTS in production. |
| **Logging** | Structured JSON in production. Passwords, session tokens, one-time tokens and OAuth secrets are never logged; email bodies are never logged on failure. |
| **Deletion** | `DELETE /api/users/me` hard-deletes the user; `sessions` and `one_time_tokens` cascade at the DB level (`ON DELETE CASCADE`). Product tables must declare their own FK behaviour. |

## 15. API reference

All endpoints are under `/api`. Interactive docs at `/docs` in development.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | – | Liveness + DB check |
| POST | `/auth/signup` | – | Create account, sets session cookie, sends welcome email |
| POST | `/auth/login` | – | Sets session cookie |
| POST | `/auth/logout` | cookie | Revokes session, clears cookie |
| GET | `/auth/me` | cookie | Current user |
| POST | `/auth/forgot-password` | – | `{email}` — always 200 |
| POST | `/auth/reset-password` | – | `{token, password}` — revokes all sessions |
| POST | `/auth/change-password` | cookie | `{current_password?, new_password}` — keeps current session, revokes others |
| GET | `/auth/google` | – | Redirects to Google |
| GET | `/auth/google/callback` | – | Handles the callback, redirects to `/app/dashboard` or `/login?error=google` |
| PATCH | `/users/me` | cookie | `{name}` |
| DELETE | `/users/me` | cookie | Deletes the account (204) |

Error codes you may want to handle in the UI: `validation_error` (422, with
`details[]`), `invalid_credentials`, `email_taken`, `invalid_token`,
`invalid_password`, `not_authenticated`, `csrf_failed`, `rate_limited` (429,
with `Retry-After`).
