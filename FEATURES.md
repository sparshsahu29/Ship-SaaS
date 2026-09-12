# Features

A detailed inventory of everything the boilerplate ships with. Each entry lists
what the feature does, how it behaves, and where the code lives, so you can
decide what to keep, extend or remove when starting a new product.

Legend for file references: `B:` = `backend/app/`, `F:` = `frontend/src/`.

---

## 1. Authentication

### 1.1 Email/password signup
- `POST /api/auth/signup` with `{name, email, password}`.
- Email is trimmed and lower-cased; must be unique (409 `email_taken` otherwise, including under concurrent requests via the DB unique constraint).
- Password: 8–128 characters, hashed with **Argon2id**.
- Name: 1–120 characters, whitespace trimmed.
- On success: user is created, a **session cookie is set immediately** (no confirmation step), a **welcome email** is sent, and the user object is returned (`201`). Email failure is logged but never blocks signup.
- Files: `B:auth/router.py`, `B:auth/service.py::signup`, `B:schemas/auth.py::SignupRequest`, `F:pages/SignupPage.jsx`.

### 1.2 Email/password login
- `POST /api/auth/login` with `{email, password}`.
- Same `401 invalid_credentials` for unknown email and wrong password (no account enumeration). Deactivated accounts get `account_disabled`.
- Argon2 hashes are transparently re-hashed on login if hashing parameters change.
- Sets the session cookie and returns the user.
- Files: `B:auth/service.py::authenticate`, `F:pages/LoginPage.jsx`.

### 1.3 Google OAuth (sign in / sign up / link)
- `GET /api/auth/google` → 302 to Google's consent screen. Returns 404 `google_not_configured` when `GOOGLE_CLIENT_ID`/`SECRET` are not set.
- `GET /api/auth/google/callback` exchanges the code **server-side** using the client secret, fetches the profile from Google's OpenID userinfo endpoint, then:
  - existing user with this `google_id` → log in;
  - existing user with the same email (Google must report `email_verified=true`) → link `google_id`, set `is_email_verified=true`, backfill avatar → log in;
  - otherwise → create a new user with no password, `is_email_verified=true`, avatar from Google.
- `state` parameter is HMAC-signed with `SECRET_KEY`, expires after 10 minutes, and must match a short-lived cookie scoped to `/api/auth/google`.
- Any failure redirects to `FRONTEND_URL/login?error=google`; success redirects to `/app/dashboard` with the session cookie set.
- Files: `B:auth/google.py`, `B:auth/service.py::login_or_register_google_user`, `B:auth/cookies.py`, `F:components/GoogleButton.jsx`.

### 1.4 Sessions (persistent login)
- **Server-side sessions**, not JWTs. A 256-bit random token is issued per login and stored in an `httpOnly`, `SameSite=Lax`, `Secure` (production) cookie; only its **SHA-256 hash** is stored in the `sessions` table.
- Default TTL 14 days (`SESSION_TTL_DAYS`). Expired sessions are deleted on first use.
- Records `user_agent`, `ip_address`, `created_at`, `last_seen_at` (throttled to one write per minute).
- Sessions survive page refresh: the frontend calls `GET /api/auth/me` on load.
- Files: `B:models/session.py`, `B:auth/service.py` (create/get/revoke), `B:core/dependencies.py::CurrentUser`.

### 1.5 Current user endpoint
- `GET /api/auth/me` → the authenticated user (`401 not_authenticated` otherwise).
- Response shape: `id, email, name, avatar_url, role, is_email_verified, has_password, has_google, created_at`. Never includes the password hash or google_id.
- Files: `B:schemas/user.py::UserRead`.

### 1.6 Logout
- `POST /api/auth/logout` deletes the session row and clears the cookie. Idempotent.
- Available from the user menu (top bar) and Settings → Security.
- Files: `B:auth/router.py::logout`, `F:components/UserMenu.jsx`.

