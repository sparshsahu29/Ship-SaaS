from fastapi import APIRouter, Response, status

from app.auth import cookies
from app.core.dependencies import DB, CurrentUser
from app.schemas.user import UserRead, UserUpdate
from app.users import service as users_service

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.patch("/me", response_model=UserRead)
def update_me(payload: UserUpdate, user: CurrentUser, db: DB):
    return users_service.update_user(db, user, payload)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(user: CurrentUser, db: DB):
    users_service.delete_user(db, user)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    cookies.clear_session_cookie(response)
    return response
