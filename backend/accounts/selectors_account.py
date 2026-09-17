"""Resolve operator account for the authenticated user."""
from __future__ import annotations

from accounts.models import Account
from core.exceptions import DomainError


def account_for_user(user) -> Account:
    driver = getattr(user, "driver_profile", None)
    account = driver.account if driver else user.accounts.order_by("created_at").first()
    if account is None:
        raise DomainError(
            "ACCOUNT_REQUIRED",
            "Complete profile before continuing.",
            http=400,
        )
    return account
