"""Google OAuth 2.0 (authorization code flow, server-side).

1. GET /api/auth/google       -> redirect to Google with a signed `state`
2. GET /api/auth/google/callback?code&state
   -> verify state, exchange code for tokens (server-to-server, using the
      client secret), fetch the verified profile from Google's userinfo
      endpoint, then create/link the user and set the session cookie.

We never trust identity claims from the browser; everything comes from Google
over the back channel.
"""

from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.security import generate_token, sign_value, verify_signed_value

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
STATE_TTL_SECONDS = 10 * 60


class GoogleOAuthError(AppError):
    status_code = 400
    code = "google_oauth_failed"


@dataclass
class GoogleProfile:
    sub: str
    email: str
    email_verified: bool
    name: str
    picture: str | None


def redirect_uri() -> str:
    return f"{settings.backend_url}/api/auth/google/callback"


def build_authorization_url() -> tuple[str, str]:
    """Return (url, signed_state). The state is also stored in a short-lived cookie."""
    state = sign_value(generate_token(16), STATE_TTL_SECONDS)
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": redirect_uri(),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"{AUTH_URL}?{urlencode(params)}", state


def validate_state(query_state: str | None, cookie_state: str | None) -> None:
    if not query_state or not cookie_state or query_state != cookie_state or verify_signed_value(query_state) is None:
        raise GoogleOAuthError("Invalid OAuth state. Please try signing in again.", code="invalid_oauth_state")


def fetch_profile(code: str) -> GoogleProfile:
    with httpx.Client(timeout=15) as client:
        token_resp = client.post(
            TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri(),
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise GoogleOAuthError("Could not complete Google sign-in. Please try again.")
        access_token = token_resp.json().get("access_token")
        if not access_token:
            raise GoogleOAuthError("Could not complete Google sign-in. Please try again.")

        info_resp = client.get(USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        if info_resp.status_code != 200:
            raise GoogleOAuthError("Could not fetch your Google profile. Please try again.")
        info = info_resp.json()

    if not info.get("sub") or not info.get("email"):
        raise GoogleOAuthError("Google did not return an email address for this account.")
    return GoogleProfile(
        sub=str(info["sub"]),
        email=info["email"].lower(),
        email_verified=bool(info.get("email_verified", False)),
        name=info.get("name") or "",
        picture=info.get("picture"),
    )
