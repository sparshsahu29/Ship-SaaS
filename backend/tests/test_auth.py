from datetime import timedelta

from sqlalchemy import select

from app.core.config import settings
from app.database.base import utcnow
from app.models import OneTimeToken, Session, User
from tests.conftest import USER

COOKIE = settings.session_cookie_name


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


# -- signup ------------------------------------------------------------------


def test_signup_creates_user_sets_cookie_and_sends_verification(client, mailbox):
    res = client.post("/api/auth/signup", json=USER)
    assert res.status_code == 201
    body = res.json()
    assert body["email"] == USER["email"]
    assert body["is_email_verified"] is False
    assert body["has_password"] is True
    assert "password" not in body and "password_hash" not in body
    assert COOKIE in res.cookies
    assert len(mailbox.sent) == 1
    assert mailbox.sent[0]["to"] == USER["email"]
    assert "/verify-email?token=" in mailbox.sent[0]["text"]


def test_signup_normalizes_email_and_rejects_duplicates(client, user):
    res = client.post("/api/auth/signup", json={**USER, "email": "  ADA@example.com "})
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "email_taken"


def test_signup_validation_errors(client):
    res = client.post("/api/auth/signup", json={"name": "", "email": "not-an-email", "password": "short"})
    assert res.status_code == 422
    fields = {d["field"] for d in res.json()["error"]["details"]}
    assert {"name", "email", "password"} <= fields


def test_password_is_hashed_with_argon2(client, user, db):
    stored = db.scalar(select(User)).password_hash
    assert stored.startswith("$argon2id$")
    assert USER["password"] not in stored


# -- login / logout / me ------------------------------------------------------


def test_login_success(client, user):
    client.cookies.clear()
    res = client.post("/api/auth/login", json={"email": USER["email"], "password": USER["password"]})
    assert res.status_code == 200
    assert COOKIE in res.cookies
    assert client.get("/api/auth/me").json()["email"] == USER["email"]


def test_login_wrong_password(client, user):
    client.cookies.clear()
    res = client.post("/api/auth/login", json={"email": USER["email"], "password": "wrong-password"})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "invalid_credentials"
    assert COOKIE not in res.cookies


def test_login_unknown_email_gives_same_error(client):
    res = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "whatever123"})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "invalid_credentials"


