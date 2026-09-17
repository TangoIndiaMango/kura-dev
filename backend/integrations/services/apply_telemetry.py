"""Apply NormalizedTelemetryEvent into mobility (battery SoC + TelemetryEvent)."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.services.events import emit_event
from integrations.ports.telemetry import (
    NormalizedTelemetryEvent,
    TelemetryEventKind,
    TelemetryProvider,
)
from mobility.models import Battery, TelemetryEvent, Vehicle


def _charge_source(provider: TelemetryProvider) -> str:
    if provider == TelemetryProvider.MANUAL:
        return Battery.ChargeSource.MANUAL
    if provider in {TelemetryProvider.BMS, TelemetryProvider.OCPP_BSS}:
        return Battery.ChargeSource.BMS
    return Battery.ChargeSource.TELEMETRY


def _telemetry_source(provider: TelemetryProvider) -> str:
    if provider == TelemetryProvider.MANUAL:
        return TelemetryEvent.Source.MANUAL
    return TelemetryEvent.Source.IOT


def apply_charge_observation(
    *,
    battery: Battery,
    charge_pct: int,
    source: str,
    observed_at=None,
) -> Battery:
    """Bay / LED / direct SoC write — no TelemetryEvent required."""
    _maybe_update_battery_soc(
        battery=battery,
        soc_pct=int(charge_pct),
        source=source,
        observed_at=observed_at or timezone.now(),
    )
    battery.refresh_from_db()
    return battery


@transaction.atomic
def apply_normalized_telemetry(
    event: NormalizedTelemetryEvent,
    *,
    actor=None,
) -> TelemetryEvent:
    vehicle = _resolve_vehicle(event)
    battery = _resolve_battery(event, vehicle)
    recorded_at = event.observed_at or timezone.now()

    evt = TelemetryEvent.objects.create(
        vehicle=vehicle,
        recorded_at=recorded_at,
        battery_pct=event.soc_pct,
        lat=event.lat,
        lng=event.lng,
        speed_kmh=event.speed_kmh,
        odometer_km=event.odometer_km,
        source=_telemetry_source(event.provider),
        battery=battery,
        ingest_batch=event.ingest_batch or "",
        raw={
            **dict(event.raw or {}),
            "provider": event.provider.value,
            "event_kind": event.event_kind.value,
            "range_km": event.range_km,
            "soh_pct": event.soh_pct,
        },
    )

    if battery is not None and event.soc_pct is not None:
        _maybe_update_battery_soc(
            battery=battery,
            soc_pct=int(event.soc_pct),
            source=_charge_source(event.provider),
            observed_at=recorded_at,
        )

    emit_event(
        action="telemetry.ingested",
        subject_type="telemetry_event",
        subject_id=str(evt.id),
        subject_label=vehicle.registration_plate,
        actor=actor,
        after={
            "vehicle_id": str(vehicle.id),
            "provider": event.provider.value,
            "battery_pct": evt.battery_pct,
            "battery_id": str(battery.id) if battery else None,
            "event_kind": event.event_kind.value,
        },
    )
    return evt


def _resolve_vehicle(event: NormalizedTelemetryEvent) -> Vehicle:
    if event.vehicle_id is not None:
        vehicle = Vehicle.objects.filter(pk=event.vehicle_id).first()
        if vehicle is None:
            raise DomainError("VALIDATION", "Unknown vehicle.", http=400)
        return vehicle
    if event.battery_serial:
        bat = Battery.objects.filter(serial=event.battery_serial.strip()).first()
        if bat is not None:
            vehicle = Vehicle.objects.filter(current_battery_id=bat.id).first()
            if vehicle is not None:
                return vehicle
    raise DomainError(
        "VALIDATION",
        "vehicle_id or mounted battery_serial required.",
        http=400,
    )


def _resolve_battery(
    event: NormalizedTelemetryEvent, vehicle: Vehicle
) -> Battery | None:
    if event.battery_id is not None:
        return Battery.objects.filter(pk=event.battery_id).first()
    if event.battery_serial:
        return Battery.objects.filter(serial=event.battery_serial.strip()).first()
    return vehicle.current_battery


def _maybe_update_battery_soc(
    *,
    battery: Battery,
    soc_pct: int,
    source: str,
    observed_at,
) -> None:
    pct = max(0, min(100, int(soc_pct)))
    prior = getattr(battery, "charge_observed_at", None)
    if prior is not None and observed_at < prior:
        return
    battery.charge_pct = pct
    battery.charge_source = source
    battery.charge_observed_at = observed_at
    battery.save(
        update_fields=[
            "charge_pct",
            "charge_source",
            "charge_observed_at",
            "updated_at",
        ]
    )


# Re-export kind for callers
__all__ = [
    "apply_normalized_telemetry",
    "apply_charge_observation",
    "TelemetryEventKind",
]
