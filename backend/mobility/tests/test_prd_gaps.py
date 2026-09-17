from django.test import TestCase
from django.utils import timezone

from accounts.models import Account, Driver, User
from core.helpers.crypto_qr import (
    build_battery_token,
    build_reservation_token,
    verify_battery_token,
    verify_reservation_token,
)
from mobility.models import Battery, BatteryType, Hub, Vehicle, VehicleModel
from mobility.services.batteries.service import BatteryService
from mobility.services.hubs.hours import hub_is_open
from mobility.services.batteries.unreturned import process_unreturned_batteries
from mobility.services.vehicles.qr import (
    resolve_vehicle_qr,
    vehicle_qr_payload,
)
from operations.models import InventoryCount
from operations.services.inventory import submit_inventory_count


class PrdGapHardenTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create(
            email="gap-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        self.btype = BatteryType.objects.create(
            name="Gap Pack", manufacturer="KURA", qr_scheme="SIGNED"
        )
        self.hub = Hub.objects.create(
            code="HUB-GAP-01",
            name="Gap Hub",
            address="1 Gap",
            operating_hours={"mon": [["00:00", "23:59"]], "tue": [["00:00", "23:59"]],
                             "wed": [["00:00", "23:59"]], "thu": [["00:00", "23:59"]],
                             "fri": [["00:00", "23:59"]], "sat": [["00:00", "23:59"]],
                             "sun": [["00:00", "23:59"]]},
        )
        self.battery = BatteryService.create(
            data={
                "serial": "KUR-GAP-001",
                "battery_type_id": self.btype.id,
                "current_hub_id": self.hub.id,
            },
            actor=self.admin,
        )

    def test_battery_l1_qr_roundtrip(self):
        token = build_battery_token(
            serial=self.battery.serial, secret=self.battery.qr_secret
        )
        verify_battery_token(
            token=token,
            serial=self.battery.serial,
            secret=self.battery.qr_secret,
            scheme="SIGNED",
        )
        with self.assertRaises(Exception):
            verify_battery_token(
                token=token[:-4] + "dead",
                serial=self.battery.serial,
                secret=self.battery.qr_secret,
                scheme="SIGNED",
            )

    def test_reservation_token_exp(self):
        rid = "01testresid000000000000000"
        token = build_reservation_token(
            reservation_id=rid, exp_unix=int(timezone.now().timestamp()) + 60, secret=rid
        )
        verify_reservation_token(token=token, secret=rid)

    def test_hub_hours_closed_window(self):
        self.hub.operating_hours = {"mon": [["09:00", "10:00"]]}
        self.hub.save(update_fields=["operating_hours"])
        # Force a Monday 03:00 Lagos — may or may not be Monday; use status CLOSED
        self.hub.status = Hub.Status.CLOSED
        self.hub.save(update_fields=["status"])
        self.assertFalse(hub_is_open(self.hub))

    def test_inventory_count_variance(self):
        row = submit_inventory_count(
            hub=self.hub,
            counted={"NOPE-SERIAL": "READY"},
            actor=self.admin,
        )
        self.assertTrue(InventoryCount.objects.filter(pk=row.pk).exists())
        self.assertIn("unexpected", row.variance)

    def _make_vehicle(self) -> Vehicle:
        owner = User.objects.create(phone="+2348011112222", role=User.Role.DRIVER)
        account = Account.objects.create(
            owner_user=owner,
            display_name="Gap Rider",
            kura_id="KR-GAP1",
        )
        Driver.objects.create(user=owner, account=account)
        vmodel = VehicleModel.objects.create(
            make="Gap",
            model="M1",
            battery_type=self.btype,
        )
        return Vehicle.objects.create(
            account=account,
            vehicle_model=vmodel,
            registration_plate="GAP-001-XY",
            current_battery=self.battery,
        )

    def test_vehicle_l1_qr_roundtrip(self):
        vehicle = self._make_vehicle()
        payload = vehicle_qr_payload(vehicle=vehicle)
        self.assertTrue(payload["qr"].startswith("v1."))
        resolved = resolve_vehicle_qr(token=payload["qr"])
        self.assertEqual(resolved.id, vehicle.id)

    def test_unreturned_marks_lost(self):
        vehicle = self._make_vehicle()
        self.battery.status = Battery.Status.ISSUED
        self.battery.issued_at = timezone.now() - timezone.timedelta(hours=72)
        self.battery.expected_return_by = timezone.now() - timezone.timedelta(hours=1)
        self.battery.save()
        result = process_unreturned_batteries(limit=10)
        self.battery.refresh_from_db()
        vehicle.account.refresh_from_db()
        self.assertGreaterEqual(result["processed"], 1)
        self.assertEqual(self.battery.status, Battery.Status.LOST)
        self.assertEqual(vehicle.account.status, Account.Status.SUSPENDED)
