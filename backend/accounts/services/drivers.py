"""Attach drivers to an account and update soft limits — same Driver model."""
from __future__ import annotations

from django.db import transaction

from accounts.helpers.phones import normalize_ng_phone
from accounts.models import Account, Driver, User
from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event
from notifications.models import Notification


class DriverService:
    @staticmethod
    @transaction.atomic
    def attach(
        *,
        account: Account,
        phone: str,
        first_name: str = "",
        last_name: str = "",
        license_number: str = "",
        daily_swap_limit: int | None = None,
        daily_spend_kobo_limit: int | None = None,
        actor=None,
    ) -> Driver:
        e164 = normalize_ng_phone(phone)
        user = User.objects.filter(phone=e164).first()
        created_user = False
        if user is None:
            user = User.objects.create(
                phone=e164,
                first_name=(first_name or "").strip(),
                last_name=(last_name or "").strip(),
                role=User.Role.DRIVER,
                onboarding_step=User.OnboardingStep.DONE,
            )
            created_user = True
        elif user.role not in {User.Role.DRIVER, User.Role.FLEET_OWNER}:
            raise DomainError(
                "VALIDATION_ERROR",
                "Phone belongs to a staff user and cannot be a fleet driver.",
                http=409,
            )

        existing = Driver.objects.filter(user=user).select_related("account").first()
        if existing is not None and existing.account_id != account.id:
            raise DomainError(
                "DRIVER_ON_OTHER_ACCOUNT",
                "This phone is already a driver on another account.",
                http=409,
            )
        if existing is not None:
            driver = existing
            before = {
                "status": driver.status,
                "daily_swap_limit": driver.daily_swap_limit,
                "daily_spend_kobo_limit": driver.daily_spend_kobo_limit,
            }
            driver.license_number = (license_number or driver.license_number or "")[:50]
            driver.status = "ACTIVE"
            if daily_swap_limit is not None:
                driver.daily_swap_limit = daily_swap_limit
            if daily_spend_kobo_limit is not None:
                driver.daily_spend_kobo_limit = daily_spend_kobo_limit
            driver.save()
            action = "driver.reattached"
        else:
            before = None
            driver = Driver.objects.create(
                user=user,
                account=account,
                license_number=(license_number or "")[:50],
                status="ACTIVE",
                daily_swap_limit=daily_swap_limit,
                daily_spend_kobo_limit=daily_spend_kobo_limit,
            )
            action = "driver.attached"

        from mobility.services.vehicles.service import VehicleService

        VehicleService._maybe_promote_fleet(account_id=account.id, actor=actor)

        notify = None
        if user.pk != getattr(actor, "pk", None):
            notify = NotifySpec(
                user=user,
                title="Added to fleet",
                body=f"You can swap on {account.display_name} ({account.kura_id}).",
                source="Fleet",
                severity=Notification.Severity.INFO,
                channels=(Notification.Channel.IN_APP,),
                template_code="driver.attached",
                link_path="/",
                params={"account_id": str(account.id)},
                dedupe_key=f"driver.attached:{driver.id}:{account.id}",
            )
        emit_event(
            action=action,
            subject_type="driver",
            subject_id=str(driver.id),
            subject_label=e164,
            actor=actor,
            before=before,
            after={
                "account_id": str(account.id),
                "user_id": str(user.id),
                "created_user": created_user,
                "daily_swap_limit": driver.daily_swap_limit,
                "daily_spend_kobo_limit": driver.daily_spend_kobo_limit,
            },
            notify=notify,
        )
        return driver

    @staticmethod
    @transaction.atomic
    def update_limits(
        *,
        driver: Driver,
        daily_swap_limit: int | None | object = ...,
        daily_spend_kobo_limit: int | None | object = ...,
        actor=None,
    ) -> Driver:
        locked = Driver.objects.select_for_update().get(pk=driver.pk)
        before = {
            "daily_swap_limit": locked.daily_swap_limit,
            "daily_spend_kobo_limit": locked.daily_spend_kobo_limit,
        }
        if daily_swap_limit is not ...:
            locked.daily_swap_limit = daily_swap_limit
        if daily_spend_kobo_limit is not ...:
            locked.daily_spend_kobo_limit = daily_spend_kobo_limit
        locked.save(
            update_fields=[
                "daily_swap_limit",
                "daily_spend_kobo_limit",
                "updated_at",
            ]
        )
        emit_event(
            action="driver.limits_updated",
            subject_type="driver",
            subject_id=str(locked.id),
            subject_label=getattr(locked.user, "phone", "") or str(locked.id),
            actor=actor,
            before=before,
            after={
                "daily_swap_limit": locked.daily_swap_limit,
                "daily_spend_kobo_limit": locked.daily_spend_kobo_limit,
            },
        )
        return locked