### 1.7 Forgot password
- `POST /api/auth/forgot-password` with `{email}`.
- Always returns `200` with the same message, whether or not the account exists.
- If the account exists and is active: any previous reset token is deleted, a new random token is generated, its hash is stored with a 60-minute expiry (`PASSWORD_RESET_TTL_MINUTES`), and a reset email with `FRONTEND_URL/reset-password?token=…` is sent.
- Rate-limited to 5 requests per 15 minutes per IP.
- Files: `B:auth/service.py::request_password_reset`, `F:pages/ForgotPasswordPage.jsx`.

### 1.8 Reset password
- `POST /api/auth/reset-password` with `{token, password}`.
- Token must exist, be unused, unexpired and of purpose `password_reset`; otherwise `400 invalid_token`.
- On success: new Argon2id hash stored, token marked used, **all sessions revoked**, `is_email_verified` set to true (mailbox control proven), cookie cleared.
- Frontend page reads `?token=` from the URL, validates length/match, shows success state with a link to sign in.
- Files: `B:auth/service.py::reset_password`, `F:pages/ResetPasswordPage.jsx`.

### 1.9 Change password (authenticated)
- `POST /api/auth/change-password` with `{current_password?, new_password}`.
- Requires the current password when the user has one (`401 invalid_password` if wrong). Users who signed up with Google and have no password can **set** one without a current password.
- Revokes every other session; the current device stays logged in.
- Files: `B:auth/service.py::change_password`, `F:pages/settings/SecuritySection.jsx`.

### 1.10 Protected API routes
- Any endpoint can depend on `CurrentUser` (`B:core/dependencies.py`) to require authentication. Returns `401 not_authenticated` when the cookie is missing, invalid, expired, or the user is inactive.
- `get_current_user_optional` is available for endpoints that behave differently for guests.

### 1.11 Protected frontend routes
- `ProtectedRoute` wraps `/app/*`: shows a full-page spinner until the auth check resolves, then redirects unauthenticated users to `/login` (remembering the attempted path).
- `GuestRoute` wraps `/login`, `/signup`, `/forgot-password`, `/reset-password`: authenticated users are redirected to `/app/dashboard`.
- No protected UI is ever flashed before auth state is known.
- Files: `F:auth/ProtectedRoute.jsx`, `F:App.jsx`.

### 1.12 Frontend auth state
- `AuthContext` exposes `user`, `loading`, `isAuthenticated`, `login()`, `signup()`, `logout()`, `refreshUser()`, `setUser()`.
- Calls `GET /api/auth/me` on startup.
- Subscribes to the API client: any response with `401 not_authenticated` clears the user (session expired elsewhere), while other 401s (e.g. wrong password) are treated as ordinary form errors.
- Files: `F:auth/AuthContext.jsx`, `F:services/api.js::onUnauthorized`.

---

## 2. User management

### 2.1 Profile update
- `PATCH /api/users/me` with `{name}`. Only `name` is writable; unknown fields (email, role, …) are ignored.
- Settings → Profile shows avatar (Google picture or initials), name, read-only email, and "Member since" date.
- Files: `B:users/router.py`, `B:users/service.py::update_user`, `F:pages/settings/ProfileSection.jsx`.

### 2.2 Account deletion
- `DELETE /api/users/me` → `204`, hard-deletes the user and clears the cookie.
- `sessions` and `one_time_tokens` rows cascade via `ON DELETE CASCADE` foreign keys.
- UI requires typing `DELETE` in a modal before the button is enabled.
- Files: `B:users/service.py::delete_user`, `F:pages/settings/AccountSection.jsx`.

### 2.3 User model
`users` table: `id` (UUID PK), `email` (unique, indexed), `name`, `password_hash` (nullable), `google_id` (unique, indexed, nullable), `avatar_url`, `role` (default `user`), `is_active`, `is_email_verified`, `created_at`, `updated_at` (timezone-aware).
- `role` is present so admin features can be added later; nothing in the app grants or checks admin rights yet.
- `is_email_verified` is a plain flag: true for Google sign-ups and after a password reset, false for plain email signups. No verification-link flow is included.
- Files: `B:models/user.py`.

---

## 3. Security

