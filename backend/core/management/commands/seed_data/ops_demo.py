"""Ops demo: sync stamps, solar alert, cooperative, open shift for cash tests."""
from __future__ import annotations

from django.utils import timezone

from accounts.models import Account, Cooperative, StaffMembership, User
from accounts.services.roles import RoleService
from mobility.models import Hub
from operations.models import Alert, Shift
from operations.services.shifts import ShiftService


def seed_ops_demo(
    *,
    users: dict[str, User],
    hubs: list[Hub],
    account: Account | None = None,
) -> Cooperative:
    RoleService.sync_catalog()

    now = timezone.now()
    for i, hub in enumerate(hubs):
        Hub.objects.filter(pk=hub.pk).update(
            last_sync_at=now - timezone.timedelta(minutes=3 + i * 7)
        )

    yaba = hubs[0]
    Alert.objects.get_or_create(
        kind=Alert.Kind.SOLAR_FAULT,
        hub=yaba,
        status=Alert.Status.OPEN,
        defaults={
            "severity": Alert.Severity.WARNING,
            "message": f"{yaba.code} inverter string B offline — using grid.",
        },
    )

    chairman = users.get("ops")
    coop, _ = Cooperative.objects.get_or_create(
        name="Lagos Express Cooperative",
        defaults={
            "region": "Lagos",
            "status": Cooperative.Status.ACTIVE,
            "chairman_user": chairman,
        },
    )
    if chairman and coop.chairman_user_id != chairman.id:
        coop.chairman_user = chairman
        coop.save(update_fields=["chairman_user", "updated_at"])

    if account is not None and account.cooperative_id != coop.id:
        account.cooperative = coop
        account.save(update_fields=["cooperative", "updated_at"])

    agent = users["agent"]
    StaffMembership.objects.update_or_create(
        user=agent,
        role=User.Role.HUB_AGENT,
        defaults={"hub_id": str(yaba.id)},
    )

    open_shift = (
        Shift.objects.filter(agent=agent, hub=yaba, status=Shift.Status.OPEN)
        .order_by("-opened_at")
        .first()
    )
    if open_shift is None:
        ShiftService.open_shift(
            agent=agent,
            hub=yaba,
            opening_cash_kobo=200_000,
            actor=agent,
        )
    return coop
