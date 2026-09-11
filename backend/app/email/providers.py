"""Email transport providers. Each exposes `send(to, subject, html, text)`.

Add a new provider by subclassing `EmailProvider` and registering it in
`PROVIDERS` at the bottom of this file.
"""

import logging
import smtplib
from email.message import EmailMessage
from typing import Protocol

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)


class EmailProvider(Protocol):
    def send(self, *, to: str, subject: str, html: str, text: str) -> None: ...


class ConsoleProvider:
    """Development provider: writes the email to the log instead of sending."""

    def __init__(self, settings: Settings):
        self.settings = settings

    def send(self, *, to: str, subject: str, html: str, text: str) -> None:
        logger.info("\n----- EMAIL (console provider) -----\nTo: %s\nSubject: %s\n\n%s\n------------------------------------", to, subject, text)


class SMTPProvider:
    def __init__(self, settings: Settings):
        self.settings = settings

    def send(self, *, to: str, subject: str, html: str, text: str) -> None:
        s = self.settings
        msg = EmailMessage()
        msg["From"] = f"{s.email_from_name} <{s.email_from}>"
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(text)
        msg.add_alternative(html, subtype="html")
        with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=15) as smtp:
            if s.smtp_use_tls:
                smtp.starttls()
            if s.smtp_username:
                smtp.login(s.smtp_username, s.smtp_password)
            smtp.send_message(msg)


class ResendProvider:
    API_URL = "https://api.resend.com/emails"

    def __init__(self, settings: Settings):
        self.settings = settings

    def send(self, *, to: str, subject: str, html: str, text: str) -> None:
        s = self.settings
        response = httpx.post(
            self.API_URL,
            headers={"Authorization": f"Bearer {s.email_api_key}"},
            json={"from": f"{s.email_from_name} <{s.email_from}>", "to": [to], "subject": subject, "html": html, "text": text},
            timeout=15,
        )
        response.raise_for_status()


PROVIDERS: dict[str, type] = {
    "console": ConsoleProvider,
    "smtp": SMTPProvider,
    "resend": ResendProvider,
}
