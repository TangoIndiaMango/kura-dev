"""Reservation cancel / expire / extend."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event
from finance.services import WalletHoldService
from mobility.models import Battery, Reservation
from mobility.services.plans.pricing import PricingService
from mobility.services.reservations.qr_token import issue_reservation_qr


def release_reservation_battery(*, reservation: Reservation, keep_battery_id=None) -> None:
    """Return the hold's pack to stock unless it is the pack being issued."""
    if not reservation.battery_id or reservation.battery_id == keep_battery_id:
        return
    Battery.objects.filter(
        pk=reservation.battery_id, status=Battery.Status.RESERVED
    ).update(status=Battery.Status.AVAILABLE)


def cancel_reservation(
    *,
    reservation: Reservation,
    actor=None,
    reason: str = "",
) -> Reservation:
    with transaction.atomic():
        reservation = (
            Reservation.objects.select_for_update()
            .select_related("account", "account__owner_user")
            .get(pk=reservation.pk)
        )
        if reservation.status in {
            Reservation.Status.USED,
            Reservation.Status.CANCELLED,
            Reservation.Status.EXPIRED,
        }:
            return reservation

        if reservation.hold_amount_kobo > 0:
            WalletHoldService.release(
                account=reservation.account,
                amount_kobo=reservation.hold_amount_kobo,
                reference=reservation.code,
            )
            reservation.hold_amount_kobo = 0

        if reservation.discount_code:
            from mobility.services.plans.discounts import DiscountService

            DiscountService.release_reservation(reservation=reservation)

        if reservation.battery_id:
            Battery.objects.filter(pk=reservation.battery_id).update(
                status=Battery.Status.AVAILABLE
            )

        reservation.status = Reservation.Status.CANCELLED
        reservation.save(update_fields=["status", "hold_amount_kobo", "updated_at"])
        emit_event(
            action="reservation.cancelled",
            subject_type="reservation",
            subject_id=str(reservation.id),
            subject_label=reservation.code,
            actor=actor,
            metadata={"reason": reason[:200]} if reason else None,
            notify=(
                NotifySpec(
                    user=reservation.account.owner_user,
                    title="Reservation cancelled",
                    body=(
                        reason
                        or "Your battery reservation was cancelled and any hold was released."
                    )[:200],
                    source="Reservations",
                    link_path="/swap",
                    template_code="reservation.cancelled",
                    dedupe_key=f"reservation.cancelled:{reservation.id}",
                )
                if reservation.account.owner_user
                else None
            ),
        )
        from mobility.services.swap.recovery import abort_linked_open_swap

        abort_linked_open_swap(
            reservation=reservation,
            reason="abandoned:hold_cancelled",
            actor=actor,
        )
        return reservation


def expire_reservation(*, reservation: Reservation) -> Reservation:
    with transaction.atomic():
        reservation = (
            Reservation.objects.select_for_update()
            .select_related("account")
            .get(pk=reservation.pk)
        )
        if reservation.status not in {
            Reservation.Status.PENDING,
            Reservation.Status.CONFIRMED,
        }:
            return reservation
        if reservation.expires_at > timezone.now():
            return reservation

        if reservation.hold_amount_kobo > 0:
            WalletHoldService.release(
                account=reservation.account,
                amount_kobo=reservation.hold_amount_kobo,
                reference=reservation.code,
            )
            reservation.hold_amount_kobo = 0

        if reservation.discount_code:
            from mobility.services.plans.discounts import DiscountService

            DiscountService.release_reservation(reservation=reservation)

        if reservation.battery_id:
            Battery.objects.filter(pk=reservation.battery_id).update(
                status=Battery.Status.AVAILABLE
            )

        reservation.status = Reservation.Status.EXPIRED
        reservation.save(update_fields=["status", "hold_amount_kobo", "updated_at"])
        emit_event(
            action="reservation.expired",
            subject_type="reservation",
            subject_id=str(reservation.id),
            subject_label=reservation.code,
        )
        from mobility.services.swap.recovery import abort_linked_open_swap

        abort_linked_open_swap(
            reservation=reservation,
            reason="abandoned:hold_expired",
            actor=None,
        )
        return reservation


def ensure_fresh(*, reservation: Reservation) -> Reservation:
    if reservation.status in {
        Reservation.Status.PENDING,
        Reservation.Status.CONFIRMED,
    } and reservation.expires_at <= timezone.now():
        return expire_reservation(reservation=reservation)
    return reservation


def extend_reservation(
    *,
    reservation: Reservation,
    minutes: int,
    actor=None,
    reason: str = "",
) -> Reservation:
    policy = PricingService.get_hold_policy()
    if minutes < 1 or minutes > policy.max_extend_minutes:
        raise DomainError(
            "VALIDATION_ERROR",
            f"Extend minutes must be 1–{policy.max_extend_minutes}.",
            details={"max_extend_minutes": policy.max_extend_minutes},
        )
    with transaction.atomic():
        reservation = (
            Reservation.objects.select_for_update()
            .select_related("account")
            .get(pk=reservation.pk)
        )
        reservation = ensure_fresh(reservation=reservation)
        if reservation.status not in {
            Reservation.Status.PENDING,
            Reservation.Status.CONFIRMED,
        }:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot extend reservation in status {reservation.status}.",
                http=409,
            )
        reservation.expires_at = reservation.expires_at + timezone.timedelta(
            minutes=minutes
        )
        qr = issue_reservation_qr(reservation=reservation)
        reservation.save(
            update_fields=[
                "expires_at",
                "token_hash",
                "token_ciphertext",
                "updated_at",
            ]
        )
        reservation._qr_token = qr
        emit_event(
            action="reservation.extended",
            subject_type="reservation",
            subject_id=str(reservation.id),
            subject_label=reservation.code,
            actor=actor,
            metadata={"minutes": minutes, "reason": reason[:200]},
        )
        return reservation
