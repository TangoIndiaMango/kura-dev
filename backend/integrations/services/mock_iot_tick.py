"""Deterministic mock IoT tick — SoC drain + location for ISSUED packs."""
from __future__ import annotations

import hashlib
import logging
import math
from typing import Any

from django.utils import timezone

from integrations.providers.mock_iot.transform import normalize_mock_iot_payload
from integrations.services.apply_telemetry import apply_normalized_telemetry
from mobility.models import Battery, Hub, TelemetryEvent, Vehicle

logger = logging.getLogger("kura.tasks")


def _stable_unit(key: str) -> float:
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def _drain_step(serial: str) -> int:
    """1–3 % per tick, stable per pack."""
    return 1 + int(_stable_unit(f"drain:{serial}") * 3)


def _next_location(*, vehicle: Vehicle, battery: Battery) -> tuple[float, float]:
    """
    Orbit near last telemetry point, else near nearest online hub.
    Deterministic angle from serial + minute bucket.
    """
    last = (
        TelemetryEvent.objects.filter(vehicle=vehicle, lat__isnull=False, lng__isnull=False)
        .order_by("-recorded_at")
        .first()
    )
    if last is not None and last.lat is not None and last.lng is not None:
        base_lat, base_lng = float(last.lat), float(last.lng)
    else:
        hub = (
            Hub.objects.filter(status=Hub.Status.ONLINE)
            .order_by("code")
            .first()
        )
        if hub is None:
            base_lat, base_lng = 6.5244, 3.3792
        else:
            # Offset from hub by pack fingerprint (~0.5–2 km).
            u = _stable_unit(f"hub:{battery.serial}")
            base_lat = float(hub.lat) + (u - 0.5) * 0.02
            base_lng = float(hub.lng) + (_stable_unit(f"hub2:{battery.serial}") - 0.5) * 0.02

    minute = timezone.now().strftime("%Y%m%d%H%M")
    angle = _stable_unit(f"ang:{battery.serial}:{minute}") * 2 * math.pi
    radius = 0.0015 + _stable_unit(f"rad:{battery.serial}") * 0.0025
    return base_lat + math.cos(angle) * radius, base_lng + math.sin(angle) * radius


def tick_mock_iot(*, step: int | None = None, limit: int = 200) -> dict[str, Any]:
    """
    Apply one mock OEM reading per mounted ISSUED pack.
    Safe to run from the task worker every loop.
    """
    vehicles = (
        Vehicle.objects.filter(
            status=Vehicle.Status.ACTIVE,
            current_battery__status=Battery.Status.ISSUED,
        )
        .select_related("current_battery", "current_battery__battery_type")
        .order_by("registration_plate")[:limit]
    )
    batch = f"mock-iot-tick:{timezone.now().strftime('%Y%m%d%H%M%S')}"
    updated = 0
    for vehicle in vehicles:
        bat = vehicle.current_battery
        if bat is None:
            continue
        drain = step if step is not None else _drain_step(bat.serial)
        next_soc = max(5, int(bat.charge_pct) - drain)
        lat, lng = _next_location(vehicle=vehicle, battery=bat)
        speed = round(8 + _stable_unit(f"spd:{bat.serial}") * 25, 1)
        payload = {
            "batchId": batch,
            "readings": [
                {
                    "vehicle_id": str(vehicle.id),
                    "battery_serial": bat.serial,
                    "soc": next_soc,
                    "gps": {"lat": round(lat, 6), "lng": round(lng, 6)},
                    "speed": speed,
                    "ts": timezone.now().isoformat(),
                }
            ],
        }
        for evt in normalize_mock_iot_payload(payload):
            apply_normalized_telemetry(evt)
        updated += 1
    logger.info("mock_iot_tick updated=%s batch=%s", updated, batch)
    return {"updated": updated, "batch": batch}
