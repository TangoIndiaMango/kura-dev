from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Account, Driver, User
from accounts.services.auth import issue_tokens
from mobility.models import BatteryType, Plan, Subscription, Vehicle, VehicleModel
from mobility.services import PricingService


class SubscriptionAccountFilterTests(TestCase):
    def setUp(self):
        PricingService.ensure_defaults()
        self.client = APIClient()
        self.admin = User.objects.create(
            email="sub-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        tokens = issue_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        owner = User.objects.create(phone="+2348018880001", role=User.Role.DRIVER)
        self.account = Account.objects.create(owner_user=owner, display_name="Sub Rider")
        Driver.objects.create(user=owner, account=self.account)

        bt = BatteryType.objects.create(name="Sub BT", manufacturer="KURA")
        model = VehicleModel.objects.create(make="K", model="S", battery_type=bt)
        vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=model,
            registration_plate="SUB-001",
        )
        plan = Plan.objects.create(
            code="PLN-TEST-WEEK",
            name="Weekly Test",
            vehicle_type="MOTORCYCLE",
            period=Plan.Period.WEEK,
            duration_days=7,
            swap_allowance=14,
            price_kobo=650_000,
            status=Plan.Status.ACTIVE,
        )
        self.sub = Subscription.objects.create(
            account=self.account,
            vehicle=vehicle,
            plan=plan,
            starts_at=timezone.now(),
            ends_at=timezone.now() + timezone.timedelta(days=7),
            swaps_allowance=14,
        )

        other = User.objects.create(phone="+2348018880002", role=User.Role.DRIVER)
        other_account = Account.objects.create(owner_user=other, display_name="Other")
        other_vehicle = Vehicle.objects.create(
            account=other_account,
            vehicle_model=model,
            registration_plate="SUB-002",
        )
        Subscription.objects.create(
            account=other_account,
            vehicle=other_vehicle,
            plan=plan,
            starts_at=timezone.now(),
            ends_at=timezone.now() + timezone.timedelta(days=7),
        )

    def test_filter_subscriptions_by_account(self):
        res = self.client.get(
            "/api/v1/mobility/subscriptions/",
            {"account": str(self.account.id)},
        )
        self.assertEqual(res.status_code, 200)
        rows = res.json()["results"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["id"], str(self.sub.id))
        self.assertEqual(rows[0]["account_id"], str(self.account.id))
        self.assertEqual(rows[0]["plan_name"], "Weekly Test")
        self.assertEqual(rows[0]["vehicle_plate"], "SUB-001")
