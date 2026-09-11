# Agent notes

## Verification commands

```bash
# Backend (in-memory SQLite, no Postgres needed)
cd backend && .venv/Scripts/python -m pytest        # Windows venv path; use .venv/bin/python on Unix

# Frontend
cd frontend && npm test && npm run build

# Migration sanity check against SQLite (should print DIFF: [])
cd backend && DATABASE_URL=sqlite:///mig.db .venv/Scripts/alembic upgrade head && rm mig.db
```

## Conventions

- Backend: routers are thin, logic lives in `service.py`. Errors are raised as `AppError`
  subclasses (`app/core/exceptions.py`) and rendered as `{"error": {code, message, details?}}`.
- New models must be imported in `app/models/__init__.py` for Alembic autogenerate.
- Use `TZDateTime` (not `DateTime`) for timestamps so SQLite tests behave like Postgres.
- Frontend: all HTTP goes through `src/services/api.js`; components never call `fetch`.
- Product code goes in `backend/app/features/` and `frontend/src/features/`; do not modify
  `auth/`, `users/`, `core/` for product features.
- No TypeScript, no Next.js, no Redux. Keep dependencies minimal.
