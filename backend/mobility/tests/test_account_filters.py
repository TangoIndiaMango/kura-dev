from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, Driver, User
from accounts.services.auth import issue_tokens
from mobility.models import BatteryType, Vehicle, VehicleModel


class MobilityAccountFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create(
            email="mobility-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        tokens = issue_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        self.owner_a = User.objects.create(phone="+2348015550001", role=User.Role.DRIVER)
        self.account_a = Account.objects.create(
            owner_user=self.owner_a, display_name="Fleet A"
        )
        Driver.objects.create(user=self.owner_a, account=self.account_a)

        self.owner_b = User.objects.create(phone="+2348015550002", role=User.Role.DRIVER)
        self.account_b = Account.objects.create(
            owner_user=self.owner_b, display_name="Fleet B"
        )
        Driver.objects.create(user=self.owner_b, account=self.account_b)

        bt = BatteryType.objects.create(name="Filter BT", manufacturer="KURA")
        model = VehicleModel.objects.create(make="K", model="F", battery_type=bt)
        self.vehicle_a = Vehicle.objects.create(
            account=self.account_a,
            vehicle_model=model,
            registration_plate="FLT-A-01",
        )
        self.vehicle_b = Vehicle.objects.create(
            account=self.account_b,
            vehicle_model=model,
            registration_plate="FLT-B-01",
        )

    def test_vehicles_filter_by_account(self):
        res = self.client.get(
            "/api/v1/mobility/vehicles/",
            {"account": str(self.account_a.id)},
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        plates = {row["registration_plate"] for row in body["results"]}
        self.assertIn("FLT-A-01", plates)
        self.assertNotIn("FLT-B-01", plates)

    def test_swaps_filter_by_account_empty(self):
        res = self.client.get(
            "/api/v1/mobility/swaps/",
            {"account": str(self.account_a.id)},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["results"], [])
