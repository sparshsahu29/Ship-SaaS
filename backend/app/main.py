from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.auth.router import router as auth_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import CSRFMiddleware, SecurityHeadersMiddleware
from app.database.session import engine
from app.users.router import router as users_router

configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/openapi.json",
)

register_exception_handlers(app)

# Middleware order: outermost is added last. CORS must wrap everything so that
# even error responses (including CSRF rejections) carry CORS headers.
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CSRFMiddleware, allowed_origins=settings.allowed_origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

health_router = APIRouter(prefix="/api", tags=["Health"])


@health_router.get("/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        database = "ok"
    except Exception:
        database = "unavailable"
    return {"status": "ok" if database == "ok" else "degraded", "database": database, "env": settings.app_env}


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)

# Product-specific features: create `app/features/<name>/router.py` and
# include it here, e.g.
#   from app.features.projects.router import router as projects_router
#   app.include_router(projects_router)
