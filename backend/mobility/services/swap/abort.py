"""F4 swap abort — → FAILED; rollback issued pack; release hold."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.services.events import emit_event
from finance.services import WalletHoldService
from mobility.models import Reservation, Swap
from mobility.services.swap.custody import rollback_issue_custody


def abort_swap(*, swap: Swap, reason: str = "", agent=None) -> Swap:
    with transaction.atomic():
        locked = (
            Swap.objects.select_for_update(of=("self",))
            .select_related(
                "hub", "vehicle", "issued_battery", "reservation", "account"
            )
            .get(pk=swap.pk)
        )
        if locked.status in {
            Swap.Status.COMPLETED,
            Swap.Status.FAILED,
            Swap.Status.REVERSED,
        }:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot abort swap in status {locked.status}.",
                http=409,
            )

        if locked.status == Swap.Status.ISSUED and locked.issued_battery_id:
            rollback_issue_custody(
                hub=locked.hub,
                vehicle=locked.vehicle,
                issued_battery=locked.issued_battery,
                swap=locked,
                agent=agent,
            )
            locked.issued_battery = None
            locked.save(update_fields=["issued_battery", "updated_at"])

        reservation = locked.reservation
        if reservation is not None:
            reservation = Reservation.objects.select_for_update().get(pk=reservation.pk)
            held = int(reservation.hold_amount_kobo or 0)
            if held > 0 and reservation.payment_mode == Reservation.PaymentMode.WALLET:
                WalletHoldService.release(
                    account=reservation.account,
                    amount_kobo=held,
                    reference=reservation.code,
                )
            reservation.hold_amount_kobo = 0
            if reservation.status == Reservation.Status.EXPIRED:
                pass
            elif (
                reservation.status
                in {
                    Reservation.Status.PENDING,
                    Reservation.Status.CONFIRMED,
                }
                and reservation.expires_at <= timezone.now()
            ):
                reservation.status = Reservation.Status.EXPIRED
            else:
                reservation.status = Reservation.Status.CANCELLED
            reservation.save(
                update_fields=["hold_amount_kobo", "status", "updated_at"]
            )

        locked.status = Swap.Status.FAILED
        locked.save(update_fields=["status", "updated_at"])

        emit_event(
            action="swap.aborted",
            subject_type="swap",
            subject_id=str(locked.id),
            actor=agent,
            metadata={"reason": (reason or "").strip()[:200]},
        )
        return locked
