"""Password hashing and opaque token helpers.

Tokens (sessions, email verification, password reset) are random URL-safe
strings. Only their SHA-256 hash is persisted; the raw value is shown to the
user exactly once (cookie or email link).
"""

import hashlib
import hmac
import secrets
import time

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import settings

_hasher = PasswordHasher()  # argon2id with library defaults


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def generate_token(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def sign_value(value: str, ttl_seconds: int) -> str:
    """Return `value.expiry.signature` (used for OAuth state)."""
    expires = str(int(time.time()) + ttl_seconds)
    payload = f"{value}.{expires}"
    sig = hmac.new(settings.secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"


def verify_signed_value(signed: str) -> str | None:
    try:
        value, expires, sig = signed.rsplit(".", 2)
        expires_at = int(expires)
    except ValueError:
        return None
    payload = f"{value}.{expires}"
    expected = hmac.new(settings.secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected) or expires_at < time.time():
        return None
    return value
