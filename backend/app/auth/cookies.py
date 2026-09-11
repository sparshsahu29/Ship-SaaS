from fastapi import Response

from app.core.config import settings

OAUTH_STATE_COOKIE = "oauth_state"


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl_days * 24 * 3600,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=settings.session_cookie_name, path="/", httponly=True,
                           secure=settings.is_production, samesite="lax")


def set_oauth_state_cookie(response: Response, state: str) -> None:
    response.set_cookie(
        key=OAUTH_STATE_COOKIE, value=state, max_age=600, httponly=True,
        secure=settings.is_production, samesite="lax", path="/api/auth/google",
    )


def clear_oauth_state_cookie(response: Response) -> None:
    response.delete_cookie(key=OAUTH_STATE_COOKIE, path="/api/auth/google")
