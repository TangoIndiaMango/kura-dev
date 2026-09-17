"""Hub discover — type filter + haversine distance."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account
from accounts.services.roles import RoleService
from mobility.models import (
    Battery,
    BatteryType,
    Hub,
    HubSlot,
    Vehicle,
    VehicleModel,
)

User = get_user_model()


class HubDiscoverTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        owner = User.objects.create_user(
            phone="+2348033900011", password="x", role="DRIVER"
        )
        self.user = owner
        account = Account.objects.create(
            owner_user=owner, display_name="Disc Rider", kura_id="KR-DISC1"
        )
        self.btype = BatteryType.objects.create(name="Disc Pack", manufacturer="KURA")
        other = BatteryType.objects.create(name="Other Pack", manufacturer="KURA")
        model = VehicleModel.objects.create(
            make="Silversun",
            model="Disc Bike",
            battery_type=self.btype,
            vehicle_type="MOTORCYCLE",
        )
        self.vehicle = Vehicle.objects.create(
            account=account,
            vehicle_model=model,
            registration_plate="DISC-01",
            status=Vehicle.Status.ACTIVE,
        )
        self.near = Hub.objects.create(
            code="HUB-NEAR",
            name="Near Hub",
            address="Near",
            lat=6.52,
            lng=3.38,
            status=Hub.Status.ONLINE,
        )
        self.far = Hub.objects.create(
            code="HUB-FAR",
            name="Far Hub",
            address="Far",
            lat=7.5,
            lng=4.5,
            status=Hub.Status.ONLINE,
        )
        ready = Battery.objects.create(
            serial="BAT-DISC-R1",
            battery_type=self.btype,
            status=Battery.Status.AVAILABLE,
            current_hub=self.near,
        )
        HubSlot.objects.create(
            hub=self.near, slot_no=1, state=HubSlot.State.READY, battery=ready
        )
        wrong = Battery.objects.create(
            serial="BAT-DISC-W1",
            battery_type=other,
            status=Battery.Status.AVAILABLE,
            current_hub=self.far,
        )
        HubSlot.objects.create(
            hub=self.far, slot_no=1, state=HubSlot.State.READY, battery=wrong
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_discover_filters_type_and_sorts_distance(self):
        res = self.client.get(
            "/api/v1/mobility/hubs/discover/",
            {
                "vehicle": str(self.vehicle.id),
                "lat": "6.52",
                "lng": "3.38",
                "open_now": "true",
            },
        )
        self.assertEqual(res.status_code, 200, res.content)
        rows = res.json()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["code"], "HUB-NEAR")
        self.assertIsNotNone(rows[0].get("distance_km"))
        self.assertLess(rows[0]["distance_km"], 5)
