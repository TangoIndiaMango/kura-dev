from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Account, Driver, StaffMembership, User
from accounts.services.auth import issue_tokens
from mobility.models import (
    Battery,
    BatteryType,
    Hub,
    HubSlot,
    Reservation,
    Vehicle,
    VehicleModel,
    VehicleType,
)
from mobility.services.hubs.service import HubService
from notifications.models import Notification


class HubApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create(
            email="hubs-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        tokens = issue_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.hub = HubService.create_hub(
            code="HUB-TST-01",
            name="Test Hub",
            address="1 Test St, Lagos",
            slot_count=4,
        )
        self.bt = BatteryType.objects.create(
            name="Hub Test BT", manufacturer="KURA"
        )
        bat = Battery.objects.create(
            serial="BAT-HUB-001",
            battery_type=self.bt,
            charge_pct=96,
            status=Battery.Status.AVAILABLE,
            current_hub=self.hub,
        )
        slot = HubSlot.objects.get(hub=self.hub, slot_no=1)
        slot.battery = bat
        slot.state = HubSlot.State.READY
        slot.save(update_fields=["battery", "state", "updated_at"])

    def test_list_has_no_slots_key(self):
        res = self.client.get("/api/v1/mobility/hubs/")
        self.assertEqual(res.status_code, 200, res.content)
        rows = res.json()["results"]
        self.assertGreaterEqual(len(rows), 1)
        row = next(r for r in rows if r["code"] == "HUB-TST-01")
        self.assertNotIn("slots", row)
        self.assertEqual(row["ready_count"], 1)
        self.assertEqual(row["slot_count"], 4)

    def test_slots_action(self):
        res = self.client.get(f"/api/v1/mobility/hubs/{self.hub.id}/slots/")
        self.assertEqual(res.status_code, 200, res.content)
        slots = res.json()
        self.assertEqual(len(slots), 4)
        ready = next(s for s in slots if s["slot_no"] == 1)
        self.assertEqual(ready["state"], "READY")
        self.assertEqual(ready["battery_serial"], "BAT-HUB-001")
        self.assertEqual(ready["battery_charge_pct"], 96)

    def test_status_change(self):
        rider = User.objects.create(
            phone="+2348015550001",
            role=User.Role.DRIVER,
        )
        account = Account.objects.create(owner_user=rider, display_name="Hub Rider")
        driver = Driver.objects.create(user=rider, account=account)
        model = VehicleModel.objects.create(
            make="Kura",
            model="Hub Test",
            vehicle_type=VehicleType.MOTORCYCLE,
            battery_type=self.bt,
        )
        vehicle = Vehicle.objects.create(
            account=account,
            vehicle_model=model,
            registration_plate="HUB-101",
        )
        reservation = Reservation.objects.create(
            account=account,
            vehicle=vehicle,
            driver=driver,
            hub=self.hub,
            code="KB-HUB-01",
            expires_at=timezone.now() + timezone.timedelta(minutes=15),
        )
        operator = User.objects.create(
            email="hub.operator@test.eco",
            role=User.Role.HUB_AGENT,
            is_staff=True,
        )
        StaffMembership.objects.create(
            user=operator,
            role=User.Role.HUB_AGENT,
            hub_id=str(self.hub.id),
        )
        res = self.client.post(
            f"/api/v1/mobility/hubs/{self.hub.id}/status/",
            {"status": "MAINTENANCE"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["status"], "MAINTENANCE")
        self.hub.refresh_from_db()
        self.assertEqual(self.hub.status, Hub.Status.MAINTENANCE)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, Reservation.Status.CANCELLED)
        self.assertTrue(
            Notification.objects.filter(
                user=rider,
                template_code="reservation.cancelled",
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                user=operator,
                template_code="hub.status_changed",
            ).exists()
        )
        from audit.models import AuditEvent

        self.assertTrue(
            AuditEvent.objects.filter(
                action="hub.status_changed", subject_id=str(self.hub.id)
            ).exists()
        )

    def test_stats_and_export(self):
        res = self.client.get("/api/v1/mobility/hubs/stats/")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        self.assertGreaterEqual(data["totals"]["all"], 1)
        self.assertGreaterEqual(data["inventory"]["ready"], 1)

        res = self.client.get("/api/v1/mobility/hubs/export/", {"export": "csv"})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIn("text/csv", res["Content-Type"])
        body = res.content.decode()
        self.assertIn("HUB-TST-01", body)

        res = self.client.get("/api/v1/mobility/hubs/export/", {"export": "pdf"})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(res.content.startswith(b"%PDF"))

    def test_create_and_update(self):
        res = self.client.post(
            "/api/v1/mobility/hubs/",
            {
                "code": "HUB-NEW-99",
                "name": "New Hub",
                "address": "2 New Rd",
                "slot_count": 8,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        hub_id = res.json()["id"]
        self.assertEqual(HubSlot.objects.filter(hub_id=hub_id).count(), 8)

        res = self.client.patch(
            f"/api/v1/mobility/hubs/{hub_id}/",
            {"name": "New Hub Renamed", "slot_count": 10},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["name"], "New Hub Renamed")
        self.assertEqual(HubSlot.objects.filter(hub_id=hub_id).count(), 10)

    def test_cap_gate(self):
        driver = User.objects.create(phone="+2348015559999", role=User.Role.DRIVER)
        tokens = issue_tokens(driver)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = client.get("/api/v1/mobility/hubs/")
        self.assertEqual(res.status_code, 403)

    def test_hub_detail_stats_date_range(self):
        res = self.client.get(
            f"/api/v1/mobility/hubs/{self.hub.id}/stats/?start_date=2026-09-01&end_date=2026-09-07"
        )
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        self.assertEqual(data["start_date"], "2026-09-01")
        self.assertEqual(data["end_date"], "2026-09-07")
        self.assertEqual(data["code"], "HUB-TST-01")
        self.assertEqual(len(data["daily_metrics"]), 7)
        self.assertIn("solar_capacity_kw", data)
        self.assertIn("ready_count", data)
