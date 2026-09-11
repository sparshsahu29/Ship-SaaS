"""Google OAuth is tested by stubbing the back-channel call to Google
(`google.fetch_profile`) — everything else (state cookie validation, user
creation/linking, session cookie) runs for real."""

from urllib.parse import parse_qs, urlparse

import pytest
from sqlalchemy import select

from app.auth import google
from app.core.config import settings
from app.models import User

COOKIE = settings.session_cookie_name


@pytest.fixture
def google_enabled(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "test-client-id")
    monkeypatch.setattr(settings, "google_client_secret", "test-client-secret")


@pytest.fixture
def google_profile(monkeypatch):
    profile = google.GoogleProfile(sub="google-123", email="ada@example.com", email_verified=True,
                                   name="Ada L", picture="https://img.example/ada.png")
    monkeypatch.setattr(google, "fetch_profile", lambda code: profile)
    return profile


def _start(client):
    res = client.get("/api/auth/google", follow_redirects=False)
    assert res.status_code == 302
    location = res.headers["location"]
    assert location.startswith(google.AUTH_URL)
    query = parse_qs(urlparse(location).query)
    assert query["client_id"] == ["test-client-id"]
    assert query["redirect_uri"] == [f"{settings.backend_url}/api/auth/google/callback"]
    return query["state"][0]


def test_google_disabled_returns_404(client):
    assert client.get("/api/auth/google", follow_redirects=False).status_code == 404


def test_google_start_sets_state_cookie(client, google_enabled):
    state = _start(client)
    assert client.cookies.get("oauth_state") == state


def test_google_callback_creates_new_verified_user(client, google_enabled, google_profile, db):
    state = _start(client)
    res = client.get(f"/api/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert res.status_code == 302
    assert res.headers["location"] == f"{settings.frontend_url}/app/dashboard"
    assert COOKIE in res.cookies

    user = db.scalar(select(User))
    assert user.google_id == "google-123"
    assert user.is_email_verified is True
    assert user.password_hash is None

    me = client.get("/api/auth/me").json()
    assert me["has_google"] is True and me["has_password"] is False


def test_google_callback_links_existing_email_account(client, google_enabled, google_profile, signup, db):
    signup()  # existing email/password account with the same email
    client.cookies.clear()
    state = _start(client)
    client.get(f"/api/auth/google/callback?code=abc&state={state}", follow_redirects=False)

    users = db.scalars(select(User)).all()
    assert len(users) == 1, "must not create a duplicate user"
    assert users[0].google_id == "google-123"
    assert users[0].is_email_verified is True
    assert users[0].password_hash is not None  # password login still works


def test_google_callback_rejects_bad_state(client, google_enabled, google_profile, db):
    _start(client)
    res = client.get("/api/auth/google/callback?code=abc&state=forged", follow_redirects=False)
    assert res.status_code == 302
    assert res.headers["location"].endswith("/login?error=google")
    assert COOKIE not in res.cookies
    assert db.scalar(select(User)) is None


def test_google_callback_rejects_missing_state_cookie(client, google_enabled, google_profile):
    state = _start(client)
    client.cookies.clear()
    res = client.get(f"/api/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert res.headers["location"].endswith("/login?error=google")


def test_google_callback_rejects_unverified_google_email(client, google_enabled, google_profile, db):
    google_profile.email_verified = False
    state = _start(client)
    res = client.get(f"/api/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert res.headers["location"].endswith("/login?error=google")
    assert db.scalar(select(User)) is None


def test_google_callback_handles_provider_error(client, google_enabled):
    state = _start(client)
    res = client.get(f"/api/auth/google/callback?error=access_denied&state={state}", follow_redirects=False)
    assert res.headers["location"].endswith("/login?error=google")
