"""IoT device-key telemetry ingest (PRD Ph2 HTTP surface; MQTT stays partner-side)."""
from __future__ import annotations

import hashlib
import secrets
from typing import Any

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import TelemetryEvent, Vehicle
from mobility.services.telemetry import TelemetryService


def hash_iot_api_key(raw: str) -> str:
    return hashlib.sha256(raw.strip().encode("utf-8")).hexdigest()


class TelemetryIotService:
    @staticmethod
    @transaction.atomic
    def rotate_api_key(*, vehicle: Vehicle, actor=None) -> str:
        plain = secrets.token_urlsafe(32)
        vehicle.iot_api_key_hash = hash_iot_api_key(plain)
        vehicle.save(update_fields=["iot_api_key_hash", "updated_at"])
        emit_event(
            action="telemetry.iot_key_rotated",
            subject_type="vehicle",
            subject_id=str(vehicle.id),
            subject_label=vehicle.registration_plate,
            actor=actor,
            after={"hardware_id": vehicle.hardware_id or ""},
        )
        return plain

    @staticmethod
    def resolve_vehicle(*, device_key: str, hardware_id: str = "") -> Vehicle:
        key = (device_key or "").strip()
        if not key:
            raise DomainError("UNAUTHORIZED", "Device key required.", http=401)
        digest = hash_iot_api_key(key)
        qs = Vehicle.objects.filter(iot_api_key_hash=digest)
        hid = (hardware_id or "").strip()
        if hid:
            qs = qs.filter(hardware_id=hid)
        vehicle = qs.first()
        if vehicle is None:
            raise DomainError("UNAUTHORIZED", "Invalid device credentials.", http=401)
        return vehicle

    @classmethod
    @transaction.atomic
    def ingest_batch(
        cls,
        *,
        device_key: str,
        payload: dict[str, Any],
    ) -> list[TelemetryEvent]:
        hardware_id = str(payload.get("hardware_id") or "").strip()
        vehicle = cls.resolve_vehicle(device_key=device_key, hardware_id=hardware_id)
        events_raw = payload.get("events")
        if events_raw is None:
            events_raw = [payload]
        if not isinstance(events_raw, list) or not events_raw:
            raise DomainError("VALIDATION", "events must be a non-empty list.", http=400)
        if len(events_raw) > 100:
            raise DomainError("VALIDATION", "Max 100 events per batch.", http=400)

        batch = str(payload.get("ingest_batch") or "").strip() or f"iot:{timezone.now().timestamp()}"
        created: list[TelemetryEvent] = []
        for item in events_raw:
            if not isinstance(item, dict):
                raise DomainError("VALIDATION", "Each event must be an object.", http=400)
            recorded = item.get("recorded_at")
            if isinstance(recorded, str):
                recorded = parse_datetime(recorded) or timezone.now()
            data = {
                "vehicle_id": vehicle.id,
                "recorded_at": recorded or timezone.now(),
                "battery_pct": item.get("battery_pct"),
                "lat": item.get("lat"),
                "lng": item.get("lng"),
                "speed_kmh": item.get("speed_kmh"),
                "odometer_km": item.get("odometer_km"),
                "source": TelemetryEvent.Source.IOT,
                "battery_id": item.get("battery_id"),
                "ingest_batch": batch,
                "raw": {
                    **dict(item.get("raw") or {}),
                    "hardware_id": vehicle.hardware_id or hardware_id,
                },
            }
            created.append(TelemetryService.ingest(data=data, actor=None))
        return created
