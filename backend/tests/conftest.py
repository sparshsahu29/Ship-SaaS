"""Test setup. Uses an in-memory SQLite database so the suite runs without
PostgreSQL. `APP_ENV=test` is forced before the app is imported."""

import os

os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["EMAIL_PROVIDER"] = "console"
os.environ["FRONTEND_URL"] = "http://localhost:5173"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.database.base import Base  # noqa: E402
from app.database.session import get_db  # noqa: E402
from app.email.service import EmailService, get_email_service  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402

from app.core.config import settings  # noqa: E402

ORIGIN = settings.frontend_url


class FakeProvider:
    """Captures outgoing emails so tests can read the tokens out of them."""

    def __init__(self):
        self.sent = []

    def send(self, *, to, subject, html, text):
        self.sent.append({"to": to, "subject": subject, "html": html, "text": text})

    def last_link(self, path: str) -> str:
        text = self.sent[-1]["text"]
        start = text.index(f"{ORIGIN}{path}")
        end = text.find("\n", start)
        return text[start:end if end != -1 else None].strip()

    def last_token(self, path: str) -> str:
        return self.last_link(path).split("token=", 1)[1]


@pytest.fixture
def engine():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def mailbox():
    return FakeProvider()


@pytest.fixture
def client(engine, mailbox):
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def _get_db():
        db = TestingSession()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    fastapi_app.dependency_overrides[get_db] = _get_db
    fastapi_app.dependency_overrides[get_email_service] = lambda: EmailService(settings, provider=mailbox)
    with TestClient(fastapi_app, base_url=ORIGIN, headers={"Origin": ORIGIN}) as c:
        yield c
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def db(engine):
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    session = Session()
    yield session
    session.close()


USER = {"name": "Ada Lovelace", "email": "ada@example.com", "password": "correct-horse-battery"}


@pytest.fixture
def signup(client):
    def _signup(**overrides):
        res = client.post("/api/auth/signup", json={**USER, **overrides})
        assert res.status_code == 201, res.text
        return res.json()

    return _signup


@pytest.fixture
def user(signup):
    return signup()