def test_me_requires_auth(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "not_authenticated"


def test_me_with_garbage_cookie(client):
    client.cookies.set(COOKIE, "not-a-real-token")
    assert client.get("/api/auth/me").status_code == 401


def test_logout_revokes_session(client, user, db):
    assert db.scalar(select(Session)) is not None
    res = client.post("/api/auth/logout")
    assert res.status_code == 200
    db.expire_all()
    assert db.scalar(select(Session)) is None
    assert client.get("/api/auth/me").status_code == 401


def test_session_token_is_stored_hashed(client, user, db):
    raw = client.cookies.get(COOKIE)
    session = db.scalar(select(Session))
    assert session.token_hash != raw
    assert len(session.token_hash) == 64


def test_expired_session_is_rejected(client, user, db):
    session = db.scalar(select(Session))
    session.expires_at = utcnow() - timedelta(seconds=1)
    db.commit()
    assert client.get("/api/auth/me").status_code == 401


# -- CSRF --------------------------------------------------------------------


def test_csrf_blocks_foreign_origin(client, user):
    res = client.post("/api/auth/logout", headers={"Origin": "https://evil.example"})
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "csrf_failed"
    assert client.get("/api/auth/me").status_code == 200


def test_csrf_blocks_missing_origin_with_cookie(client, user):
    res = client.patch("/api/users/me", json={"name": "x"}, headers={"Origin": ""})
    # Empty header is treated as present but invalid; also test fully absent.
    assert res.status_code == 403
    del client.headers["Origin"]
    res = client.patch("/api/users/me", json={"name": "x"})
    assert res.status_code == 403


# -- email verification ------------------------------------------------------


def test_verify_email_flow(client, user, mailbox):
    token = mailbox.last_token("/verify-email")
    res = client.post("/api/auth/verify-email", json={"token": token})
    assert res.status_code == 200
    assert res.json()["is_email_verified"] is True
    # welcome email sent
    assert any("Welcome" in m["subject"] for m in mailbox.sent)
    # token is single-use
    res = client.post("/api/auth/verify-email", json={"token": token})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "invalid_token"


def test_verify_email_invalid_token(client):
    res = client.post("/api/auth/verify-email", json={"token": "x" * 40})
    assert res.status_code == 400


def test_verify_email_expired_token(client, user, mailbox, db):
    token = mailbox.last_token("/verify-email")
    record = db.scalar(select(OneTimeToken))
    record.expires_at = utcnow() - timedelta(minutes=1)
    db.commit()
    assert client.post("/api/auth/verify-email", json={"token": token}).status_code == 400


def test_verification_tokens_are_stored_hashed(client, user, mailbox, db):
    token = mailbox.last_token("/verify-email")
    assert db.scalar(select(OneTimeToken)).token_hash != token


def test_resend_verification(client, user, mailbox):
    res = client.post("/api/auth/resend-verification")
    assert res.status_code == 200
    assert len(mailbox.sent) == 2


# -- password reset ----------------------------------------------------------


def test_forgot_password_does_not_reveal_accounts(client, user, mailbox):
    known = client.post("/api/auth/forgot-password", json={"email": USER["email"]})
    unknown = client.post("/api/auth/forgot-password", json={"email": "ghost@example.com"})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
    reset_mails = [m for m in mailbox.sent if "Reset" in m["subject"]]
    assert len(reset_mails) == 1 and reset_mails[0]["to"] == USER["email"]


def test_reset_password_flow(client, user, mailbox):
    client.post("/api/auth/forgot-password", json={"email": USER["email"]})
    token = mailbox.last_token("/reset-password")

    res = client.post("/api/auth/reset-password", json={"token": token, "password": "new-password-123"})
    assert res.status_code == 200

    # existing sessions were revoked
    assert client.get("/api/auth/me").status_code == 401

    # old password no longer works, new one does
    assert client.post("/api/auth/login", json={"email": USER["email"], "password": USER["password"]}).status_code == 401
    assert client.post("/api/auth/login", json={"email": USER["email"], "password": "new-password-123"}).status_code == 200

    # token is single-use
    res = client.post("/api/auth/reset-password", json={"token": token, "password": "another-password-1"})
    assert res.status_code == 400


def test_new_reset_request_invalidates_previous_token(client, user, mailbox):
    client.post("/api/auth/forgot-password", json={"email": USER["email"]})
    first = mailbox.last_token("/reset-password")
    client.post("/api/auth/forgot-password", json={"email": USER["email"]})
    second = mailbox.last_token("/reset-password")
    assert first != second
    assert client.post("/api/auth/reset-password", json={"token": first, "password": "new-password-123"}).status_code == 400
    assert client.post("/api/auth/reset-password", json={"token": second, "password": "new-password-123"}).status_code == 200


# -- change password ---------------------------------------------------------


def test_change_password(client, user):
    res = client.post("/api/auth/change-password",
                      json={"current_password": USER["password"], "new_password": "brand-new-pass-1"})
    assert res.status_code == 200
    # current session survives
    assert client.get("/api/auth/me").status_code == 200
    client.cookies.clear()
    assert client.post("/api/auth/login", json={"email": USER["email"], "password": "brand-new-pass-1"}).status_code == 200


def test_change_password_wrong_current(client, user):
    res = client.post("/api/auth/change-password",
                      json={"current_password": "nope-nope-nope", "new_password": "brand-new-pass-1"})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "invalid_password"


def test_change_password_revokes_other_sessions(client, user, db):
    first_cookie = client.cookies.get(COOKIE)
    client.cookies.clear()
    client.post("/api/auth/login", json={"email": USER["email"], "password": USER["password"]})
    assert db.query(Session).count() == 2
    client.post("/api/auth/change-password",
                json={"current_password": USER["password"], "new_password": "brand-new-pass-1"})
    client.cookies.clear()
    client.cookies.set(COOKIE, first_cookie)
    assert client.get("/api/auth/me").status_code == 401
