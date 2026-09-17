"""Battery L1 QR label + resolve."""
from __future__ import annotations

from django.db import transaction

from core.helpers.crypto_qr import build_battery_token, verify_battery_token
from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import Battery
from mobility.models import BatteryEvent
from mobility.services.batteries.custody import record_battery_event
import secrets


def battery_label_payload(*, battery: Battery) -> dict:
    scheme = getattr(battery.battery_type, "qr_scheme", None) or "SIGNED"
    if scheme in {"BMS_AUTH", "NFC_SUN"}:
        raise DomainError(
            "UNSUPPORTED_SCHEME",
            f"{scheme} requires OEM hardware.",
            http=501,
        )
    if not battery.qr_secret:
        battery.qr_secret = secrets.token_urlsafe(24)
        battery.save(update_fields=["qr_secret", "updated_at"])
    if scheme == "PRINTED":
        payload = battery.serial
    else:
        payload = build_battery_token(serial=battery.serial, secret=battery.qr_secret)
    return {
        "serial": battery.serial,
        "qr_scheme": scheme,
        "payload": payload,
    }


def resolve_battery_qr(*, token: str) -> Battery:
    from core.helpers.crypto_qr import parse_battery_token

    parsed = parse_battery_token(token)
    serial = parsed["serial"]
    try:
        battery = Battery.objects.select_related("battery_type").get(
            serial__iexact=serial
        )
    except Battery.DoesNotExist as exc:
        raise DomainError("BATTERY_NOT_FOUND", "Battery not found.", http=404) from exc
    scheme = battery.battery_type.qr_scheme if battery.battery_type_id else "SIGNED"
    verify_battery_token(
        token=token,
        serial=battery.serial,
        secret=battery.qr_secret,
        scheme=scheme,
    )
    return battery


@transaction.atomic
def rotate_battery_qr(*, battery: Battery, actor=None) -> dict:
    locked = Battery.objects.select_for_update().get(pk=battery.pk)
    locked.qr_secret = secrets.token_urlsafe(24)
    locked.save(update_fields=["qr_secret", "updated_at"])
    record_battery_event(
        battery=locked,
        event=BatteryEvent.Event.TRIAGED,
        actor=actor,
        meta={"action": "qr_rotated"},
    )
    emit_event(
        action="battery.qr_rotated",
        subject_type="battery",
        subject_id=str(locked.id),
        subject_label=locked.serial,
        actor=actor,
    )
    return battery_label_payload(battery=locked)
