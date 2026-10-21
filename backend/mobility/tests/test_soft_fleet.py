"""Soft fleet overlays — assignment, limits, attach, spend breakdown."""
from __future__ import annotations

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Account, Driver, User
from accounts.services.drivers import DriverService
from audit.models import AuditEvent
from mobility.models import (
    BatteryType,
    DiscountCampaign,
    Hub,
    Swap,
    Vehicle,
    VehicleAssignment,
    VehicleModel,
)
from mobility.services.plans.discount_rules import assert_eligible
from mobility.services.reservations.fleet_guards import (
    assert_driver_may_use_vehicle,
    assert_driver_within_limits,
)
from mobility.services.vehicles.assignment import VehicleAssignmentService
from mobility.services.vehicles.service import VehicleService


class SoftFleetTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create(
            phone="+2348011110001",
            role=User.Role.FLEET_OWNER,
            first_name="Fleet",
            last_name="Owner",
        )
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Soft Fleet Co",
            kura_id="KR-SOFT1",
            kind=Account.Kind.INDIVIDUAL,
        )
        self.owner_driver = Driver.objects.create(user=self.owner, account=self.account)
        self.other_user = User.objects.create(
            phone="+2348011110002",
            role=User.Role.DRIVER,
            first_name="Other",
            last_name="Driver",
        )
        self.other_driver = Driver.objects.create(
            user=self.other_user, account=self.account
        )
        self.btype = BatteryType.objects.create(name="Soft Pack", manufacturer="KURA")
        self.model = VehicleModel.objects.create(
            make="Spiro", model="Soft", battery_type=self.btype
        )
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=self.model,
            registration_plate="SOFT-001-AB",
        )
        self.admin = User.objects.create(
            email="soft-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_assign_and_guard(self):
        VehicleAssignmentService.assign(
            vehicle=self.vehicle,
            driver_id=self.owner_driver.id,
            actor=self.admin,
            note="shift A",
        )
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.assigned_driver_id, self.owner_driver.id)
        self.assertTrue(
            AuditEvent.objects.filter(
                action="vehicle.assigned", subject_id=str(self.vehicle.id)
            ).exists()
        )
        self.assertEqual(
            VehicleAssignment.objects.filter(
                vehicle=self.vehicle, ends_at__isnull=True
            ).count(),
            1,
        )
        assert_driver_may_use_vehicle(
            driver=self.owner_driver, vehicle=self.vehicle
        )
        with self.assertRaises(Exception) as ctx:
            assert_driver_may_use_vehicle(
                driver=self.other_driver, vehicle=self.vehicle
            )
        self.assertEqual(ctx.exception.code, "VEHICLE_ASSIGNED")

        hist = self.client.get(
            f"/api/v1/mobility/vehicles/{self.vehicle.id}/assignments/"
        )
        self.assertEqual(hist.status_code, 200)
        self.assertGreaterEqual(len(hist.data), 1)
        self.assertEqual(hist.data[0]["note"], "shift A")

        res = self.client.post(
            f"/api/v1/mobility/vehicles/{self.vehicle.id}/assign-driver/",
            {"driver_id": None},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.vehicle.refresh_from_db()
        self.assertIsNone(self.vehicle.assigned_driver_id)
        self.assertEqual(
            VehicleAssignment.objects.filter(
                vehicle=self.vehicle, ends_at__isnull=True
            ).count(),
            0,
        )

    def test_promote_fleet_on_second_vehicle(self):
        VehicleService.create(
            data={
                "account_id": self.account.id,
                "vehicle_model_id": self.model.id,
                "registration_plate": "SOFT-002-AB",
            },
            actor=self.admin,
        )
        self.account.refresh_from_db()
        self.assertEqual(self.account.kind, Account.Kind.FLEET)
        self.assertTrue(
            AuditEvent.objects.filter(
                action="account.promoted_fleet",
                subject_id=str(self.account.id),
            ).exists()
        )

    def test_fleet_discount_requires_vehicle_count(self):
        discount = DiscountCampaign.objects.create(
            name="Fleet 10",
            code="FLEET10",
            value_type=DiscountCampaign.ValueType.PERCENT,
            value=10,
            status=DiscountCampaign.Status.ACTIVE,
            applies_to_all_plans=True,
            periods=["weekly", "daily", "monthly", "pps"],
            audience=DiscountCampaign.Audience.FLEET,
            fleet_min_vehicles=2,
            channels="App · USSD · Hub",
        )
        with self.assertRaises(Exception) as ctx:
            assert_eligible(
                discount=discount,
                period="pps",
                channel="App",
                plan=None,
                vehicle_count=1,
                granted_segment_id="",
            )
        self.assertEqual(ctx.exception.code, "DISCOUNT_AUDIENCE")
        assert_eligible(
            discount=discount,
            period="pps",
            channel="App",
            plan=None,
            vehicle_count=2,
            granted_segment_id="",
        )

    def test_limits_and_attach_api(self):
        limited = DriverService.update_limits(
            driver=self.owner_driver,
            daily_swap_limit=1,
            daily_spend_kobo_limit=100_000,
            actor=self.admin,
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                action="driver.limits_updated",
                subject_id=str(self.owner_driver.id),
            ).exists()
        )
        Hub.objects.create(
            code="HUB-SOFT",
            name="Soft Hub",
            address="Lagos",
            lat=6.5,
            lng=3.3,
            status=Hub.Status.ONLINE,
        )
        Swap.objects.create(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.owner_driver,
            hub=Hub.objects.get(code="HUB-SOFT"),
            status=Swap.Status.COMPLETED,
            completed_at=timezone.now(),
            amount_kobo=50_000,
            payment_mode="WALLET",
        )
        with self.assertRaises(Exception) as ctx:
            assert_driver_within_limits(driver=limited, fee_kobo=0)
        self.assertEqual(ctx.exception.code, "DRIVER_SWAP_LIMIT")

        res = self.client.post(
            "/api/v1/drivers/attach/",
            {
                "account_id": str(self.account.id),
                "phone": "+2348011110099",
                "first_name": "New",
                "last_name": "Rider",
                "daily_swap_limit": 3,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(
            AuditEvent.objects.filter(action="driver.attached").exists()
        )
        self.account.refresh_from_db()
        # kind stays INDIVIDUAL until 2+ vehicles; attach alone does not force FLEET
        self.assertIn(self.account.kind, {Account.Kind.INDIVIDUAL, Account.Kind.FLEET})

    def test_spend_breakdown_on_detail_stats(self):
        hub = Hub.objects.create(
            code="HUB-SPEND",
            name="Spend Hub",
            address="Lagos",
            lat=6.5,
            lng=3.3,
            status=Hub.Status.ONLINE,
        )
        Swap.objects.create(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.owner_driver,
            hub=hub,
            status=Swap.Status.COMPLETED,
            completed_at=timezone.now(),
            amount_kobo=75_000,
            payment_mode="WALLET",
        )
        res = self.client.get(f"/api/v1/accounts/{self.account.id}/stats/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["spend_amount_kobo"], 75_000)
        self.assertEqual(len(res.data["spend_by_vehicle"]), 1)
        self.assertEqual(res.data["spend_by_vehicle"][0]["plate"], "SOFT-001-AB")
        self.assertEqual(len(res.data["spend_by_driver"]), 1)

    def test_assign_requires_cap(self):
        rider = User.objects.create(phone="+2348011110088", role=User.Role.DRIVER)
        client = APIClient()
        client.force_authenticate(rider)
        res = client.post(
            f"/api/v1/mobility/vehicles/{self.vehicle.id}/assign-driver/",
            {"driver_id": str(self.owner_driver.id)},
            format="json",
        )
        self.assertIn(res.status_code, {403, 404})

    def test_peer_driver_cannot_attach(self):
        peer = self.other_user
        client = APIClient()
        client.force_authenticate(peer)
        res = client.post(
            "/api/v1/drivers/attach/",
            {
                "account_id": str(self.account.id),
                "phone": "+2348011110077",
                "first_name": "Peer",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_spend_limit_guard(self):
        limited = DriverService.update_limits(
            driver=self.owner_driver,
            daily_spend_kobo_limit=10_000,
            actor=self.admin,
        )
        with self.assertRaises(Exception) as ctx:
            assert_driver_within_limits(driver=limited, fee_kobo=15_000)
        self.assertEqual(ctx.exception.code, "DRIVER_SPEND_LIMIT")
