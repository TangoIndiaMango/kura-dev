"""Provider-agnostic telemetry contracts — mobility only applies these shapes."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID


class TelemetryProvider(StrEnum):
    MANUAL = "MANUAL"
    MOCK_IOT = "MOCK_IOT"
    IOT = "IOT"
    BMS = "BMS"
    OCPP_BSS = "OCPP_BSS"


class TelemetryEventKind(StrEnum):
    SOC_UPDATE = "SOC_UPDATE"
    LOCATION = "LOCATION"
    HEALTH = "HEALTH"
    FAULT = "FAULT"
    HEARTBEAT = "HEARTBEAT"


@dataclass(frozen=True, slots=True)
class NormalizedTelemetryEvent:
    provider: TelemetryProvider
    event_kind: TelemetryEventKind
    observed_at: datetime
    vehicle_id: UUID | None = None
    battery_id: UUID | None = None
    battery_serial: str | None = None
    soc_pct: int | None = None
    soh_pct: int | None = None
    range_km: float | None = None
    lat: float | None = None
    lng: float | None = None
    speed_kmh: float | None = None
    odometer_km: float | None = None
    ingest_batch: str = ""
    raw: dict[str, Any] = field(default_factory=dict)
