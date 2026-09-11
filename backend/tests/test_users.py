from sqlalchemy import select

from app.core import rate_limit
from app.models import OneTimeToken, Session, User
from tests.conftest import USER


def test_update_name(client, user):
    res = client.patch("/api/users/me", json={"name": "  Ada Byron  "})
    assert res.status_code == 200
    assert res.json()["name"] == "Ada Byron"
    assert client.get("/api/auth/me").json()["name"] == "Ada Byron"


def test_update_rejects_empty_name_and_unknown_fields(client, user):
    assert client.patch("/api/users/me", json={"name": ""}).status_code == 422
    res = client.patch("/api/users/me", json={"email": "new@example.com", "role": "admin"})
    assert res.status_code == 200
    me = client.get("/api/auth/me").json()
    assert me["email"] == USER["email"] and me["role"] == "user"


def test_update_requires_auth(client):
    assert client.patch("/api/users/me", json={"name": "x"}).status_code == 401


def test_delete_account_cascades(client, user, mailbox, db):
    client.post("/api/auth/forgot-password", json={"email": USER["email"]})
    assert db.scalar(select(OneTimeToken)) is not None
    assert db.scalar(select(Session)) is not None

    res = client.delete("/api/users/me")
    assert res.status_code == 204

    db.expire_all()
    assert db.scalar(select(User)) is None
    assert db.scalar(select(Session)) is None
    assert db.scalar(select(OneTimeToken)) is None
    assert client.get("/api/auth/me").status_code == 401
    assert client.post("/api/auth/login", json={"email": USER["email"], "password": USER["password"]}).status_code == 401


def test_rate_limit_on_login(client, monkeypatch):
    monkeypatch.setattr(rate_limit, "enabled", True)
    rate_limit.store.clear()
    payload = {"email": "nobody@example.com", "password": "wrong-password"}
    statuses = [client.post("/api/auth/login", json=payload).status_code for _ in range(rate_limit.auth_rate_limit.limit + 1)]
    assert statuses[:-1] == [401] * rate_limit.auth_rate_limit.limit
    assert statuses[-1] == 429
    rate_limit.store.clear()


def test_error_format_for_unknown_route(client):
    res = client.get("/api/does-not-exist")
    assert res.status_code == 404
    assert set(res.json()["error"]) == {"code", "message"}


def test_security_headers(client):
    res = client.get("/api/health")
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["X-Frame-Options"] == "DENY"