| Feature | Implementation |
| --- | --- |
| Password hashing | Argon2id (`argon2-cffi` defaults), auto re-hash on parameter change. |
| Session secrecy | Random 256-bit tokens; only SHA-256 hashes persisted. |
| Cookie flags | `HttpOnly`, `SameSite=Lax`, `Secure` in production, explicit `Max-Age`, `Path=/`. |
| CSRF | `SameSite=Lax` **plus** Origin/Referer verification on every `POST/PUT/PATCH/DELETE`. Requests with a foreign origin are rejected (`403 csrf_failed`); requests presenting a session cookie without any `Origin` header are rejected too. No CSRF token needed for the JSON API. `B:core/middleware.py::CSRFMiddleware` |
| CORS | Only `FRONTEND_URL` + `CORS_ORIGINS`; `allow_credentials=True`; explicit method/header lists; never `*`. |
| Rate limiting | Fixed-window, per-IP, in-memory. Auth endpoints (signup, login, reset, change-password, Google): 10/min. Forgot-password: 5/15 min. Returns `429 rate_limited` with `Retry-After`. Disabled under `APP_ENV=test`. `X-Forwarded-For` trusted only in production. Store is a single class — swap for Redis when running multiple instances. `B:core/rate_limit.py` |
| One-time tokens | Random, hashed at rest, expiring, single-use (`used_at`), superseded when a new one is issued for the same user/purpose. `B:models/token.py` |
| OAuth state | HMAC-SHA256-signed with `SECRET_KEY`, 10-minute expiry, mirrored in a path-scoped cookie. |
| Account enumeration | Identical responses for unknown-email vs wrong-password login; forgot-password always 200. |
| Security headers | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cache-Control: no-store`; `Strict-Transport-Security` in production. `B:core/middleware.py::SecurityHeadersMiddleware` |
| Error hygiene | Unhandled exceptions → generic `500 internal_error`; stack traces only in logs. OpenAPI/Swagger disabled in production. |
| Config fail-fast | In production the app refuses to boot with the default/short `SECRET_KEY`, non-HTTPS `FRONTEND_URL`/`BACKEND_URL`, `EMAIL_PROVIDER=console`, or a provider missing its credentials. `B:core/config.py` |
| Logging hygiene | Passwords, session tokens, reset tokens, OAuth secrets and email bodies are never logged. Failed logins log only the email domain. |

---

## 4. Email

### 4.1 Service abstraction
- `EmailService` with `send_welcome_email(to, name)` and `send_password_reset_email(to, name, token)`.
- Injected via `Depends(get_email_service)`, so tests replace it with an in-memory capture.
- Files: `B:email/service.py`.

### 4.2 Providers (selected by `EMAIL_PROVIDER`)
| Provider | Purpose | Config |
| --- | --- | --- |
| `console` | Development — prints the email to the backend log | none |
| `smtp` | Any SMTP relay (Postmark, SES, Mailgun, Gmail…) via stdlib `smtplib` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_USE_TLS` |
| `resend` | Resend HTTP API via `httpx` | `EMAIL_API_KEY` |

Adding a provider = one class with `send(to, subject, html, text)` registered in `PROVIDERS`. Files: `B:email/providers.py`.

### 4.3 Templates
- `_layout.html` (shared wrapper) + per-email `*.html` and `*.txt` using `$placeholder` syntax (stdlib `string.Template`, no Jinja dependency). HTML values are escaped.
- Included: `welcome`, `reset_password`.
- Files: `B:email/templates/`.

---

## 5. Database & migrations

- PostgreSQL via SQLAlchemy 2.x (typed `Mapped[]` models) and psycopg 3.
- Tables: `users`, `sessions`, `one_time_tokens` with UUID primary keys, timezone-aware timestamps, indexes on every lookup column, and `ON DELETE CASCADE` FKs to `users`.
- `TZDateTime` type decorator keeps datetimes UTC-aware on SQLite too, so the test suite runs without Postgres.
- Alembic configured (`alembic upgrade head`, `alembic revision --autogenerate`), reading `DATABASE_URL` from the environment. Initial migration included and verified to match the models. `create_all()` is never used.
- `get_db` dependency: one session per request, commit on success, rollback on exception.
- Files: `B:database/`, `B:models/`, `backend/alembic/`.

---

## 6. API infrastructure

