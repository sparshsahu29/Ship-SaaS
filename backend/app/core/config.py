from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    app_name: str = "SaaS Starter"
    app_env: Literal["development", "production", "test"] = "development"
    secret_key: str = "dev-only-insecure-secret-key"

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/saas_starter"

    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"
    cors_origins: str = ""

    session_cookie_name: str = "session"
    session_ttl_days: int = 14
    email_verification_ttl_hours: int = 24
    password_reset_ttl_minutes: int = 60

    google_client_id: str = ""
    google_client_secret: str = ""

    email_provider: Literal["console", "smtp", "resend"] = "console"
    email_api_key: str = ""
    email_from: str = "noreply@example.com"
    email_from_name: str = "SaaS Starter"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True

    log_level: str = Field(default="INFO")

    @field_validator("frontend_url", "backend_url")
    @classmethod
    def _strip_trailing_slash(cls, v: str) -> str:
        return v.rstrip("/")

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def allowed_origins(self) -> list[str]:
        extra = [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]
        return list(dict.fromkeys([self.frontend_url, *extra]))

    @property
    def google_oauth_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @model_validator(mode="after")
    def _validate_production(self) -> "Settings":
        if not self.is_production:
            return self
        problems = []
        if self.secret_key == "dev-only-insecure-secret-key" or len(self.secret_key) < 32:
            problems.append("SECRET_KEY must be set to a random string of at least 32 characters")
        if not self.frontend_url.startswith("https://"):
            problems.append("FRONTEND_URL must use https in production")
        if not self.backend_url.startswith("https://"):
            problems.append("BACKEND_URL must use https in production")
        if self.email_provider == "console":
            problems.append("EMAIL_PROVIDER must not be 'console' in production")
        if self.email_provider == "resend" and not self.email_api_key:
            problems.append("EMAIL_API_KEY is required when EMAIL_PROVIDER=resend")
        if self.email_provider == "smtp" and not self.smtp_host:
            problems.append("SMTP_HOST is required when EMAIL_PROVIDER=smtp")
        if problems:
            raise ValueError("Invalid production configuration:\n  - " + "\n  - ".join(problems))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
