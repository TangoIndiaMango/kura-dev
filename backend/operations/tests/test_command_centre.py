"""Command-centre is ops-only — hub agents must not see network KPIs."""
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import StaffMembership, User
from accounts.services.auth import issue_tokens
from accounts.services.roles import RoleService
from mobility.models import Hub


class CommandCentreAccessTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        self.hub = Hub.objects.create(
            code="HUB-CC-01",
            name="CC Hub",
            address="Lagos",
            lat=6.5,
            lng=3.3,
            slot_count=4,
            status=Hub.Status.ONLINE,
        )

    def _client_for(self, user: User) -> APIClient:
        client = APIClient()
        tokens = issue_tokens(user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        return client

    def test_ops_manager_can_read_command_centre(self):
        ops = User.objects.create(
            email="ops.cc@test.eco",
            role=User.Role.OPS_MANAGER,
            is_staff=True,
        )
        client = self._client_for(ops)
        res = client.get("/api/v1/operations/command-centre/")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIn("kpis", res.json())

    def test_hub_agent_forbidden_on_command_centre(self):
        agent = User.objects.create(
            email="agent.cc@test.eco",
            role=User.Role.HUB_AGENT,
            is_staff=True,
        )
        StaffMembership.objects.create(
            user=agent,
            role=User.Role.HUB_AGENT,
            hub_id=str(self.hub.id),
        )
        client = self._client_for(agent)
        res = client.get("/api/v1/operations/command-centre/")
        self.assertEqual(res.status_code, 403, res.content)
        activity = client.get("/api/v1/operations/activity/")
        self.assertEqual(activity.status_code, 403, activity.content)


class CommandCentreNumbersTests(TestCase):
    """Lagos day, completed swaps only, revenue without top-ups, hourly buckets."""

    def setUp(self):
        from datetime import datetime
        from zoneinfo import ZoneInfo

        from accounts.models import Account, Driver
        from mobility.models import BatteryType, Vehicle, VehicleModel

        self.lagos = ZoneInfo("Africa/Lagos")
        self.now = datetime(2026, 10, 15, 14, 0, tzinfo=self.lagos)
        owner = User.objects.create(phone="+2348015559901", role=User.Role.DRIVER)
        self.account = Account.objects.create(
            owner_user=owner, display_name="CC Rider", status=Account.Status.ACTIVE
        )
        self.driver = Driver.objects.create(user=owner, account=self.account)
        bt = BatteryType.objects.create(name="72V CC", manufacturer="KURA")
        model = VehicleModel.objects.create(make="Kura", model="CC", battery_type=bt)
        self.vehicle = Vehicle.objects.create(
            account=self.account, vehicle_model=model, registration_plate="CC-001"
        )
        self.hub = Hub.objects.create(code="HUB-CCN", name="CCN Hub", address="Lagos")
        self._n = 0

    def _at(self, day_offset, hour, minute=0):
        from datetime import timedelta

        return (self.now + timedelta(days=day_offset)).replace(hour=hour, minute=minute)

    def _swap(self, at, status=None):
        from mobility.models import Swap

        self._n += 1
        return Swap.objects.create(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            status=status or Swap.Status.COMPLETED,
            payment_mode="WALLET",
            amount_kobo=45_000,
            started_at=at,
            completed_at=at if status is None else None,
            client_event_id=f"ccn-{self._n}",
        )

    def _payment(self, at, purpose, kobo):
        from finance.models import Payment

        p = Payment.objects.create(
            account=self.account, hub=self.hub, channel=Payment.Channel.WALLET_DEBIT,
            amount_kobo=kobo, purpose=purpose, status=Payment.Status.SUCCESS,
        )
        Payment.objects.filter(pk=p.pk).update(created_at=at)

    def test_today_kpis_and_hourly(self):
        from unittest import mock

        from django.core.cache import cache

        from mobility.models import Swap
        from operations.views.command_centre import build_command_centre

        self._swap(self._at(0, 0, 30))  # 00:30 WAT = 23:30 UTC yesterday → today
        self._swap(self._at(0, 9, 15))
        self._swap(self._at(0, 9, 40))
        self._swap(self._at(0, 10), status=Swap.Status.FAILED)  # not completed
        self._swap(self._at(-1, 9, 5))  # yesterday
        self._payment(self._at(0, 0, 30), "SWAP", 45_000)
        self._payment(self._at(0, 9, 15), "PLAN", 120_000)
        self._payment(self._at(0, 8), "FUND", 500_000)  # top-up: not revenue
        self._payment(self._at(-1, 23, 50), "SWAP", 45_000)  # yesterday

        cache.clear()
        with mock.patch(
            "operations.views.command_centre.timezone.localtime", return_value=self.now
        ):
            data = build_command_centre()

        self.assertEqual(data["kpis"]["today_swaps"], 3)
        self.assertEqual(data["kpis"]["today_revenue_kobo"], 165_000)
        self.assertEqual(data["hourly_swaps"]["today"][0], 1)
        self.assertEqual(data["hourly_swaps"]["today"][9], 2)
        self.assertEqual(data["hourly_swaps"]["today"][10], 0)
        self.assertEqual(data["hourly_swaps"]["yesterday"][9], 1)
        self.assertEqual(sum(data["hourly_swaps"]["today"]), 3)
