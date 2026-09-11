import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import RedirectResponse

from app.auth import cookies, google
from app.auth import service as auth_service
from app.core.config import settings
from app.core.dependencies import DB, CurrentUser
from app.core.exceptions import NotFoundError
from app.core.rate_limit import auth_rate_limit, client_ip, sensitive_rate_limit
from app.email.service import EmailService, get_email_service
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    SignupRequest,
)
from app.schemas.user import UserRead

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])
Email = Annotated[EmailService, Depends(get_email_service)]


def _start_session(request: Request, response: Response, db, user) -> None:
    token = auth_service.create_session(
        db, user, user_agent=request.headers.get("user-agent"), ip_address=client_ip(request)
    )
    cookies.set_session_cookie(response, token)


@router.post("/signup", response_model=UserRead, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(auth_rate_limit)])
def signup(payload: SignupRequest, request: Request, response: Response, db: DB, email: Email):
    user = auth_service.signup(db, email, email=payload.email, name=payload.name, password=payload.password)
    _start_session(request, response, db, user)
    return user


@router.post("/login", response_model=UserRead, dependencies=[Depends(auth_rate_limit)])
def login(payload: LoginRequest, request: Request, response: Response, db: DB):
    user = auth_service.authenticate(db, email=payload.email, password=payload.password)
    _start_session(request, response, db, user)
    return user


@router.post("/logout", response_model=MessageResponse)
def logout(request: Request, response: Response, db: DB):
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        auth_service.revoke_session(db, token)
    cookies.clear_session_cookie(response)
    return {"message": "Logged out."}


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser):
    return user


@router.post("/forgot-password", response_model=MessageResponse, dependencies=[Depends(sensitive_rate_limit)])
def forgot_password(payload: ForgotPasswordRequest, db: DB, email: Email):
    auth_service.request_password_reset(db, email, payload.email)
    return {"message": "If an account exists for this email, you will receive a password reset link."}


@router.post("/reset-password", response_model=MessageResponse, dependencies=[Depends(auth_rate_limit)])
def reset_password(payload: ResetPasswordRequest, response: Response, db: DB):
    auth_service.reset_password(db, token=payload.token, new_password=payload.password)
    cookies.clear_session_cookie(response)
    return {"message": "Your password has been reset. You can now sign in."}


@router.post("/change-password", response_model=MessageResponse, dependencies=[Depends(auth_rate_limit)])
def change_password(payload: ChangePasswordRequest, request: Request, user: CurrentUser, db: DB):
    auth_service.change_password(
        db, user, current_password=payload.current_password, new_password=payload.new_password,
        keep_token=request.cookies.get(settings.session_cookie_name),
    )
    return {"message": "Password updated. Other devices have been signed out."}


# -- Google OAuth --------------------------------------------------------------


@router.get("/google", dependencies=[Depends(auth_rate_limit)], response_class=RedirectResponse)
def google_start():
    if not settings.google_oauth_enabled:
        raise NotFoundError("Google sign-in is not configured.", code="google_not_configured")
    url, state = google.build_authorization_url()
    response = RedirectResponse(url, status_code=status.HTTP_302_FOUND)
    cookies.set_oauth_state_cookie(response, state)
    return response


@router.get("/google/callback", dependencies=[Depends(auth_rate_limit)], response_class=RedirectResponse)
def google_callback(request: Request, db: DB, code: str | None = None, state: str | None = None,
                    error: str | None = None):
    failure = RedirectResponse(f"{settings.frontend_url}/login?error=google", status_code=status.HTTP_302_FOUND)
    cookies.clear_oauth_state_cookie(failure)
    if not settings.google_oauth_enabled or error or not code:
        return failure
    try:
        google.validate_state(state, request.cookies.get(cookies.OAUTH_STATE_COOKIE))
        profile = google.fetch_profile(code)
        user = auth_service.login_or_register_google_user(
            db, google_id=profile.sub, email=profile.email, name=profile.name,
            avatar_url=profile.picture, email_verified=profile.email_verified,
        )
    except Exception as exc:
        db.rollback()
        logger.warning("Google OAuth callback failed: %s", getattr(exc, "code", type(exc).__name__))
        return failure

    response = RedirectResponse(f"{settings.frontend_url}/app/dashboard", status_code=status.HTTP_302_FOUND)
    cookies.clear_oauth_state_cookie(response)
    _start_session(request, response, db, user)
    return response
