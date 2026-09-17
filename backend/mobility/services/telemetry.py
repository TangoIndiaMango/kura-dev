"""Fleet telemetry read + ingest via normalized apply spine."""
from __future__ import annotations

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from integrations.ports.telemetry import (
    NormalizedTelemetryEvent,
    TelemetryEventKind,
    TelemetryProvider,
)
from integrations.services.apply_telemetry import apply_normalized_telemetry
from mobility.models import TelemetryEvent, Vehicle


def classify_telemetry(
    *,
    recorded_at,
    speed_kmh: float | None,
    now=None,
) -> str:
    now = now or timezone.now()
    if recorded_at is None:
        return "OFFLINE"
    age = now - recorded_at
    if age > timedelta(hours=48):
        return "OFFLINE"
    if speed_kmh is not None and speed_kmh <= 1.0 and age > timedelta(hours=24):
        return "STATIONARY"
    if age <= timedelta(hours=24):
        return "LIVE"
    return "STATIONARY"


def fleet_telemetry_rows(*, search: str = "") -> list[dict]:
    """One row per active vehicle with latest event summary."""
    from django.db.models import Q

    qs = (
        Vehicle.objects.select_related("account", "vehicle_model")
        .filter(status=Vehicle.Status.ACTIVE)
        .order_by("registration_plate")
    )
    if search:
        qs = qs.filter(
            Q(registration_plate__icontains=search)
            | Q(account__display_name__icontains=search)
        )
    vehicle_ids = list(qs.values_list("id", flat=True))
    by_vehicle: dict = {}
    for e in TelemetryEvent.objects.filter(vehicle_id__in=vehicle_ids).order_by(
        "vehicle_id", "-recorded_at"
    ):
        if e.vehicle_id not in by_vehicle:
            by_vehicle[e.vehicle_id] = e

    now = timezone.now()
    rows: list[dict] = []
    for v in qs:
        evt = by_vehicle.get(v.id)
        status = classify_telemetry(
            recorded_at=evt.recorded_at if evt else None,
            speed_kmh=evt.speed_kmh if evt else None,
            now=now,
        )
        rows.append(
            {
                "vehicle_id": str(v.id),
                "registration_plate": v.registration_plate,
                "vehicle_type": v.vehicle_model.vehicle_type,
                "make": v.vehicle_model.make,
                "model": v.vehicle_model.model,
                "account_id": str(v.account_id),
                "owner_name": v.account.display_name,
                "vehicle_status": v.status,
                "telemetry_status": status,
                "last_recorded_at": evt.recorded_at.isoformat() if evt else None,
                "battery_pct": evt.battery_pct if evt else None,
                "speed_kmh": evt.speed_kmh if evt else None,
                "source": evt.source if evt else None,
            }
        )
    return rows


class TelemetryService:
    @staticmethod
    @transaction.atomic
    def ingest(*, data: dict, actor=None) -> TelemetryEvent:
        try:
            vehicle = Vehicle.objects.get(pk=data["vehicle_id"])
        except Vehicle.DoesNotExist as exc:
            raise DomainError("VALIDATION", "Unknown vehicle.", http=400) from exc

        source = data.get("source") or TelemetryEvent.Source.MANUAL
        provider = (
            TelemetryProvider.MANUAL
            if source == TelemetryEvent.Source.MANUAL
            else TelemetryProvider.IOT
        )
        recorded_at = data.get("recorded_at") or timezone.now()
        return apply_normalized_telemetry(
            NormalizedTelemetryEvent(
                provider=provider,
                event_kind=TelemetryEventKind.SOC_UPDATE
                if data.get("battery_pct") is not None
                else TelemetryEventKind.HEARTBEAT,
                observed_at=recorded_at,
                vehicle_id=vehicle.id,
                battery_id=data.get("battery_id"),
                soc_pct=data.get("battery_pct"),
                lat=data.get("lat"),
                lng=data.get("lng"),
                speed_kmh=data.get("speed_kmh"),
                odometer_km=data.get("odometer_km"),
                ingest_batch=(data.get("ingest_batch") or "").strip(),
                raw=dict(data.get("raw") or {}),
            ),
            actor=actor,
        )
