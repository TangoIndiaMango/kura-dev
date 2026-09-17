"""Vehicle model catalogue API tests."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.services.roles import RoleService
from audit.models import AuditEvent
from mobility.models import BatteryType, VehicleModel, VehicleType

User = get_user_model()


class VehicleModelApiTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        self.client = APIClient()
        self.ops = User.objects.create_user(
            phone="+2348033500101",
            password="x",
            role="OPS_MANAGER",
            first_name="Ops",
            last_name="Mgr",
            is_staff=True,
        )
        self.viewer = User.objects.create_user(
            phone="+2348033500102",
            password="x",
            role="GOVERNMENT_VIEWER",
            first_name="Gov",
            last_name="Viewer",
            is_staff=True,
        )
        self.bt = BatteryType.objects.create(
            name="Asobo Marine 72V",
            manufacturer="Asobo",
            capacity_kwh="5.00",
            nominal_voltage=72,
            vehicle_type=VehicleType.BOAT,
            status=BatteryType.Status.ACTIVE,
        )

    def test_list_paginated_and_stats(self):
        VehicleModel.objects.create(
            make="Asobo",
            model="E-Boarder 15",
            vehicle_type=VehicleType.BOAT,
            battery_type=self.bt,
        )
        self.client.force_authenticate(user=self.ops)
        listed = self.client.get("/api/v1/mobility/vehicle-models/?page_size=10")
        self.assertEqual(listed.status_code, 200, listed.content)
        body = listed.json()
        self.assertIn("results", body)
        self.assertIn("count", body)
        self.assertGreaterEqual(body["count"], 1)

        stats = self.client.get("/api/v1/mobility/vehicle-models/stats/")
        self.assertEqual(stats.status_code, 200, stats.content)
        totals = stats.json()["totals"]
        self.assertGreaterEqual(totals["all"], 1)
        self.assertGreaterEqual(totals["boat"], 1)

    def test_create_requires_manage_and_audits(self):
        self.client.force_authenticate(user=self.viewer)
        denied = self.client.post(
            "/api/v1/mobility/vehicle-models/",
            {
                "make": "Spiro",
                "model": "E-Moto",
                "vehicle_type": "MOTORCYCLE",
                "battery_type": str(self.bt.id),
            },
            format="json",
        )
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(user=self.ops)
        created = self.client.post(
            "/api/v1/mobility/vehicle-models/",
            {
                "make": "Spiro",
                "model": "E-Moto",
                "vehicle_type": "MOTORCYCLE",
                "battery_type": str(self.bt.id),
                "service_interval_km": 5000,
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.content)
        self.assertEqual(created.json()["make"], "Spiro")
        self.assertTrue(
            AuditEvent.objects.filter(action="vehicle_model.created").exists()
        )

        dup = self.client.post(
            "/api/v1/mobility/vehicle-models/",
            {
                "make": "Spiro",
                "model": "E-Moto",
                "vehicle_type": "MOTORCYCLE",
                "battery_type": str(self.bt.id),
            },
            format="json",
        )
        self.assertEqual(dup.status_code, 400, dup.content)
