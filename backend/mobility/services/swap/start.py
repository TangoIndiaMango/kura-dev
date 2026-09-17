"""F4 swap start — create STARTED row with client_event_id idempotency."""
from __future__ import annotations

from django.db import IntegrityError, transaction
from django.utils import timezone

from accounts.models import Account
from accounts.selectors.scope import hub_ids_for
from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import Hub, Reservation, Swap, Vehicle
from mobility.services.reservations.service import ReservationService
from mobility.services.swap.risk import assert_swap_velocity
from mobility.services.vehicles.qr import resolve_vehicle_qr

_OPEN_SWAP = (
    Swap.Status.STARTED,
    Swap.Status.RETURN_RECORDED,
    Swap.Status.ISSUED,
)


def _peek_vehicle_account(
    *,
    reservation_id=None,
    vehicle_id=None,
    vehicle_qr: str = "",
    account_id=None,
) -> tuple:
    if reservation_id:
        reservation = (
            Reservation.objects.select_related("vehicle", "account")
            .filter(id=reservation_id)
            .first()
        )
        if reservation is None:
            raise DomainError("NOT_FOUND", "Reservation not found.", http=404)
        return reservation.vehicle_id, reservation.account
    if vehicle_qr:
        vehicle = resolve_vehicle_qr(token=vehicle_qr)
        account = Account.objects.filter(pk=account_id).first() if account_id else None
        return vehicle.id, account
    if vehicle_id:
        account = Account.objects.filter(pk=account_id).first() if account_id else None
        return vehicle_id, account
    raise DomainError(
        "VALIDATION_ERROR",
        "Provide reservation_id or vehicle_id / vehicle_qr.",
    )


def start_swap(
    *,
    hub_id,
    client_event_id: str,
    reservation_id=None,
    vehicle_id=None,
    vehicle_qr: str = "",
    driver_id=None,
    account_id=None,
    agent=None,
) -> Swap:
    cid = (client_event_id or "").strip()
    if not cid:
        raise DomainError(
            "VALIDATION_ERROR",
            "client_event_id is required.",
            details={"client_event_id": ["required"]},
        )

    if agent is not None:
        hub_scope = hub_ids_for(agent)
        if hub_scope is not None and str(hub_id) not in {
            str(scoped_hub_id) for scoped_hub_id in hub_scope
        }:
            raise DomainError("NOT_FOUND", "Hub not found.", http=404)

    existing = Swap.objects.filter(client_event_id=cid).first()
    if existing is not None:
        return existing

    peek_vehicle_id, peek_account = _peek_vehicle_account(
        reservation_id=reservation_id,
        vehicle_id=vehicle_id,
        vehicle_qr=vehicle_qr,
        account_id=account_id,
    )
    assert_swap_velocity(vehicle_id=peek_vehicle_id, account=peek_account)

    with transaction.atomic():
        existing = (
            Swap.objects.select_for_update(of=("self",))
            .filter(client_event_id=cid)
            .first()
        )
        if existing is not None:
            return existing

        hub = Hub.objects.select_for_update().get(id=hub_id)
        reservation = None
        if reservation_id:
            reservation = (
                Reservation.objects.select_for_update()
                .filter(id=reservation_id)
                .first()
            )
            if reservation is None:
                raise DomainError("NOT_FOUND", "Reservation not found.", http=404)
            reservation = (
                Reservation.objects.select_related(
                    "account", "vehicle", "driver", "hub"
                ).get(pk=reservation.pk)
            )
            reservation = ReservationService.ensure_fresh(reservation=reservation)
            if reservation.status == Reservation.Status.USED:
                raise DomainError(
                    "INVALID_TRANSITION",
                    "Reservation already used.",
                    http=409,
                )
            if reservation.status not in {
                Reservation.Status.CONFIRMED,
                Reservation.Status.PENDING,
            }:
                raise DomainError(
                    "INVALID_TRANSITION",
                    f"Reservation status {reservation.status} cannot start.",
                    http=409,
                )
            open_swap = (
                Swap.objects.select_for_update(of=("self",))
                .select_related(
                    "returned_battery",
                    "issued_battery",
                    "vehicle",
                    "hub",
                    "reservation",
                    "account",
                )
                .filter(
                    reservation_id=reservation.id,
                    status__in=_OPEN_SWAP,
                )
                .order_by("-started_at")
                .first()
            )
            if open_swap is not None:
                return open_swap
            if Swap.objects.filter(
                reservation_id=reservation.id,
                status=Swap.Status.COMPLETED,
            ).exists():
                raise DomainError(
                    "INVALID_TRANSITION",
                    "Reservation already has a completed swap.",
                    http=409,
                )
            if str(reservation.hub_id) != str(hub.id):
                raise DomainError(
                    "RESERVATION_HUB_MISMATCH",
                    f"This hold is for {reservation.hub.code}, not the current bay.",
                    http=409,
                )
            vehicle = reservation.vehicle
            driver_id = reservation.driver_id
            account_id = reservation.account_id
        else:
            if vehicle_qr:
                vehicle = resolve_vehicle_qr(token=vehicle_qr)
            elif vehicle_id:
                vehicle = Vehicle.objects.select_for_update().get(id=vehicle_id)
            else:
                raise DomainError(
                    "VALIDATION_ERROR",
                    "Provide reservation_id or vehicle_id / vehicle_qr.",
                )
            vehicle = Vehicle.objects.select_for_update().get(pk=vehicle.id)
            if not driver_id or not account_id:
                raise DomainError(
                    "VALIDATION_ERROR",
                    "driver_id and account_id are required for walk-in start.",
                )

        try:
            swap = Swap.objects.create(
                reservation=reservation,
                account_id=account_id,
                vehicle=vehicle,
                driver_id=driver_id,
                hub=hub,
                agent=agent,
                status=Swap.Status.STARTED,
                source=(
                    reservation.source
                    if reservation is not None
                    else Swap.Source.HUB_APP
                ),
                payment_mode=(
                    reservation.payment_mode
                    if reservation is not None
                    else Reservation.PaymentMode.WALLET
                ),
                client_event_id=cid,
                started_at=timezone.now(),
                amount_kobo=0,
                vat_kobo=0,
                issued_battery=None,
            )
        except IntegrityError as exc:
            again = Swap.objects.filter(client_event_id=cid).first()
            if again is not None:
                return again
            raise DomainError(
                "INVALID_TRANSITION",
                "Could not start swap (conflict).",
                http=409,
            ) from exc

        emit_event(
            action="swap.started",
            subject_type="swap",
            subject_id=str(swap.id),
            actor=agent,
            metadata={
                "hub": hub.code,
                "vehicle": vehicle.registration_plate,
                "client_event_id": cid,
                "first_swap": vehicle.current_battery_id is None,
            },
        )
        return swap