- **Health**: `GET /api/health` → `{status, database, env}`; runs `SELECT 1`.
- **Consistent errors**: every error is `{"error": {"code", "message", "details?"}}`. Validation errors (`422 validation_error`) include `details: [{field, message}]`. Codes: `validation_error`, `invalid_credentials`, `email_taken`, `invalid_token`, `invalid_password`, `not_authenticated`, `forbidden`, `not_found`, `csrf_failed`, `rate_limited`, `google_oauth_failed`, `internal_error`.
- **OpenAPI docs** at `/docs` (development only), endpoints tagged `Authentication`, `Users`, `Health`.
- **Structured logging**: human-readable in development, JSON lines in production (`time, level, logger, message, + extras`).
- **Router/service separation**: routers only parse input and shape output; all logic lives in `service.py` modules.
- Files: `B:main.py`, `B:core/exceptions.py`, `B:core/logging.py`.

---

## 7. Frontend application

### 7.1 Pages
| Route | Page | Notes |
| --- | --- | --- |
| `/` | LandingPage | Public, blank hero with app name/description. Guests see **Log in** / **Sign up** in the header and **Create account** / **Log in** CTAs; signed-in users see **Go to dashboard**. Intended to be replaced with marketing content. |
| `/login` | LoginPage | Google button, divider, email/password, forgot-password link, signup link, inline + API errors, Google failure banner via `?error=google` |
| `/signup` | SignupPage | Name, email, password, confirm, Google button, client-side validation |
| `/forgot-password` | ForgotPasswordPage | Success state with the server's neutral message |
| `/reset-password?token=` | ResetPasswordPage | Missing-token state, validation, success state |
| `/app` | AppLayout | Redirects to dashboard |
| `/app/dashboard` | DashboardPage | "Welcome back, {first name}" + `EmptyState` placeholder ("Your product starts here.") |
| `/app/settings` | SettingsPage | Profile, Security, Account sections |
| `*` | NotFoundPage | Links to dashboard or login depending on auth state |

### 7.2 App shell
- **No sidebar** — a single top bar keeps the shell minimal and leaves the full width for product UI.
- **Navbar**: logo (links to dashboard), horizontal links driven by a single `navigation` array (Dashboard by default; add product pages here), user menu on the right. Sticky, translucent.
- **UserMenu**: avatar trigger opens an accessible dropdown (roles `menu`/`menuitem`, arrow-key navigation, Escape/outside-click to close) showing name/email, **Settings** (gear icon) and **Log out**. Settings is reached only from here, keeping the nav bar uncluttered.
- **Logout** (`useLogout`) navigates to the landing page first, then clears the session, so users never flash through `/login`.
- Files: `F:layouts/AppLayout.jsx`, `F:components/Navbar.jsx`, `F:components/UserMenu.jsx`, `F:auth/useLogout.js`.

### 7.3 Reusable components (`F:components/`)
`Button` (variants primary/secondary/ghost/destructive, sizes, loading, fullWidth, renders a router `<Link>` when given `to`) · `Input` (label, error, hint, trailing slot, aria wiring) · `PasswordInput` (show/hide toggle) · `FormError` / `FormErrorBanner` · `Card` / `CardHeader` / `CardBody` · `Modal` (native `<dialog>`, focus trap, Escape/backdrop close) · `Toast` / `ToastProvider` / `useToast` (success/error/info, auto-dismiss, `aria-live`) · `LoadingSpinner` / `FullPageSpinner` · `Avatar` (image with fallback to initials) · `Dropdown` / `DropdownItem` / `DropdownSeparator` · `EmptyState` · `Logo` · `GoogleButton`.

### 7.4 Data layer
- `services/api.js`: single `fetch` wrapper — base URL from `VITE_API_URL`, `credentials: 'include'`, JSON encode/decode, `204` handling, network-error normalisation, `ApiError` with `status/code/message/details/fieldErrors`, 401 subscription hook.
- `services/auth.js`, `services/users.js`: one function per endpoint. Components never call `fetch` directly.
- `hooks/useForm.js`: values, per-field errors, form-level error, submitting state, maps backend `422` details onto fields; `validators` for required/email/password/match.

