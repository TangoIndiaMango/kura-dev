"""UNRETURNED_48H — suspend accounts with overdue ISSUED packs."""
from __future__ import annotations

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from accounts.models import Account, User
from accounts.services.accounts import AccountService
from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event
from mobility.models import Battery
from mobility.models import BatteryEvent
from mobility.services.batteries.custody import apply_custodian, record_battery_event
from notifications.models import Notification
from risk.services.events import RiskService


def assert_no_unreturned_battery(*, account: Account) -> None:
    overdue = Battery.objects.filter(
        status=Battery.Status.ISSUED,
        mounted_vehicle__account_id=account.id,
    ).filter(
        Q(expected_return_by__lt=timezone.now())
        | Q(
            expected_return_by__isnull=True,
            issued_at__lt=timezone.now() - timezone.timedelta(hours=48),
        )
    ).exists()
    if overdue:
        raise DomainError(
            "BATTERY_UNRETURNED",
            "Account has an unreturned battery past the return window.",
            http=409,
        )


def _notify_target(*, account: Account | None) -> User | None:
    """Chairman when coop linked, otherwise account owner."""
    if account is None:
        return None
    coop = getattr(account, "cooperative", None)
    if coop is not None and coop.chairman_user_id:
        chair = getattr(coop, "chairman_user", None)
        if chair is not None and chair.is_active:
            return chair
    return account.owner_user


def _enqueue_unreturned_email(*, user: User, battery: Battery, account: Account) -> None:
    if not user.email:
        return
    from django.db import transaction as db_tx

    def _send() -> None:
        from core.tasks import send_templated_email_task

        send_templated_email_task.enqueue(
            to=user.email,
            subject=f"Unreturned battery {battery.serial}",
            template="battery_unreturned",
            context={
                "first_name": user.first_name,
                "serial": battery.serial,
                "account_label": account.kura_id or account.display_name,
            },
        )

    db_tx.on_commit(_send)


def process_unreturned_batteries(*, limit: int = 200) -> dict:
    now = timezone.now()
    ids = list(
        Battery.objects.filter(status=Battery.Status.ISSUED)
        .filter(
            Q(expected_return_by__lt=now)
            | Q(
                expected_return_by__isnull=True,
                issued_at__lt=now - timezone.timedelta(hours=48),
            )
        )
        .order_by("expected_return_by", "issued_at")
        .values_list("id", flat=True)[:limit]
    )
    processed = 0
    suspended = 0
    for bat_id in ids:
        with transaction.atomic():
            battery = (
                Battery.objects.select_for_update(of=("self",))
                .select_related(
                    "mounted_vehicle__account__owner_user",
                    "mounted_vehicle__account__cooperative__chairman_user",
                )
                .filter(pk=bat_id, status=Battery.Status.ISSUED)
                .first()
            )
            if battery is None:
                continue
            vehicle = getattr(battery, "mounted_vehicle", None)
            account = vehicle.account if vehicle is not None else None
            RiskService.emit(
                rule_code="UNRETURNED_48H",
                subject_type="battery",
                subject_id=str(battery.id),
                account=account,
                action_taken="SUSPEND",
                context={"serial": battery.serial},
            )
            from_type, from_id = battery.custodian_type, battery.custodian_id
            battery.status = Battery.Status.LOST
            apply_custodian(
                battery,
                custodian_type=Battery.Custodian.NONE,
                custodian_id=None,
                clear_hub=True,
            )
            battery.save()
            record_battery_event(
                battery=battery,
                event=BatteryEvent.Event.LOST,
                from_type=from_type,
                from_id=from_id,
                to_type=Battery.Custodian.NONE,
                to_id=None,
                meta={"reason": "UNRETURNED_48H"},
                source=BatteryEvent.Source.SYSTEM,
            )
            notify_user = _notify_target(account=account)
            owner = account.owner_user if account is not None else None
            if notify_user is not None:
                emit_event(
                    action="battery.unreturned",
                    subject_type="battery",
                    subject_id=str(battery.id),
                    subject_label=battery.serial,
                    actor=None,
                    after={"status": battery.status},
                    metadata={
                        "account_id": str(account.id) if account else None,
                        "notify_user_id": str(notify_user.id),
                    },
                    notify=NotifySpec(
                        user=notify_user,
                        title=f"Battery {battery.serial} unreturned",
                        body=(
                            "Pack past 48h return window — "
                            "account suspended pending recovery."
                        ),
                        source="Batteries",
                        severity=Notification.Severity.WARNING,
                        link_path=f"/batteries/{battery.id}",
                        template_code="battery.unreturned",
                        dedupe_key=f"battery.unreturned:{battery.id}",
                    ),
                )
                if account is not None:
                    _enqueue_unreturned_email(
                        user=notify_user, battery=battery, account=account
                    )
            if account is not None and account.status == Account.Status.ACTIVE and owner:
                AccountService.suspend(
                    account=account,
                    actor=owner,
                    reason=f"UNRETURNED_48H battery {battery.serial}",
                )
                suspended += 1
            processed += 1
    return {"processed": processed, "suspended": suspended}
