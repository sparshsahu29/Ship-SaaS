import enum
import uuid
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TZDateTime, UUIDPrimaryKeyMixin, utcnow

from .user import User


class TokenPurpose(str, enum.Enum):
    PASSWORD_RESET = "password_reset"
    # Add further purposes here (e.g. EMAIL_CHANGE = "email_change") together
    # with an Alembic migration that extends the `token_purpose` enum.


class OneTimeToken(UUIDPrimaryKeyMixin, Base):
    """Single-use, expiring tokens (currently: password reset)."""

    __tablename__ = "one_time_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    purpose: Mapped[TokenPurpose] = mapped_column(
        Enum(TokenPurpose, name="token_purpose", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(TZDateTime, nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(TZDateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TZDateTime, default=utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="tokens")
