"""Impact metrics, story, report job, and sample telemetry for Path B seed."""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from accounts.models import Account, User
from analytics.models import (
    DailyAccountMetric,
    DailyHubMetric,
    ImpactStory,
    MonthlyImpactMetric,
    ReportJob,
)
from analytics.services.reports import ReportJobService
from mobility.models import Hub, TelemetryEvent, Vehicle
from mobility.services.telemetry_iot import TelemetryIotService


def seed_path_b_impact_telemetry(
    *,
    account: Account,
    boat: Vehicle,
    yaba: Hub,
    ops: User,
) -> None:
    factors = {
        "naira_per_litre": 1100,
        "kwh_per_litre_equiv": 9.7,
        "g_co2_per_litre": 2310,
        "disclaimer": "Estimate from swap energy vs configured petrol price.",
    }
    today = timezone.localdate()
    for offset in range(7):
        day = today - timedelta(days=offset)
        DailyAccountMetric.objects.update_or_create(
            account=account,
            date=day,
            defaults={
                "swaps_completed": 2 + (offset % 3),
                "fuel_savings_kobo": 180_000 + offset * 12_000,
                "co2_kg_est": Decimal("4.250") + Decimal(offset) * Decimal("0.15"),
                "petrol_litres_avoided_est": Decimal("1.800")
                + Decimal(offset) * Decimal("0.05"),
                "inputs": factors,
            },
        )
        DailyHubMetric.objects.update_or_create(
            hub=yaba,
            date=day,
            defaults={
                "swaps": 18 + offset,
                "revenue_kobo_by_channel": {
                    "WALLET": 220_000 + offset * 15_000,
                    "CASH": 45_000 + offset * 2_000,
                },
                "batteries_ready_avg": Decimal("11.50")
                - Decimal(offset) * Decimal("0.2"),
                "no_shows": offset % 2,
                "overrides": 0 if offset % 3 else 1,
                "inputs": {"source": "seed_hub_day"},
            },
        )

    MonthlyImpactMetric.objects.update_or_create(
        period="2026-08",
        defaults={
            "operators_served": 128,
            "swaps": 4120,
            "fuel_savings_kobo": 185_000_000,
            "engines_replaced": 14,
            "co2_kg": Decimal("9200.000"),
            "inputs": {**factors, "source": "seed_rollup"},
        },
    )
    MonthlyImpactMetric.objects.update_or_create(
        period="2026-09",
        defaults={
            "operators_served": 141,
            "swaps": 980,
            "fuel_savings_kobo": 42_500_000,
            "engines_replaced": 3,
            "co2_kg": Decimal("2100.500"),
            "inputs": {**factors, "source": "seed_rollup"},
        },
    )
    ImpactStory.objects.get_or_create(
        title="Makoko ferry skippers cut petrol runs",
        defaults={
            "region": "Lagos — Makoko",
            "metric_highlight": "14 engines surrendered · ~9.2 t CO₂e (Aug)",
            "partners": "Lagos State Ministry of Transportation",
            "summary": (
                "Path B canoe conversions at Yaba yard let ferry operators keep "
                "hulls while Kura stores petrol outboards as returnable collateral."
            ),
            "status": ImpactStory.Status.PUBLISHED,
            "published_at": timezone.now() - timedelta(days=5),
            "created_by": ops,
            "raw": {"hero_public_id": "seed/impact/makoko_ferry.jpg"},
        },
    )
    seed_key = "seed-impact-pdf-2026-08"
    if not ReportJob.objects.filter(idempotency_key=seed_key).exists():
        job = ReportJobService.create(
            kind=ReportJob.Kind.IMPACT_PDF,
            params={"period": "2026-08"},
            actor=ops,
            idempotency_key=seed_key,
        )
        if job.status == ReportJob.Status.QUEUED:
            ReportJobService.process(job_id=str(job.id))

    if boat.hardware_id != "hw-makoko-mk07":
        boat.hardware_id = "hw-makoko-mk07"
        boat.save(update_fields=["hardware_id", "updated_at"])
    if not boat.iot_api_key_hash:
        TelemetryIotService.rotate_api_key(vehicle=boat, actor=ops)

    if not TelemetryEvent.objects.filter(
        vehicle=boat, ingest_batch="seed-makoko-day"
    ).exists():
        base = timezone.now() - timedelta(hours=6)
        for i, pct in enumerate((88, 76, 64, 51)):
            TelemetryEvent.objects.create(
                vehicle=boat,
                recorded_at=base + timedelta(hours=i),
                battery_pct=pct,
                lat=6.4955 + i * 0.0008,
                lng=3.3862 + i * 0.0005,
                speed_kmh=12.0 + i,
                odometer_km=420.0 + i * 3.5,
                source=TelemetryEvent.Source.MANUAL,
                ingest_batch="seed-makoko-day",
                raw={
                    "hub_note": "Manual SOC ping at waterside",
                    "agent_phone": "+2348098765432",
                },
            )
