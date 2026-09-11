from typing import Annotated

from pydantic import BaseModel, EmailStr, Field, StringConstraints, field_validator

Password = Annotated[str, StringConstraints(min_length=8, max_length=128)]


def _normalize_email(v: str) -> str:
    return v.strip().lower()


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: Password

    _normalize = field_validator("email")(_normalize_email)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    _normalize = field_validator("email")(_normalize_email)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    _normalize = field_validator("email")(_normalize_email)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=16, max_length=256)
    password: Password


class ChangePasswordRequest(BaseModel):
    current_password: str | None = Field(default=None, max_length=128)
    new_password: Password


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=16, max_length=256)


class MessageResponse(BaseModel):
    message: str
