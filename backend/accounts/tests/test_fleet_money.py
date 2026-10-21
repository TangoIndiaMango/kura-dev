"""Fleet spend per hub-local day: swap fees + plan fees, owner-only API."""
from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, Driver, User
from accounts.selectors.spend import fleet_money_breakdown
from finance.models import Payment
from mobility.models import (
    BatteryType,
    Hub,
    Plan,
    Subscription,
    Swap,
    Vehicle,
    VehicleModel,
)

LAGOS = ZoneInfo("Africa/Lagos")


class FleetMoneyTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create(phone="+2348015557701", role=User.Role.FLEET_OWNER)
        self.peer = User.objects.create(phone="+2348015557702", role=User.Role.DRIVER)
        self.account = Account.objects.create(
            owner_user=self.owner, display_name="Fleet", status=Account.Status.ACTIVE
        )
        self.owner_driver = Driver.objects.create(user=self.owner, account=self.account)
        self.peer_driver = Driver.objects.create(user=self.peer, account=self.account)
        bt = BatteryType.objects.create(name="72V", manufacturer="KURA")
        model = VehicleModel.objects.create(make="Kura", model="City", battery_type=bt)
        self.v1 = Vehicle.objects.create(
            account=self.account, vehicle_model=model, registration_plate="FM-001"
        )
        self.v2 = Vehicle.objects.create(
            account=self.account, vehicle_model=model, registration_plate="FM-002"
        )
        self.hub = Hub.objects.create(code="HUB-FM", name="FM Hub", address="Lagos")
        self.day = datetime(2026, 10, 15, tzinfo=LAGOS).date()
        self._n = 0

    def _swap(self, *, vehicle, driver, at, fee, status=Swap.Status.COMPLETED, mode="WALLET"):
        self._n += 1
        return Swap.objects.create(
            account=self.account,
            vehicle=vehicle,
            driver=driver,
            hub=self.hub,
            status=status,
            payment_mode=mode,
            amount_kobo=fee,
            started_at=at,
            completed_at=at,
            client_event_id=f"fm-{self._n}",
        )

    def _at(self, day, hour, minute=0):
        return datetime(day.year, day.month, day.day, hour, minute, tzinfo=LAGOS)

    def test_daily_totals_use_lagos_day_and_include_plan_fees(self):
        # 00:30 WAT on the 16th is 23:30 UTC on the 15th — must land on the 16th.
        next_day = self.day + timedelta(days=1)
        self._swap(vehicle=self.v1, driver=self.owner_driver, at=self._at(self.day, 10), fee=45_000)
        self._swap(vehicle=self.v2, driver=self.peer_driver, at=self._at(next_day, 0, 30), fee=40_500)
        self._swap(
            vehicle=self.v1,
            driver=self.owner_driver,
            at=self._at(self.day, 12),
            fee=45_000,
            status=Swap.Status.REVERSED,
        )
        plan = Plan.objects.create(code="FM-WK", name="Weekly", price_kobo=700_000)
        pay = Payment.objects.create(
            account=self.account, amount_kobo=700_000, purpose="PLAN"
        )
        Payment.objects.filter(pk=pay.pk).update(created_at=self._at(self.day, 9))
        Subscription.objects.create(
            account=self.account,
            vehicle=self.v2,
            plan=plan,
            payment=pay,
            ends_at=self._at(self.day + timedelta(days=7), 9),
        )

        out = fleet_money_breakdown(
            self.account,
            start_date=self.day.isoformat(),
            end_date=next_day.isoformat(),
        )
        by_date = {d["date"]: d for d in out["daily"]}
        d15 = by_date[self.day.isoformat()]
        d16 = by_date[next_day.isoformat()]
        self.assertEqual((d15["swaps"], d15["swap_fees_kobo"], d15["plan_fees_kobo"]), (1, 45_000, 700_000))
        self.assertEqual((d16["swaps"], d16["swap_fees_kobo"]), (1, 40_500))
        self.assertEqual(out["totals"]["total_kobo"], 45_000 + 40_500 + 700_000)

        vehicles = {v["plate"]: v for v in out["by_vehicle"]}
        self.assertEqual(vehicles["FM-002"]["plan_fees_kobo"], 700_000)
        self.assertEqual(vehicles["FM-002"]["total_kobo"], 740_500)
        self.assertEqual(vehicles["FM-001"]["total_kobo"], 45_000)
        drivers = {d["driver_id"]: d for d in out["by_driver"]}
        self.assertEqual(drivers[str(self.peer_driver.id)]["swap_fees_kobo"], 40_500)

    def test_endpoint_is_owner_only(self):
        client = APIClient()
        client.force_authenticate(self.owner)
        res = client.get("/api/v1/accounts/me/fleet-spend/")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIn("daily", res.json())
        self.assertEqual(len(res.json()["drivers_today"]), 2)

        client.force_authenticate(self.peer)
        self.assertEqual(client.get("/api/v1/accounts/me/fleet-spend/").status_code, 403)
