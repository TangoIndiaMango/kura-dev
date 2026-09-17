"""Device-key IoT telemetry ingest (POST /api/v1/telemetry/ingest)."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account
from accounts.services.roles import RoleService
from mobility.models import BatteryType, TelemetryEvent, Vehicle, VehicleModel
from mobility.services.telemetry_iot import TelemetryIotService

User = get_user_model()


class TelemetryDeviceIngestTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        owner = User.objects.create_user(
            phone="+2348033800001", password="x", role="DRIVER"
        )
        self.ops = User.objects.create_user(
            phone="+2348033800002",
            password="x",
            role="OPS_MANAGER",
            is_staff=True,
        )
        account = Account.objects.create(
            owner_user=owner,
            display_name="IoT Boat",
            kura_id="KR-IOT1",
        )
        btype = BatteryType.objects.create(name="IoT Pack", manufacturer="KURA")
        model = VehicleModel.objects.create(
            make="Silversun", model="IoT Canoe", battery_type=btype, vehicle_type="BOAT"
        )
        self.vehicle = Vehicle.objects.create(
            account=account,
            vehicle_model=model,
            registration_plate="IOT-HULL-01",
            hardware_id="hw-iot-demo-01",
            status=Vehicle.Status.ACTIVE,
        )
        self.api_key = TelemetryIotService.rotate_api_key(
            vehicle=self.vehicle, actor=self.ops
        )
        self.client = APIClient()

    def test_device_ingest_batch(self):
        res = self.client.post(
            "/api/v1/telemetry/ingest/",
            {
                "hardware_id": "hw-iot-demo-01",
                "ingest_batch": "batch-1",
                "events": [
                    {"battery_pct": 77, "speed_kmh": 12.5, "lat": 6.5, "lng": 3.3},
                    {"battery_pct": 70, "speed_kmh": 0},
                ],
            },
            format="json",
            HTTP_X_KURA_DEVICE_KEY=self.api_key,
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(len(res.json()), 2)
        self.assertEqual(
            TelemetryEvent.objects.filter(
                vehicle=self.vehicle, source=TelemetryEvent.Source.IOT
            ).count(),
            2,
        )

    def test_bad_key_rejected(self):
        res = self.client.post(
            "/api/v1/telemetry/ingest/",
            {"battery_pct": 50},
            format="json",
            HTTP_X_KURA_DEVICE_KEY="not-a-real-key",
        )
        self.assertEqual(res.status_code, 401)

    def test_rotate_iot_key_cap(self):
        self.client.force_authenticate(user=self.ops)
        res = self.client.post(
            f"/api/v1/mobility/vehicles/{self.vehicle.id}/rotate-iot-key/"
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(res.json().get("api_key"))
