"""Finance read queries — capability-scoped wallets and payments."""
from __future__ import annotations

from django.db.models import QuerySet

from accounts.helpers.staff import STAFF_ROLES
from accounts.permissions import user_has_capability
from finance.models import Payment, Wallet


def _own_account_ids(user) -> list:
    ids: list = []
    driver = getattr(user, "driver_profile", None)
    if driver is not None:
        ids.append(driver.account_id)
    ids.extend(user.accounts.values_list("id", flat=True))
    return list({i for i in ids if i})


def _can_read_all_finance(user) -> bool:
    if user_has_capability(user, "wallets:manage"):
        return True
    if not user_has_capability(user, "finance:read"):
        return False
    role = getattr(user, "role", "") or ""
    return bool(getattr(user, "is_staff", False) or role in STAFF_ROLES)


def wallets_for(user) -> QuerySet[Wallet]:
    qs = Wallet.objects.select_related("account").order_by("-created_at")
    if _can_read_all_finance(user):
        return qs
    own = _own_account_ids(user)
    if not own:
        return qs.none()
    return qs.filter(account_id__in=own)


def payments_for(user) -> QuerySet[Payment]:
    qs = Payment.objects.select_related("account", "hub").order_by(
        "-created_at", "-id"
    )
    if _can_read_all_finance(user):
        return qs
    own = _own_account_ids(user)
    if not own:
        return qs.none()
    return qs.filter(account_id__in=own)
