"""Authentication business logic. Routers stay thin; everything DB-related
about signup/login/sessions/tokens lives here."""

import logging
import uuid
from datetime import timedelta

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.core.exceptions import AppError, ConflictError, NotAuthenticatedError
from app.core.security import generate_token, hash_password, hash_token, needs_rehash, verify_password
from app.database.base import utcnow
from app.email.service import EmailService
from app.models import OneTimeToken, Session, TokenPurpose, User

logger = logging.getLogger(__name__)


class InvalidCredentialsError(AppError):
    status_code = 401
    code = "invalid_credentials"


class InvalidTokenError(AppError):
    status_code = 400
    code = "invalid_token"


# -- users -------------------------------------------------------------------


def get_user_by_email(db: DBSession, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


def get_user_by_google_id(db: DBSession, google_id: str) -> User | None:
    return db.scalar(select(User).where(User.google_id == google_id))


def create_user(db: DBSession, *, email: str, name: str, password: str | None, google_id: str | None = None,
                avatar_url: str | None = None, is_email_verified: bool = False) -> User:
    user = User(
        email=email.lower(),
        name=name,
        password_hash=hash_password(password) if password else None,
        google_id=google_id,
        avatar_url=avatar_url,
        is_email_verified=is_email_verified,
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        # Unique constraint on email/google_id — races between concurrent signups end here.
        db.rollback()
        raise ConflictError("An account with this email already exists.", code="email_taken")
    return user


def signup(db: DBSession, email_service: EmailService, *, email: str, name: str, password: str) -> User:
    if get_user_by_email(db, email):
        raise ConflictError("An account with this email already exists.", code="email_taken")
    user = create_user(db, email=email, name=name, password=password)
    send_verification_email(db, email_service, user)
    logger.info("User signed up", extra={"user_id": str(user.id)})
    return user


def authenticate(db: DBSession, *, email: str, password: str) -> User:
    user = get_user_by_email(db, email)
    if user is None or not verify_password(password, user.password_hash):
        # Same error whether the email exists or not.
        logger.info("Failed login attempt", extra={"email_domain": email.rsplit("@", 1)[-1]})
        raise InvalidCredentialsError("Invalid email or password.")
    if not user.is_active:
        raise InvalidCredentialsError("This account has been deactivated.", code="account_disabled")
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    return user


# -- sessions ----------------------------------------------------------------


def create_session(db: DBSession, user: User, *, user_agent: str | None = None, ip_address: str | None = None) -> str:
    """Create a session row and return the raw token to put in the cookie."""
    token = generate_token(32)
    db.add(
        Session(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=utcnow() + timedelta(days=settings.session_ttl_days),
            user_agent=(user_agent or "")[:512] or None,
            ip_address=ip_address,
        )
    )
    db.flush()
    return token


def get_valid_session(db: DBSession, token: str) -> Session | None:
    session = db.scalar(
        select(Session).options(joinedload(Session.user)).where(Session.token_hash == hash_token(token))
    )
    if session is None:
        return None
    now = utcnow()
    if session.expires_at <= now:
        db.delete(session)
        return None
    # Throttle last_seen writes to once per minute to avoid a write on every request.
    if (now - session.last_seen_at) > timedelta(minutes=1):
        session.last_seen_at = now
    return session


def revoke_session(db: DBSession, token: str) -> None:
    db.execute(delete(Session).where(Session.token_hash == hash_token(token)))


def revoke_all_sessions(db: DBSession, user_id: uuid.UUID, *, except_token: str | None = None) -> None:
    stmt = delete(Session).where(Session.user_id == user_id)
    if except_token:
        stmt = stmt.where(Session.token_hash != hash_token(except_token))
    db.execute(stmt)


# -- one-time tokens ---------------------------------------------------------


def _issue_token(db: DBSession, user: User, purpose: TokenPurpose, ttl: timedelta) -> str:
    # Only one live token per purpose per user; issuing a new one invalidates older ones.
    db.execute(delete(OneTimeToken).where(OneTimeToken.user_id == user.id, OneTimeToken.purpose == purpose))
    token = generate_token(32)
    db.add(OneTimeToken(user_id=user.id, purpose=purpose, token_hash=hash_token(token), expires_at=utcnow() + ttl))
    db.flush()
    return token


def _consume_token(db: DBSession, raw: str, purpose: TokenPurpose) -> User:
    record = db.scalar(
        select(OneTimeToken)
        .options(joinedload(OneTimeToken.user))
        .where(OneTimeToken.token_hash == hash_token(raw), OneTimeToken.purpose == purpose)
    )
    if record is None or record.used_at is not None or record.expires_at <= utcnow():
        raise InvalidTokenError("This link is invalid or has expired.")
    record.used_at = utcnow()
    return record.user


def send_verification_email(db: DBSession, email_service: EmailService, user: User) -> None:
    if user.is_email_verified:
        return
    token = _issue_token(db, user, TokenPurpose.EMAIL_VERIFICATION, timedelta(hours=settings.email_verification_ttl_hours))
    try:
        email_service.send_verification_email(to=user.email, name=user.name, token=token)
    except Exception:
        # Signup should still succeed; the user can request a new link from the app.
        pass


def verify_email(db: DBSession, email_service: EmailService, token: str) -> User:
    user = _consume_token(db, token, TokenPurpose.EMAIL_VERIFICATION)
    if not user.is_email_verified:
        user.is_email_verified = True
        try:
            email_service.send_welcome_email(to=user.email, name=user.name)
        except Exception:
            pass
    return user


def request_password_reset(db: DBSession, email_service: EmailService, email: str) -> None:
    user = get_user_by_email(db, email)
    if user is None or not user.is_active:
        return  # Do not reveal whether the account exists.
    token = _issue_token(db, user, TokenPurpose.PASSWORD_RESET, timedelta(minutes=settings.password_reset_ttl_minutes))
    email_service.send_password_reset_email(to=user.email, name=user.name, token=token)


def reset_password(db: DBSession, *, token: str, new_password: str) -> User:
    user = _consume_token(db, token, TokenPurpose.PASSWORD_RESET)
    user.password_hash = hash_password(new_password)
    user.is_email_verified = True  # They proved control of the mailbox.
    revoke_all_sessions(db, user.id)
    logger.info("Password reset completed", extra={"user_id": str(user.id)})
    return user


def change_password(db: DBSession, user: User, *, current_password: str | None, new_password: str, keep_token: str | None) -> None:
    if user.has_password and not verify_password(current_password or "", user.password_hash):
        raise InvalidCredentialsError("Current password is incorrect.", code="invalid_password")
    user.password_hash = hash_password(new_password)
    revoke_all_sessions(db, user.id, except_token=keep_token)


# -- google ------------------------------------------------------------------


def login_or_register_google_user(db: DBSession, *, google_id: str, email: str, name: str, avatar_url: str | None,
                                  email_verified: bool) -> User:
    """Find or create the user for a verified Google identity.

    Rules:
    - Existing user with this google_id -> log in.
    - Existing user with this email (verified by Google) -> link google_id, log in.
    - Otherwise -> create new user (already email-verified).
    """
    if not email_verified:
        raise NotAuthenticatedError("Google account email is not verified.", code="google_email_unverified")

    user = get_user_by_google_id(db, google_id)
    if user is None:
        user = get_user_by_email(db, email)
        if user is not None:
            user.google_id = google_id
            user.is_email_verified = True
            if not user.avatar_url:
                user.avatar_url = avatar_url
        else:
            user = create_user(db, email=email, name=name or email.split("@")[0], password=None,
                               google_id=google_id, avatar_url=avatar_url, is_email_verified=True)
    if not user.is_active:
        raise InvalidCredentialsError("This account has been deactivated.", code="account_disabled")
    return user
