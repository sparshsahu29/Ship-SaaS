from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.auth import service as auth_service
from app.core.config import settings
from app.core.exceptions import NotAuthenticatedError
from app.database.session import get_db
from app.models import User

DB = Annotated[Session, Depends(get_db)]


def get_current_user_optional(request: Request, db: DB) -> User | None:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        return None
    session = auth_service.get_valid_session(db, token)
    return None if session is None else session.user


def get_current_user(user: Annotated[User | None, Depends(get_current_user_optional)]) -> User:
    if user is None or not user.is_active:
        raise NotAuthenticatedError("Authentication required.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
