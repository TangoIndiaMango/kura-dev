"""Normalized telemetry apply + mock IoT transform."""
from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from accounts.models import Account
from accounts.services.roles import RoleService
from integrations.providers.mock_iot.transform import normalize_mock_iot_payload
from integrations.services.apply_telemetry import apply_normalized_telemetry
from mobility.models import Battery, BatteryType, TelemetryEvent, Vehicle, VehicleModel

User = get_user_model()


class ApplyTelemetryTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        owner = User.objects.create_user(
            phone="+2348033900001", password="x", role="DRIVER"
        )
        self.account = Account.objects.create(
            owner_user=owner, display_name="Tel Rider", kura_id="KR-TEL1"
        )
        self.btype = BatteryType.objects.create(name="Tel Pack", manufacturer="KURA")
        model = VehicleModel.objects.create(
            make="Silversun",
            model="Tel Bike",
            battery_type=self.btype,
            vehicle_type="MOTORCYCLE",
        )
        self.pack = Battery.objects.create(
            serial="BAT-TEL-01",
            battery_type=self.btype,
            status=Battery.Status.ISSUED,
            charge_pct=90,
            charge_source=Battery.ChargeSource.MANUAL,
        )
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=model,
            registration_plate="TEL-001-XY",
            current_battery=self.pack,
            status=Vehicle.Status.ACTIVE,
        )

    def test_mock_iot_updates_mounted_soc(self):
        events = normalize_mock_iot_payload(
            {
                "batchId": "t1",
                "readings": [
                    {
                        "vehicle_id": str(self.vehicle.id),
                        "battery_serial": "BAT-TEL-01",
                        "soc": 71,
                        "ts": timezone.now().isoformat(),
                    }
                ],
            }
        )
        self.assertEqual(len(events), 1)
        apply_normalized_telemetry(events[0])
        self.pack.refresh_from_db()
        self.assertEqual(self.pack.charge_pct, 71)
        self.assertEqual(self.pack.charge_source, Battery.ChargeSource.TELEMETRY)
        self.assertIsNotNone(self.pack.charge_observed_at)
        self.assertEqual(
            TelemetryEvent.objects.filter(vehicle=self.vehicle).count(), 1
        )

    def test_stale_reading_ignored(self):
        now = timezone.now()
        self.pack.charge_observed_at = now
        self.pack.charge_pct = 80
        self.pack.save()
        events = normalize_mock_iot_payload(
            {
                "readings": [
                    {
                        "vehicle_id": str(self.vehicle.id),
                        "soc": 50,
                        "ts": (now - timedelta(minutes=5)).isoformat(),
                    }
                ]
            }
        )
        apply_normalized_telemetry(events[0])
        self.pack.refresh_from_db()
        self.assertEqual(self.pack.charge_pct, 80)
