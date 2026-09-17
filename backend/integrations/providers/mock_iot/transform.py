"""Mock OEM/IoT vendor payload → NormalizedTelemetryEvent (ugly JSON in, clean out)."""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from integrations.ports.telemetry import (
    NormalizedTelemetryEvent,
    TelemetryEventKind,
    TelemetryProvider,
)


def _parse_when(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        parsed = parse_datetime(value)
        if parsed is not None:
            return parsed
    return timezone.now()


def normalize_mock_iot_payload(payload: dict[str, Any]) -> list[NormalizedTelemetryEvent]:
    """
    Accepts vendor-shaped bodies, e.g.:
      {"deviceId": "...", "soc": 72, "gps": {"lat": 6.5, "lng": 3.3}, "ts": "..."}
    or batch {"readings": [ ... ]}.
    """
    rows = payload.get("readings")
    if rows is None:
        rows = [payload]
    if not isinstance(rows, list) or not rows:
        return []

    out: list[NormalizedTelemetryEvent] = []
    batch = str(payload.get("batchId") or payload.get("ingest_batch") or "").strip()
    for row in rows:
        if not isinstance(row, dict):
            continue
        gps = row.get("gps") if isinstance(row.get("gps"), dict) else {}
        soc = row.get("soc", row.get("battery_pct", row.get("SoC")))
        soh = row.get("soh", row.get("SoH"))
        vehicle_raw = row.get("vehicle_id") or payload.get("vehicle_id")
        battery_raw = row.get("battery_id") or row.get("packId")
        serial = row.get("battery_serial") or row.get("packSerial")
        kind = TelemetryEventKind.SOC_UPDATE
        if soc is None and (gps.get("lat") is not None or row.get("lat") is not None):
            kind = TelemetryEventKind.LOCATION
        if row.get("fault") or row.get("alarm"):
            kind = TelemetryEventKind.FAULT

        out.append(
            NormalizedTelemetryEvent(
                provider=TelemetryProvider.MOCK_IOT,
                event_kind=kind,
                observed_at=_parse_when(row.get("ts") or row.get("recorded_at")),
                vehicle_id=UUID(str(vehicle_raw)) if vehicle_raw else None,
                battery_id=UUID(str(battery_raw)) if battery_raw else None,
                battery_serial=str(serial).strip() if serial else None,
                soc_pct=int(soc) if soc is not None else None,
                soh_pct=int(soh) if soh is not None else None,
                range_km=(
                    float(row["range_km"])
                    if row.get("range_km") is not None
                    else None
                ),
                lat=_float_or_none(gps.get("lat", row.get("lat"))),
                lng=_float_or_none(gps.get("lng", row.get("lng"))),
                speed_kmh=_float_or_none(row.get("speed_kmh") or row.get("speed")),
                odometer_km=_float_or_none(row.get("odometer_km") or row.get("odo")),
                ingest_batch=batch,
                raw={"provider": "MOCK_IOT", "vendor": row},
            )
        )
    return out


def _float_or_none(value: Any) -> float | None:
    if value is None or value == "":
        return None
    return float(value)
