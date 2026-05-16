import re
from typing import Annotated

from email_validator import EmailNotValidError, validate_email
from pydantic import BeforeValidator

from app.config import ADMIN_EMAIL

# Login: must look like an email (allows dev/admin domains such as admin@eduai.local).
_LOGIN_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

# Register: stricter local-part / domain rules (still allows configured dev domains).
_REGISTER_EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$"
)


def _allowed_dev_domains() -> set[str]:
    """Domains permitted on register when strict RFC validation rejects them (e.g. .local)."""
    domains: set[str] = set()
    admin_domain = ADMIN_EMAIL.strip().lower().split("@")[-1]
    if admin_domain:
        domains.add(admin_domain)
    return domains


def _normalize_login_email(value: str) -> str:
    email = value.strip().lower()
    if not email or not _LOGIN_EMAIL_RE.match(email):
        raise ValueError("Enter a valid email address")
    if len(email) > 254:
        raise ValueError("Email is too long")
    return email


def _normalize_register_email(value: str) -> str:
    email = value.strip().lower()
    if not email or len(email) > 254:
        raise ValueError("Enter a valid email address")

    try:
        return validate_email(email, check_deliverability=False).normalized
    except EmailNotValidError:
        domain = email.rsplit("@", 1)[-1]
        if domain in _allowed_dev_domains() and _REGISTER_EMAIL_RE.match(email):
            return email
        raise ValueError("Enter a valid email address") from None


LoginEmailField = Annotated[str, BeforeValidator(_normalize_login_email)]
RegisterEmailField = Annotated[str, BeforeValidator(_normalize_register_email)]

# Backwards-compatible alias used by login.
EmailField = LoginEmailField
