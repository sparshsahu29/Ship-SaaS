"""CSRF protection and security headers.

CSRF strategy for a cookie-authenticated JSON API:
  * Session cookie is `SameSite=Lax`, so browsers don't attach it to
    cross-site POST/PUT/PATCH/DELETE requests.
  * As defence in depth, every unsafe request must carry an `Origin` (or
    `Referer`) header that matches an allowed origin. Browsers always send
    `Origin` on cross-origin and same-origin fetch() POSTs, and it cannot be
    forged by a page in another origin.
No CSRF token round-trip is needed, and non-browser clients are unaffected.
"""

import logging
from urllib.parse import urlsplit

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.config import settings
from app.core.exceptions import error_response

logger = logging.getLogger(__name__)
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _origin_of(url: str) -> str:
    parts = urlsplit(url)
    return f"{parts.scheme}://{parts.netloc}".lower()


class CSRFMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, allowed_origins: list[str]):
        super().__init__(app)
        self.allowed = {o.lower() for o in allowed_origins}

    async def dispatch(self, request: Request, call_next):
        if request.method in UNSAFE_METHODS:
            origin = request.headers.get("origin") or request.headers.get("referer")
            has_cookie = bool(request.cookies.get(settings.session_cookie_name))
            # A browser request always carries Origin; reject foreign origins outright,
            # and reject missing Origin when a session cookie is being presented.
            if (origin is not None and _origin_of(origin) not in self.allowed) or (origin is None and has_cookie):
                logger.warning("Blocked request with bad origin on %s %s", request.method, request.url.path)
                return error_response(403, "csrf_failed", "Cross-site request blocked.")
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Cache-Control", "no-store")
        if settings.is_production:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response
