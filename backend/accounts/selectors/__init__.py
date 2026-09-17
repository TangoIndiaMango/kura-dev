"""Read-side query builders for accounts — scoped, join-aware."""
from __future__ import annotations

from django.db.models import QuerySet

from accounts.models import Account, Driver, User
from accounts.permissions import user_capability_set, user_has_capability
from accounts.selectors.roles import roles_qs
from accounts.selectors.scope import account_ids_touching_hubs, hub_ids_for
from accounts.selectors.stats import (
    account_detail_stats,
    account_stats,
    role_stats,
    staff_user_stats,
)

__all__ = [
    "accounts_for",
    "drivers_for",
    "reconcile_onboarding",
    "advance_onboarding",
    "me_payload",
    "account_stats",
    "staff_user_stats",
    "role_stats",
    "account_detail_stats",
    "roles_qs",
    "hub_ids_for",
    "account_ids_touching_hubs",
]

def accounts_for(user: User) -> QuerySet[Account]:
    qs = Account.objects.order_by("-created_at")
    if user_has_capability(user, "accounts:read") or user_has_capability(
        user, "accounts:manage"
    ):
        return qs
    scope = hub_ids_for(user)
    if scope is not None:
        if not scope:
            return qs.none()
        return qs.filter(id__in=account_ids_touching_hubs(scope))
    return qs.filter(owner_user=user)


def drivers_for(user: User) -> QuerySet[Driver]:
    qs = Driver.objects.select_related("user", "account").order_by("-created_at")
    if user_has_capability(user, "accounts:read") or user_has_capability(
        user, "accounts:manage"
    ):
        return qs
    scope = hub_ids_for(user)
    if scope is not None:
        if not scope:
            return qs.none()
        return qs.filter(account_id__in=account_ids_touching_hubs(scope))
    return qs.filter(user=user)


def reconcile_onboarding(user: User) -> User:
    """Keep onboarding_step aligned with real progress (e.g. PIN set outside AuthService).

    Adding a vehicle and choosing a plan are in-app tasks surfaced on Home, not
    entry gates, so legacy rows parked on those steps are healed to DONE.
    """
    step = user.onboarding_step
    if user.pin_hash and step == User.OnboardingStep.PIN:
        step = User.OnboardingStep.PROFILE
    if step in {User.OnboardingStep.VEHICLE, User.OnboardingStep.PLAN}:
        step = User.OnboardingStep.DONE
    if step != user.onboarding_step:
        user.onboarding_step = step
        user.save(update_fields=["onboarding_step", "updated_at"])
    return user


def advance_onboarding(user: User, step: str) -> User:
    """Single write path for onboarding progress — never infer from display names."""
    if user.onboarding_step != step:
        user.onboarding_step = step
        user.save(update_fields=["onboarding_step", "updated_at"])
    return user


def me_payload(user: User) -> dict:
    from accounts.models import Driver
    from accounts.serializers import AccountSerializer, UserSerializer
    from accounts.services.identity import IdentityService
    from accounts.services.profile import normalized_notif_prefs
    from core.services.media import delivery_url

    user = reconcile_onboarding(user)
    user = User.objects.select_related("avatar").get(pk=user.pk)
    driver = (
        Driver.objects.select_related("account", "photo")
        .filter(user_id=user.id)
        .first()
    )
    account = driver.account if driver else user.accounts.order_by("created_at").first()
    kyc = IdentityService.kyc_payload(account, driver=driver) if account else None
    photo_url = delivery_url(user.avatar) or (
        delivery_url(driver.photo) if driver else None
    )
    return {
        "user": UserSerializer(user).data,
        "account": AccountSerializer(account).data if account else None,
        "capabilities": sorted(user_capability_set(user)),
        "onboarding_step": user.onboarding_step,
        "is_driver": user.role == User.Role.DRIVER,
        "is_staff": bool(
            user.is_staff
            or user.role
            in {
                User.Role.SUPER_ADMIN,
                User.Role.OPS_MANAGER,
                User.Role.HUB_AGENT,
                User.Role.COMMERCIAL_ADMIN,
            }
        ),
        "has_pin": bool(user.pin_hash),
        "photo_url": photo_url,
        "notification_prefs": normalized_notif_prefs(user.notification_prefs),
        "kyc": kyc,
    }
