"""Impact stats + stories + telemetry fleet API."""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Account, Driver
from accounts.services.roles import RoleService
from analytics.models import ImpactStory, MonthlyImpactMetric
from audit.models import AuditEvent
from mobility.models import (
    BatteryType,
    Hub,
    Swap,
    TelemetryEvent,
    Vehicle,
    VehicleModel,
)

User = get_user_model()


class ImpactTelemetryApiTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        self.ops = User.objects.create_user(
            phone="+2348033600001",
            password="x",
            role="OPS_MANAGER",
            is_staff=True,
        )
        self.driver = User.objects.create_user(
            phone="+2348033600002",
            password="x",
            role="DRIVER",
        )
        self.account = Account.objects.create(
            owner_user=self.driver,
            display_name="Impact Rider",
            kura_id="KR-IMPAPI",
        )
        MonthlyImpactMetric.objects.create(
            period="2026-09",
            operators_served=40,
            swaps=900,
            fuel_savings_kobo=12_400_000_00,
            engines_replaced=3,
            co2_kg=Decimal("17200.000"),
            inputs={"disclaimer": "estimate"},
        )
        btype = BatteryType.objects.create(name="T Pack", manufacturer="KURA")
        model = VehicleModel.objects.create(
            make="Silversun", model="T1", battery_type=btype
        )
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=model,
            registration_plate="TEL-001-XY",
        )
        hub = Hub.objects.create(code="HUB-IMP", name="Impact Hub", address="Lagos")
        driver = Driver.objects.create(user=self.driver, account=self.account)
        for i in range(4):
            Swap.objects.create(
                account=self.account,
                vehicle=self.vehicle,
                driver=driver,
                hub=hub,
                status=Swap.Status.COMPLETED,
                payment_mode="WALLET",
                started_at=timezone.now() - timedelta(days=1),
                completed_at=timezone.now() - timedelta(days=1),
                client_event_id=f"impact-{i}",
            )
        TelemetryEvent.objects.create(
            vehicle=self.vehicle,
            recorded_at=timezone.now() - timedelta(hours=1),
            battery_pct=70,
            speed_kmh=18.0,
            source=TelemetryEvent.Source.MANUAL,
            ingest_batch="test",
        )
        self.client = APIClient()

    def test_impact_stats_and_story_audit(self):
        self.client.force_authenticate(user=self.ops)
        stats = self.client.get("/api/v1/analytics/impact/?period=2026-09")
        self.assertEqual(stats.status_code, 200, stats.content)
        body = stats.json()
        self.assertEqual(body["period"], "2026-09")
        self.assertEqual(body["swaps"], 900)
        self.assertIn("disclaimer", body)
        self.assertFalse(any("phone" in str(body).lower() for _ in [0]))

        create = self.client.post(
            "/api/v1/analytics/stories/",
            {
                "title": "Lagos delta brief",
                "region": "Lagos",
                "metric_highlight": "3 engines",
                "partners": "MoT",
                "summary": "Path B outcomes",
            },
            format="json",
        )
        self.assertEqual(create.status_code, 201, create.content)
        sid = create.json()["id"]
        self.assertTrue(
            AuditEvent.objects.filter(
                action="impact_story.created", subject_id=sid
            ).exists()
        )
        pub = self.client.post(f"/api/v1/analytics/stories/{sid}/publish/", {}, format="json")
        self.assertEqual(pub.status_code, 200, pub.content)
        self.assertEqual(pub.json()["status"], "PUBLISHED")

    def test_me_impact_and_fleet(self):
        self.client.force_authenticate(user=self.driver)
        me = self.client.get("/api/v1/accounts/me/impact/")
        self.assertEqual(me.status_code, 200, me.content)
        self.assertEqual(me.json()["swaps_completed"], 4)
        # 4 swaps × 1.2 L × ₦850/L (default factors)
        self.assertEqual(me.json()["saved_vs_petrol_kobo"], 4 * 1_020 * 100)
        self.assertIn("disclaimer", me.json())

        self.client.force_authenticate(user=self.ops)
        fleet = self.client.get("/api/v1/mobility/telemetry/fleet/")
        self.assertEqual(fleet.status_code, 200, fleet.content)
        data = fleet.json()
        self.assertGreaterEqual(data["totals"]["vehicles"], 1)
        plates = [r["registration_plate"] for r in data["results"]]
        self.assertIn("TEL-001-XY", plates)

    def test_cap_gate_impact(self):
        self.client.force_authenticate(user=self.driver)
        res = self.client.get("/api/v1/analytics/impact/")
        self.assertEqual(res.status_code, 403)
