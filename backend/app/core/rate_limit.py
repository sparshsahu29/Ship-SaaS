"""Minimal in-memory fixed-window rate limiter.

Good enough for a single-process deployment and for keeping brute-force
attempts against auth endpoints expensive. If you run multiple backend
instances, replace `_MemoryStore` with a Redis-backed store (same interface).
"""

import threading
import time
from dataclasses import dataclass

from fastapi import Request

from app.core.config import settings
from app.core.exceptions import RateLimitedError


class _MemoryStore:
    def __init__(self):
        self._hits: dict[str, tuple[int, float]] = {}
        self._lock = threading.Lock()

    def incr(self, key: str, window: int) -> tuple[int, float]:
        now = time.time()
        with self._lock:
            count, reset_at = self._hits.get(key, (0, now + window))
            if reset_at <= now:
                count, reset_at = 0, now + window
            count += 1
            self._hits[key] = (count, reset_at)
            if len(self._hits) > 10_000:
                self._hits = {k: v for k, v in self._hits.items() if v[1] > now}
        return count, reset_at

    def clear(self):
        with self._lock:
            self._hits.clear()


store = _MemoryStore()
# Disabled under APP_ENV=test so unrelated tests never trip limits; tests that
# cover rate limiting flip this on explicitly.
enabled = settings.app_env != "test"


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded and settings.is_production:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@dataclass(frozen=True)
class RateLimit:
    """FastAPI dependency: `Depends(RateLimit(limit=5, window=60))`."""

    limit: int
    window: int  # seconds
    scope: str = ""

    def __call__(self, request: Request) -> None:
        if not enabled:
            return
        key = f"{self.scope or request.url.path}:{client_ip(request)}"
        count, reset_at = store.incr(key, self.window)
        if count > self.limit:
            retry_after = max(1, int(reset_at - time.time()))
            raise RateLimitedError(
                "Too many requests. Please try again later.", details={"retry_after": retry_after}
            )


auth_rate_limit = RateLimit(limit=10, window=60, scope="auth")
sensitive_rate_limit = RateLimit(limit=5, window=15 * 60, scope="auth-sensitive")
