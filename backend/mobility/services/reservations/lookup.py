"""Bay reservation lookup — F4 token/code + triage envelope."""
from __future__ import annotations

from typing import Any

from core.exceptions import DomainError
from core.helpers.crypto_qr import (
    parse_reservation_token,
    token_hash,
    verify_reservation_token,
)
from core.services.media import delivery_url
from mobility.models import Reservation
from mobility.services.reservations.service import ReservationService
from mobility.services.vehicles.qr import resolve_vehicle_qr


def _driver_name(reservation: Reservation) -> str:
    user = reservation.driver.user
    parts = [user.first_name or "", user.last_name or ""]
    name = " ".join(p for p in parts if p).strip()
    return name or user.phone or user.email or "Rider"


def _photo_url(reservation: Reservation) -> str | None:
    photo = getattr(reservation.driver, "photo", None)
    return delivery_url(photo) if photo is not None else None


def _triage(reservation: Reservation) -> tuple[str, str, list[str]]:
    account = reservation.account
    flags: list[str] = []
    if reservation.status in {
        Reservation.Status.EXPIRED,
        Reservation.Status.CANCELLED,
        Reservation.Status.USED,
    }:
        return "RED", f"Reservation is {reservation.status}.", [reservation.status]
    if account.status == account.Status.SUSPENDED:
        return "RED", "Account suspended.", ["ACCOUNT_SUSPENDED"]
    if account.kyc_status == account.KycStatus.REJECTED:
        return "RED", "KYC rejected.", ["KYC_REJECTED"]
    if account.kyc_status != account.KycStatus.VERIFIED:
        flags.append("KYC_PENDING")
        return "AMBER", "KYC not verified.", flags
    if _photo_url(reservation) is None:
        flags.append("NO_FACE_PHOTO")
        return "AMBER", "No driver face on file.", flags
    mode = reservation.payment_mode
    if mode == Reservation.PaymentMode.PLAN:
        reason = "Active plan hold."
    elif mode == Reservation.PaymentMode.WALLET:
        reason = f"Wallet hold ₦{reservation.hold_amount_kobo / 100:,.2f}."
    else:
        reason = f"Payment mode {mode}."
    return "GREEN", reason, flags


def _resolve_row(
    *,
    code: str,
    token: str,
    vehicle_qr: str,
) -> Reservation:
    row: Reservation | None = None
    if token:
        parsed = parse_reservation_token(token)
        row = (
            Reservation.objects.select_related(
                "hub",
                "vehicle__vehicle_model__battery_type",
                "vehicle__current_battery",
                "driver__user",
                "driver__photo",
                "account",
                "battery",
            )
            .filter(id=parsed["reservation_id"])
            .first()
        )
        if row is None:
            raise DomainError("NOT_FOUND", "Hold not found.", http=404)
        verify_reservation_token(token=token, secret=str(row.id))
        stored = (row.token_hash or "").strip()
        if stored and stored != token_hash(token):
            raise DomainError("AUTH_INVALID", "Reservation QR no longer valid.", http=401)
    elif code:
        row = (
            Reservation.objects.select_related(
                "hub",
                "vehicle__vehicle_model__battery_type",
                "vehicle__current_battery",
                "driver__user",
                "driver__photo",
                "account",
                "battery",
            )
            .filter(code__iexact=code.strip().upper())
            .order_by("-created_at")
            .first()
        )
        if row is None:
            raise DomainError("NOT_FOUND", "Hold not found.", http=404)
    else:
        raise DomainError(
            "VALIDATION_ERROR",
            "Provide token or code.",
            details={"token": ["required_without_code"], "code": ["required_without_token"]},
        )

    if vehicle_qr:
        vehicle = resolve_vehicle_qr(token=vehicle_qr)
        if vehicle.id != row.vehicle_id:
            raise DomainError(
                "VALIDATION_ERROR",
                "Vehicle QR does not match this reservation.",
                details={"vehicle_qr": ["mismatch"]},
                http=409,
            )
    return row


def lookup_reservation(
    *,
    code: str = "",
    token: str = "",
    vehicle_qr: str = "",
    hub_id=None,
    reservation_serializer,
) -> dict[str, Any]:
    """Return F4 bay envelope: reservation + driver + vehicle + triage."""
    row = _resolve_row(code=code, token=token, vehicle_qr=vehicle_qr)
    row = ReservationService.ensure_fresh(reservation=row)

    if hub_id and str(row.hub_id) != str(hub_id):
        raise DomainError(
            "RESERVATION_HUB_MISMATCH",
            f"This hold is for {row.hub.code}, not the current bay.",
            details={
                "reservation_hub_id": str(row.hub_id),
                "reservation_hub_code": row.hub.code,
                "presented_hub_id": str(hub_id),
            },
            http=409,
        )

    triage, triage_reason, risk_flags = _triage(row)
    vehicle = row.vehicle
    bat = vehicle.current_battery
    btype = getattr(getattr(vehicle, "vehicle_model", None), "battery_type", None)
    first_swap = vehicle.current_battery_id is None

    return {
        "reservation": reservation_serializer(row).data,
        "driver": {
            "name": _driver_name(row),
            "photo_url": _photo_url(row),
        },
        "vehicle": {
            "id": str(vehicle.id),
            "registration": vehicle.registration_plate,
            "current_battery_serial": bat.serial if bat else None,
            "battery_type": btype.name if btype else None,
        },
        "triage": triage,
        "triage_reason": triage_reason,
        "risk_flags": risk_flags,
        "first_swap": first_swap,
    }
