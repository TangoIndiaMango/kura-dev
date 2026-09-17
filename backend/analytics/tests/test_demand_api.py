from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Account, Driver, StaffMembership, User
from mobility.models import (
    BatteryType,
    Hub,
    Swap,
    Vehicle,
    VehicleModel,
)


class DemandForecastApiTests(TestCase):
    def setUp(self):
        self.agent = User.objects.create(
            email="demand.agent@test.eco",
            role=User.Role.HUB_AGENT,
            is_staff=True,
        )
        self.hub = Hub.objects.create(
            code="HUB-DEM-1",
            name="Demand Hub",
            address="Lagos",
        )
        Hub.objects.create(
            code="HUB-DEM-2",
            name="Other Hub",
            address="Lagos",
        )
        StaffMembership.objects.create(
            user=self.agent,
            role=User.Role.HUB_AGENT,
            hub_id=str(self.hub.id),
        )
        owner = User.objects.create(
            phone="+2348017171717",
            role=User.Role.DRIVER,
        )
        account = Account.objects.create(
            owner_user=owner,
            display_name="Demand Rider",
        )
        driver = Driver.objects.create(user=owner, account=account)
        battery_type = BatteryType.objects.create(
            name="Demand Pack",
            manufacturer="KURA",
        )
        model = VehicleModel.objects.create(
            make="Kura",
            model="Demand",
            battery_type=battery_type,
        )
        vehicle = Vehicle.objects.create(
            account=account,
            vehicle_model=model,
            registration_plate="DEM-100-X",
        )
        Swap.objects.create(
            account=account,
            driver=driver,
            vehicle=vehicle,
            hub=self.hub,
            agent=self.agent,
            status=Swap.Status.COMPLETED,
            completed_at=timezone.now(),
        )
        self.client = APIClient()
        self.client.force_authenticate(self.agent)

    def test_forecast_is_hub_scoped_and_historical(self):
        response = self.client.get(
            "/api/v1/analytics/demand/hubs/",
            {"lookback_days": 7},
        )
        self.assertEqual(response.status_code, 200, response.content)
        rows = response.json()["results"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["hub_code"], "HUB-DEM-1")
        self.assertEqual(rows[0]["historical_swaps"], 1)
        self.assertEqual(rows[0]["expected_swaps_next_24h"], 1)
        self.assertEqual(rows[0]["confidence"], "LOW")
