"""High-level transactional email API used by the rest of the app.

Callers never touch the provider directly; they call
`email_service.send_password_reset_email(...)` etc. Templates live in
`templates/` as plain HTML with `$placeholders` (stdlib string.Template).
"""

import html
import logging
from pathlib import Path
from string import Template

from app.core.config import Settings, settings
from app.email.providers import PROVIDERS, EmailProvider

logger = logging.getLogger(__name__)
TEMPLATE_DIR = Path(__file__).parent / "templates"


def _read(name: str) -> Template:
    return Template((TEMPLATE_DIR / name).read_text(encoding="utf-8"))


class EmailService:
    def __init__(self, settings: Settings, provider: EmailProvider | None = None):
        self.settings = settings
        self.provider = provider or PROVIDERS[settings.email_provider](settings)

    # -- public API -----------------------------------------------------------

    def send_verification_email(self, *, to: str, name: str, token: str) -> None:
        link = f"{self.settings.frontend_url}/verify-email?token={token}"
        self._send(
            to=to,
            subject=f"Verify your email for {self.settings.app_name}",
            template="verify_email",
            context={"name": name, "link": link, "hours": self.settings.email_verification_ttl_hours},
        )

    def send_password_reset_email(self, *, to: str, name: str, token: str) -> None:
        link = f"{self.settings.frontend_url}/reset-password?token={token}"
        self._send(
            to=to,
            subject=f"Reset your {self.settings.app_name} password",
            template="reset_password",
            context={"name": name, "link": link, "minutes": self.settings.password_reset_ttl_minutes},
        )

    def send_welcome_email(self, *, to: str, name: str) -> None:
        self._send(
            to=to,
            subject=f"Welcome to {self.settings.app_name}",
            template="welcome",
            context={"name": name, "link": f"{self.settings.frontend_url}/app/dashboard"},
        )

    # -- internals ------------------------------------------------------------

    def _render(self, template: str, context: dict) -> tuple[str, str]:
        ctx = {"app_name": self.settings.app_name, "support_email": self.settings.email_from, **context}
        safe = {k: html.escape(str(v), quote=True) for k, v in ctx.items()}
        inner = _read(f"{template}.html").substitute(safe)
        html_body = _read("_layout.html").substitute({**safe, "content": inner})
        text_body = _read(f"{template}.txt").substitute(ctx)
        return html_body, text_body

    def _send(self, *, to: str, subject: str, template: str, context: dict) -> None:
        html_body, text_body = self._render(template, context)
        try:
            self.provider.send(to=to, subject=subject, html=html_body, text=text_body)
        except Exception:
            # Never include the body/link in logs: it contains a secret token.
            logger.exception("Failed to send '%s' email via %s", template, self.settings.email_provider)
            raise


email_service = EmailService(settings)


def get_email_service() -> EmailService:
    return email_service
