"""Expire stale holds and abort abandoned open swap sessions."""
from __future__ import annotations

import logging

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from mobility.helpers.swap_display import STALE_OPEN_AFTER, swap_ui_status
from mobility.models import Battery, Reservation, Swap
from mobility.services.reservations.service import ReservationService
from mobility.services.swap.abort import abort_swap

logger = logging.getLogger("kura.mobility")

_OPEN = (
    Swap.Status.STARTED,
    Swap.Status.RETURN_RECORDED,
    Swap.Status.ISSUED,
)


def expire_stale_reservations(*, limit: int = 200) -> dict:
    """PRD: expire_reservations — PENDING/CONFIRMED past expires_at."""
    now = timezone.now()
    ids = list(
        Reservation.objects.filter(
            status__in=[
                Reservation.Status.PENDING,
                Reservation.Status.CONFIRMED,
            ],
            expires_at__lte=now,
        )
        .order_by("expires_at")
        .values_list("id", flat=True)[:limit]
    )
    expired = 0
    for rid in ids:
        row = Reservation.objects.filter(pk=rid).first()
        if row is None:
            continue
        before = row.status
        ReservationService.expire_reservation(reservation=row)
        row.refresh_from_db()
        if row.status == Reservation.Status.EXPIRED and before != row.status:
            expired += 1
    return {
        "scanned": len(ids),
        "expired": expired,
        "released_packs": release_orphaned_reserved_batteries(),
    }


def release_orphaned_reserved_batteries() -> int:
    """RESERVED packs no PENDING/CONFIRMED hold points at go back to stock."""
    held = Reservation.objects.filter(
        status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED],
        battery_id__isnull=False,
    ).values("battery_id")
    return (
        Battery.objects.filter(status=Battery.Status.RESERVED)
        .exclude(id__in=held)
        .update(status=Battery.Status.AVAILABLE)
    )


def abandon_incomplete_swaps(*, limit: int = 100) -> dict:
    """
    Terminalise open swaps whose hold lapsed/cancelled or bay session went stale.
    Releases wallet hold via abort; no payment / receipt is created.
    """
    now = timezone.now()
    cutoff = now - STALE_OPEN_AFTER
    open_qs = (
        Swap.objects.filter(status__in=_OPEN)
        .select_related("reservation", "account", "hub", "vehicle", "issued_battery")
        .order_by("started_at", "created_at")
    )
    hold_dead = Q(
        reservation__status__in=[
            Reservation.Status.EXPIRED,
            Reservation.Status.CANCELLED,
        ]
    ) | Q(
        reservation__status__in=[
            Reservation.Status.PENDING,
            Reservation.Status.CONFIRMED,
        ],
        reservation__expires_at__lte=now,
    )
    candidates = list(
        open_qs.filter(Q(started_at__lte=cutoff) | hold_dead).distinct()[:limit]
    )
    if len(candidates) < limit:
        seen = {c.pk for c in candidates}
        for row in open_qs[: limit * 3]:
            if row.pk in seen:
                continue
            candidates.append(row)
            if len(candidates) >= limit * 2:
                break

    abandoned = 0
    for swap in candidates:
        if abandoned >= limit:
            break
        if swap_ui_status(swap) != "INCOMPLETE":
            continue
        try:
            abort_swap(
                swap=swap,
                reason="abandoned:hold_expired_or_stale",
                agent=None,
            )
            abandoned += 1
        except Exception:
            logger.exception("abandon_incomplete_swap_failed id=%s", swap.id)
    return {"checked": len(candidates), "abandoned": abandoned}


@transaction.atomic
def sweep_swap_lifecycle(*, reservation_limit: int = 200, swap_limit: int = 100) -> dict:
    """Expire holds first so swap_ui_status sees EXPIRED, then abort incompletes."""
    reservations = expire_stale_reservations(limit=reservation_limit)
    swaps = abandon_incomplete_swaps(limit=swap_limit)
    return {"reservations": reservations, "swaps": swaps}
