"""Vehicle L1 QR — signed hull tag payload (PRD GET /vehicles/{id}/qr)."""
from __future__ import annotations

import secrets
import time

from django.db import transaction

from core.helpers.crypto_qr import sign_parts, verify_sig
from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import Vehicle


def build_vehicle_token(*, vehicle_id: str, exp_unix: int, secret: str) -> str:
    sig = sign_parts("veh", vehicle_id, str(exp_unix), secret=secret)
    return f"v1.{vehicle_id}.{exp_unix}.{sig}"


def verify_vehicle_token(*, token: str, secret: str) -> dict:
    parts = (token or "").strip().split(".")
    if len(parts) != 4 or parts[0] != "v1":
        raise DomainError("AUTH_INVALID", "Malformed vehicle QR.", http=401)
    vehicle_id, exp_s, sig = parts[1], parts[2], parts[3]
    try:
        exp = int(exp_s)
    except ValueError as exc:
        raise DomainError("AUTH_INVALID", "Malformed vehicle QR.", http=401) from exc
    if exp < int(time.time()):
        raise DomainError("AUTH_INVALID", "Vehicle QR expired.", http=401)
    if not verify_sig(
        parts=["veh", vehicle_id, str(exp)], secret=secret, sig=sig
    ):
        raise DomainError("AUTH_INVALID", "Vehicle QR signature invalid.", http=401)
    return {"vehicle_id": vehicle_id, "exp": exp, "token": token}


@transaction.atomic
def ensure_vehicle_qr_secret(vehicle: Vehicle) -> Vehicle:
    if vehicle.qr_secret:
        return vehicle
    locked = Vehicle.objects.select_for_update().get(pk=vehicle.pk)
    if not locked.qr_secret:
        locked.qr_secret = secrets.token_urlsafe(24)
        locked.save(update_fields=["qr_secret", "updated_at"])
    return locked


def vehicle_qr_payload(*, vehicle: Vehicle, ttl_hours: int = 24) -> dict:
    vehicle = ensure_vehicle_qr_secret(vehicle)
    exp = int(time.time()) + max(1, ttl_hours) * 3600
    payload = build_vehicle_token(
        vehicle_id=str(vehicle.id),
        exp_unix=exp,
        secret=vehicle.qr_secret,
    )
    return {
        "vehicle_id": str(vehicle.id),
        "registration_plate": vehicle.registration_plate,
        "qr": payload,
        "expires_at": exp,
    }


def resolve_vehicle_qr(*, token: str) -> Vehicle:
    # Peek id without verifying first to load secret
    parts = (token or "").strip().split(".")
    if len(parts) != 4 or parts[0] != "v1":
        raise DomainError("AUTH_INVALID", "Malformed vehicle QR.", http=401)
    try:
        vehicle = Vehicle.objects.get(pk=parts[1])
    except Vehicle.DoesNotExist as exc:
        raise DomainError("NOT_FOUND", "Vehicle not found.", http=404) from exc
    vehicle = ensure_vehicle_qr_secret(vehicle)
    parsed = verify_vehicle_token(token=token, secret=vehicle.qr_secret)
    if parsed["vehicle_id"] != str(vehicle.id):
        raise DomainError("AUTH_INVALID", "Vehicle QR mismatch.", http=401)
    return vehicle


@transaction.atomic
def rotate_vehicle_qr(*, vehicle: Vehicle, actor=None) -> dict:
    locked = Vehicle.objects.select_for_update().get(pk=vehicle.pk)
    locked.qr_secret = secrets.token_urlsafe(24)
    locked.save(update_fields=["qr_secret", "updated_at"])
    emit_event(
        action="vehicle.qr_rotated",
        subject_type="vehicle",
        subject_id=str(locked.id),
        subject_label=locked.registration_plate,
        actor=actor,
    )
    return vehicle_qr_payload(vehicle=locked)
