"""Clear stuck open bay sessions without requiring another hub visit."""
from __future__ import annotations

import logging

from core.exceptions import DomainError
from mobility.helpers.swap_display import swap_ui_status
from mobility.models import Swap
from mobility.services.swap.abort import abort_swap

logger = logging.getLogger("kura.mobility")

_OPEN = (
    Swap.Status.STARTED,
    Swap.Status.RETURN_RECORDED,
    Swap.Status.ISSUED,
)


def abort_linked_open_swap(*, reservation, reason: str, actor=None) -> Swap | None:
    """If this hold already started a bay session, terminalise it."""
    swap = (
        Swap.objects.filter(reservation_id=reservation.pk, status__in=_OPEN)
        .select_related("reservation", "vehicle", "hub", "issued_battery", "account")
        .first()
    )
    if swap is None:
        return None
    try:
        return abort_swap(swap=swap, reason=reason, agent=actor)
    except DomainError as exc:
        if getattr(exc, "code", "") == "INVALID_TRANSITION":
            return None
        logger.exception("abort_linked_open_swap_failed id=%s", swap.id)
        raise


def clear_incomplete_swaps_for_vehicle(*, vehicle, actor=None) -> int:
    """
    On rebook: abort incomplete orphans; block if a live bay session is still open.
    """
    open_rows = list(
        Swap.objects.filter(vehicle=vehicle, status__in=_OPEN)
        .select_related("reservation", "vehicle__vehicle_model", "hub", "issued_battery", "account")
        .order_by("started_at", "created_at")
    )
    cleared = 0
    for swap in open_rows:
        ui = swap_ui_status(swap)
        if ui == "INCOMPLETE":
            abort_swap(
                swap=swap,
                reason="abandoned:rebook_clear",
                agent=actor,
            )
            cleared += 1
            continue
        raise DomainError(
            "SWAP_IN_PROGRESS",
            "This vehicle already has a swap open at the hub. "
            "Ask the hub agent to finish or abort it, or wait for the session to clear.",
            details={
                "swap_id": str(swap.id),
                "ui_status": ui,
                "status": swap.status,
            },
            http=409,
        )
    return cleared
