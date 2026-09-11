import pytest

from app.core.config import Settings

PROD = dict(
    app_env="production",
    secret_key="x" * 48,
    frontend_url="https://app.example.com",
    backend_url="https://api.example.com",
    email_provider="resend",
    email_api_key="re_123",
)


def test_valid_production_settings():
    s = Settings(_env_file=None, **PROD)
    assert s.is_production
    assert s.allowed_origins == ["https://app.example.com"]


@pytest.mark.parametrize(
    "override, expected",
    [
        ({"secret_key": "short"}, "SECRET_KEY"),
        ({"frontend_url": "http://app.example.com"}, "FRONTEND_URL"),
        ({"email_provider": "console"}, "EMAIL_PROVIDER"),
        ({"email_api_key": ""}, "EMAIL_API_KEY"),
        ({"email_provider": "smtp", "smtp_host": ""}, "SMTP_HOST"),
    ],
)
def test_production_settings_fail_fast(override, expected):
    with pytest.raises(ValueError, match=expected):
        Settings(_env_file=None, **{**PROD, **override})


def test_cors_origins_are_merged_and_deduplicated():
    s = Settings(_env_file=None, frontend_url="http://localhost:5173/", cors_origins="http://localhost:5173, https://preview.example.com/")
    assert s.allowed_origins == ["http://localhost:5173", "https://preview.example.com"]