### 7.5 Branding & theming
- `config/appConfig.js`: `appName`, `description`, `logo`, `supportEmail`, `primaryColor`, `apiUrl`. Sets `document.title`. Nothing else hard-codes the product name.
- `index.css`: design tokens as CSS variables (`--color-primary`, `--color-background`, `--color-foreground`, `--color-muted`, `--color-border`, `--color-card`, `--color-destructive`, `--color-success`, `--radius`) mapped into Tailwind v4 utilities (`bg-primary`, `text-muted`, …).
- `public/logo.svg` placeholder.

### 7.6 Accessibility
Labelled inputs with `aria-invalid`/`aria-describedby`, `role="alert"` errors, keyboard-navigable dropdowns, native dialog semantics, visible focus rings, `aria-busy` on loading buttons, `aria-live` toasts, decorative SVGs hidden from screen readers.

---

## 8. Developer experience

- **Docker Compose**: `db` (Postgres 16, healthcheck, volume), `backend` (auto `alembic upgrade head`, hot reload), `frontend` (Vite dev server). `docker compose up` brings up the whole stack.
- **Backend Dockerfile** (python 3.12-slim) for production images.
- `.env.example` (root, backend) and `frontend/.env.example`, fully annotated. `.gitignore` excludes real `.env` files, venvs, node_modules, build output, SQLite files.
- `.gitattributes` forces LF line endings.
- `AGENTS.md` with verification commands and conventions.
- Extension points: `backend/app/features/` and `frontend/src/features/` each contain a README describing how to add product code without touching auth.
- `README.md`: requirements, installation, env vars, Postgres setup, migrations, running backend/frontend, Google OAuth setup, email provider setup, testing, production deployment, "starting a new SaaS from this template", architecture, security decisions, API reference.

---

## 9. Tests

### Backend — `backend/tests/` (pytest, in-memory SQLite, 47 tests)
- **Signup**: creates user, sets cookie, sends welcome email; succeeds when email sending fails; normalises email and rejects duplicates; validation errors per field; Argon2id hash stored.
- **Login/session**: success; wrong password; unknown email gives identical error; `/me` requires auth; garbage cookie rejected; logout revokes; token stored hashed; expired session rejected.
- **CSRF**: foreign origin blocked; missing origin with cookie blocked.
- **Password reset**: forgot-password does not reveal accounts; full reset flow (sessions revoked, old password dead, token single-use); new request invalidates previous token; invalid token; expired token; token stored hashed.
- **Change password**: success keeps current session; wrong current password; other sessions revoked.
- **Google OAuth**: 404 when unconfigured; state cookie set; new verified user created; existing email account linked (no duplicate); forged state rejected; missing state cookie rejected; unverified Google email rejected; provider error handled.
- **Users**: name update (trimmed); empty name rejected, unknown fields ignored; auth required; deletion cascades to sessions/tokens and invalidates login.
- **Infrastructure**: rate limit returns 429; 404 error format; security headers; production config fail-fast (5 cases); CORS origin merging.

### Frontend — `frontend/tests/` (Vitest + Testing Library + jsdom, mocked fetch, 22 tests)
- **Login**: validation before API call; successful login → dashboard with cookie credentials; API error display; Google failure banner; Google button present.
- **Signup**: password length/match validation; account creation → dashboard with correct payload; duplicate email error.
- **Auth routing**: loading state hides protected UI; `/app/*` → `/login` when logged out; `/login` → dashboard when logged in; session restored via `/me`; logout from user menu lands on `/`; Settings reachable from user menu; user dropped on `401 not_authenticated`.
- **Landing**: guest CTAs link to `/signup` and `/login`; signed-in users get a dashboard link; Create account navigates to the signup page.
- **Settings**: profile details shown; name update; password change incl. wrong-current-password error; account deletion gated by typed confirmation.

---

## 10. Deliberately not included

- **Email verification link flow** — removed; `is_email_verified` remains as a data flag only.
- **Billing / Stripe**, **usage tracking**, **admin UI**, **teams/organisations**, **2FA** — the architecture leaves room (features folders, `role` column, generic one-time-token table) but no placeholder implementations are shipped.
