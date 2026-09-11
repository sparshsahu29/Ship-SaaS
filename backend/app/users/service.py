import logging

from sqlalchemy.orm import Session as DBSession

from app.models import User
from app.schemas.user import UserUpdate

logger = logging.getLogger(__name__)


def update_user(db: DBSession, user: User, payload: UserUpdate) -> User:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value.strip() if isinstance(value, str) else value)
    db.flush()
    return user


def delete_user(db: DBSession, user: User) -> None:
    """Hard delete. Sessions and tokens cascade via FK ON DELETE CASCADE.

    Product-specific tables that reference users.id should declare their own
    ondelete behaviour (CASCADE or SET NULL) in their migrations.
    """
    logger.info("User deleted", extra={"user_id": str(user.id)})
    db.delete(user)
    db.flush()
