"""F4 swap reverse — COMPLETED → REVERSED within 24h (ledger + custody)."""
from __future__ import annotations

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.services.events import emit_event
from finance.services import WalletHoldService
from mobility.models import Battery, HubSlot, Reservation, Swap
from mobility.models import BatteryEvent
from mobility.services.batteries.custody import apply_custodian, record_battery_event
from mobility.services.swap.custody import rollback_issue_custody

REVERSE_WINDOW = timedelta(hours=24)


def reverse_swap(*, swap: Swap, reason: str, actor=None) -> Swap:
    note = (reason or "").strip()
    if not note:
        raise DomainError(
            "VALIDATION_ERROR",
            "A reason is required to reverse a swap.",
            details={"reason": ["required"]},
        )

    with transaction.atomic():
        locked = (
            Swap.objects.select_for_update(of=("self",))
            .select_related(
                "hub",
                "vehicle",
                "account",
                "issued_battery",
                "returned_battery",
                "payment",
                "subscription",
            )
            .get(pk=swap.pk)
        )
        if locked.status != Swap.Status.COMPLETED:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Only COMPLETED swaps can be reversed (got {locked.status}).",
                http=409,
            )
        if (
            locked.completed_at is None
            or timezone.now() - locked.completed_at > REVERSE_WINDOW
        ):
            raise DomainError(
                "INVALID_TRANSITION",
                "Swap reverse is only allowed within 24 hours of completion.",
                http=409,
            )

        before = {
            "status": locked.status,
            "amount_kobo": locked.amount_kobo,
            "payment_mode": locked.payment_mode,
        }

        if locked.issued_battery_id:
            rollback_issue_custody(
                hub=locked.hub,
                vehicle=locked.vehicle,
                issued_battery=locked.issued_battery,
                swap=locked,
                agent=actor,
            )

        returned = locked.returned_battery
        if returned is not None:
            _remount_returned(
                hub=locked.hub,
                vehicle=locked.vehicle,
                returned=returned,
                swap=locked,
                agent=actor,
            )

        _reverse_money(locked=locked)

        locked.status = Swap.Status.REVERSED
        locked.save(update_fields=["status", "updated_at"])

        emit_event(
            action="swap.reversed",
            subject_type="swap",
            subject_id=str(locked.id),
            actor=actor,
            before=before,
            after={"status": locked.status},
            metadata={"reason": note[:400]},
        )
        return locked


def _remount_returned(*, hub, vehicle, returned: Battery, swap, agent) -> None:
    from_type, from_id = returned.custodian_type, returned.custodian_id
    slot = HubSlot.objects.filter(hub=hub, battery=returned).first()
    if slot is not None:
        slot.battery = None
        slot.state = HubSlot.State.EMPTY
        slot.save(update_fields=["battery", "state", "updated_at"])

    returned.status = Battery.Status.ISSUED
    apply_custodian(
        returned,
        custodian_type=Battery.Custodian.VEHICLE,
        custodian_id=vehicle.id,
        clear_hub=True,
    )
    returned.save()
    vehicle.current_battery = returned
    vehicle.save(update_fields=["current_battery", "updated_at"])

    record_battery_event(
        battery=returned,
        event=BatteryEvent.Event.ISSUED,
        actor=agent,
        hub=hub,
        swap=swap,
        from_type=from_type,
        from_id=from_id,
        to_type=Battery.Custodian.VEHICLE,
        to_id=vehicle.id,
        charge_pct=returned.charge_pct,
        meta={"reverse": True},
        source=BatteryEvent.Source.SYSTEM,
    )


def _reverse_money(*, locked: Swap) -> None:
    mode = (locked.payment_mode or "").upper()
    fee = int(locked.amount_kobo or 0)
    if mode == Reservation.PaymentMode.PLAN and locked.subscription_id:
        sub = locked.subscription
        if sub is not None and sub.swaps_used > 0:
            sub.swaps_used -= 1
            sub.save(update_fields=["swaps_used", "updated_at"])
        return
    if fee <= 0:
        return
    if mode == Reservation.PaymentMode.WALLET:
        WalletHoldService.reverse_capture(
            account=locked.account,
            amount_kobo=fee,
            reference=str(locked.id)[:20],
            payment=locked.payment,
        )
        return
    if mode == Reservation.PaymentMode.CASH:
        if locked.payment_id and locked.payment.status == "SUCCESS":
            locked.payment.status = "REVERSED"
            locked.payment.save(update_fields=["status", "updated_at"])
