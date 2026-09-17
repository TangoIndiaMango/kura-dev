"""Staff password setup tokens — invite / reset (hashed, 72h, one-time)."""
from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from accounts.models import PasswordSetupToken, User
from core.exceptions import DomainError

logger = logging.getLogger("kura.invites")

INVITE_TTL = timedelta(hours=72)
MIN_PASSWORD_LEN = 8


def _pepper() -> bytes:
    return (getattr(settings, "OTP_PEPPER", None) or settings.SECRET_KEY).encode()


def hash_setup_token(raw: str) -> str:
    return hmac.new(_pepper(), raw.encode(), hashlib.sha256).hexdigest()


def validate_password_strength(password: str) -> None:
    pwd = password or ""
    errors: list[str] = []
    if len(pwd) < MIN_PASSWORD_LEN:
        errors.append(f"At least {MIN_PASSWORD_LEN} characters.")
    if not any(c.isupper() for c in pwd):
        errors.append("One uppercase letter.")
    if not any(c.islower() for c in pwd):
        errors.append("One lowercase letter.")
    if not any(c.isdigit() for c in pwd):
        errors.append("One number.")
    if not any(not c.isalnum() for c in pwd):
        errors.append("One special character.")
    if errors:
        raise DomainError(
            "VALIDATION_ERROR",
            "Password does not meet security rules.",
            details={"password": errors},
            http=400,
        )


def admin_setup_url(*, raw_token: str, email: str) -> str:
    base = (
        getattr(settings, "FRONTEND_ADMIN_URL", None)
        or "http://localhost:5176"
    ).rstrip("/")
    qs = urlencode({"token": raw_token, "email": email})
    return f"{base}/create-password?{qs}"


@transaction.atomic
def issue_password_setup_token(
    *,
    user: User,
    purpose: str = PasswordSetupToken.Purpose.INVITE,
    ttl: timedelta = INVITE_TTL,
) -> tuple[PasswordSetupToken, str]:
    """Invalidate unused tokens for this purpose, issue a new raw token once."""
    PasswordSetupToken.objects.filter(
        user=user,
        purpose=purpose,
        consumed_at__isnull=True,
    ).update(consumed_at=timezone.now())

    raw = secrets.token_urlsafe(32)
    row = PasswordSetupToken.objects.create(
        user=user,
        purpose=purpose,
        token_hash=hash_setup_token(raw),
        expires_at=timezone.now() + ttl,
    )
    return row, raw


def peek_setup_token(*, raw_token: str) -> dict:
    """Public context for create-password page (no consume)."""
    token = _load_valid_token(raw_token)
    user = token.user
    return {
        "email": user.email,
        "first_name": user.first_name,
        "expires_at": token.expires_at.isoformat(),
        "purpose": token.purpose,
    }


@transaction.atomic
def consume_password_setup(
    *,
    raw_token: str,
    password: str,
    password_confirmation: str,
) -> User:
    if (password or "") != (password_confirmation or ""):
        raise DomainError(
            "VALIDATION_ERROR",
            "Passwords do not match.",
            details={"password_confirmation": ["Must match password."]},
            http=400,
        )
    validate_password_strength(password)
    token = (
        PasswordSetupToken.objects.select_for_update()
        .select_related("user")
        .filter(token_hash=hash_setup_token(raw_token))
        .first()
    )
    if token is None:
        raise DomainError("AUTH_INVALID", "Invalid or expired invite link.", http=401)
    if token.consumed_at is not None:
        raise DomainError("AUTH_INVALID", "This invite link was already used.", http=401)
    if token.expires_at < timezone.now():
        raise DomainError("AUTH_INVALID", "This invite link has expired.", http=401)

    user = token.user
    if not user.is_active:
        raise DomainError("AUTH_INVALID", "This account is inactive.", http=401)
    user.set_password(password)
    user.save(update_fields=["password", "updated_at"])
    token.consumed_at = timezone.now()
    token.save(update_fields=["consumed_at", "updated_at"])
    PasswordSetupToken.objects.filter(
        user=user,
        purpose=token.purpose,
        consumed_at__isnull=True,
    ).exclude(pk=token.pk).update(consumed_at=timezone.now())
    return user


def _load_valid_token(raw_token: str) -> PasswordSetupToken:
    raw = (raw_token or "").strip()
    if not raw:
        raise DomainError("AUTH_INVALID", "Invite token is required.", http=401)
    token = (
        PasswordSetupToken.objects.select_related("user")
        .filter(token_hash=hash_setup_token(raw))
        .first()
    )
    if token is None or token.consumed_at is not None:
        raise DomainError("AUTH_INVALID", "Invalid or expired invite link.", http=401)
    if token.expires_at < timezone.now():
        raise DomainError("AUTH_INVALID", "This invite link has expired.", http=401)
    if not token.user.is_active:
        raise DomainError("AUTH_INVALID", "This account is inactive.", http=401)
    return token


def enqueue_staff_invite_email(*, user_id: str, raw_token: str) -> None:
    """Send invite after commit via Django Tasks (ImmediateBackend locally)."""
    from django.db import transaction

    def _send() -> None:
        from accounts.models import User
        from core.tasks import send_templated_email_task

        user = User.objects.filter(pk=user_id).select_related("assigned_role").first()
        if user is None or not user.email:
            logger.warning("invite_email_skipped user_id=%s", user_id)
            return
        role_label = (
            user.assigned_role.name
            if user.assigned_role_id
            else (user.get_role_display() if hasattr(user, "get_role_display") else user.role)
        )
        setup_url = admin_setup_url(raw_token=raw_token, email=user.email)
        send_templated_email_task.enqueue(
            to=user.email,
            subject="Set up your Kura console password",
            template="staff_invite",
            context={
                "first_name": user.first_name,
                "role_label": role_label,
                "setup_url": setup_url,
                "expires_hours": int(INVITE_TTL.total_seconds() // 3600),
            },
        )

    transaction.on_commit(_send)
