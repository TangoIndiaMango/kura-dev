"""Operator/admin display helpers for swap + reservation rows."""
from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from mobility.models import Reservation, Swap

# Bay session abandoned if still open this long after start.
STALE_OPEN_AFTER = timedelta(hours=2)


def reservation_effective_status(reservation: Reservation | None) -> str:
    if reservation is None:
        return ""
    status = reservation.status
    if status in {
        Reservation.Status.EXPIRED,
        Reservation.Status.CANCELLED,
        Reservation.Status.USED,
    }:
        return status
    if status in {
        Reservation.Status.PENDING,
        Reservation.Status.CONFIRMED,
    } and reservation.expires_at <= timezone.now():
        return Reservation.Status.EXPIRED
    return status


def swap_ui_status(swap: Swap) -> str:
    """
    Shared list lifecycle (API + UIs):
    COMPLETED / FAILED / REVERSED stay raw.
    Open bay → IN_PROGRESS | AT_HUB | INCOMPLETE (hold expired / stale).
    """
    status = swap.status
    if status in {
        Swap.Status.COMPLETED,
        Swap.Status.FAILED,
        Swap.Status.REVERSED,
    }:
        return status

    reservation = getattr(swap, "reservation", None)
    hold_status = reservation_effective_status(reservation)
    hold_gone = hold_status in {
        Reservation.Status.EXPIRED,
        Reservation.Status.CANCELLED,
    }
    started = swap.started_at or swap.created_at
    stale = bool(started and started <= timezone.now() - STALE_OPEN_AFTER)

    if status == Swap.Status.STARTED and (hold_gone or stale):
        return "INCOMPLETE"
    if status in {Swap.Status.RETURN_RECORDED, Swap.Status.ISSUED} and (
        hold_gone or stale
    ):
        return "INCOMPLETE"
    if status in {Swap.Status.RETURN_RECORDED, Swap.Status.ISSUED}:
        return "AT_HUB"
    return "IN_PROGRESS"


def swap_display_amount_kobo(swap: Swap) -> int:
    """
    Money for lists:
    - COMPLETED / settled amount_kobo
    - INCOMPLETE → 0 (never show phantom PPS as a charge)
    - open PAYG → reservation hold, else live PPS estimate
    """
    ui = swap_ui_status(swap)
    if ui == "INCOMPLETE":
        return 0
    if int(swap.amount_kobo or 0) > 0:
        return int(swap.amount_kobo)

    reservation = getattr(swap, "reservation", None)
    if reservation is not None and int(reservation.hold_amount_kobo or 0) > 0:
        return int(reservation.hold_amount_kobo)

    if ui in {"IN_PROGRESS", "AT_HUB"}:
        mode = (swap.payment_mode or "").upper()
        if mode in {"WALLET", "CREDIT", "CASH"}:
            from mobility.services.plans.pricing import PricingService

            vehicle = getattr(swap, "vehicle", None)
            model = getattr(vehicle, "vehicle_model", None) if vehicle else None
            vtype = getattr(model, "vehicle_type", "") or ""
            return int(PricingService.resolve_pps_kobo(vehicle_type=str(vtype)))
    return 0
