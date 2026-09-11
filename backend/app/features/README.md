# Product features

Put product-specific backend code here, one package per feature:

```
app/features/
  projects/
    __init__.py
    models.py      # SQLAlchemy models (import them in app/models/__init__.py so Alembic sees them)
    schemas.py     # Pydantic request/response models
    service.py     # business logic
    router.py      # APIRouter(prefix="/api/projects", tags=["Projects"])
```

Then register the router in `app/main.py`:

```python
from app.features.projects.router import router as projects_router
app.include_router(projects_router)
```

Use `CurrentUser` from `app.core.dependencies` to protect endpoints and
`DB` for a database session. Nothing in `app/auth`, `app/users` or `app/core`
needs to change.

Optional modules that fit here later: `billing/` (Stripe), `usage/`
(per-user metric counters), `admin/` (role-gated endpoints using `user.role`).
