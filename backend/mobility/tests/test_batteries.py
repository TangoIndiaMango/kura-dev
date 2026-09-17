from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from accounts.services.auth import issue_tokens
from audit.models import AuditEvent
from mobility.models import Battery, BatteryType, Hub
from mobility.models import BatteryEvent
from mobility.services.batteries.service import BatteryService


class BatteryApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create(
            email="batt-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        tokens = issue_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.btype = BatteryType.objects.create(
            name="PowerCore 72V", manufacturer="KURA"
        )
        self.hub = Hub.objects.create(
            code="HUB-BAT-01",
            name="Battery Hub",
            address="1 Pack Rd",
        )
        self.hub2 = Hub.objects.create(
            code="HUB-BAT-02",
            name="Battery Hub 2",
            address="2 Pack Rd",
        )
        self.battery = BatteryService.create(
            data={
                "serial": "KUR-BAT-001",
                "battery_type_id": self.btype.id,
                "current_hub_id": self.hub.id,
                "status": Battery.Status.AVAILABLE,
                "charge_pct": 94,
                "health_pct": 97,
                "cycle_count": 12,
            },
            actor=self.admin,
        )

    def test_list_columns(self):
        res = self.client.get("/api/v1/mobility/batteries/")
        self.assertEqual(res.status_code, 200, res.content)
        row = res.json()["results"][0]
        self.assertEqual(row["serial"], "KUR-BAT-001")
        self.assertEqual(row["hub_code"], "HUB-BAT-01")
        self.assertNotIn("slots", row)
        self.assertIn("battery_type_name", row)
        self.assertIn("custodian_type", row)

    def test_commission_writes_custody_and_audit(self):
        self.assertTrue(
            BatteryEvent.objects.filter(
                battery=self.battery, event=BatteryEvent.Event.RECEIVED
            ).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                action="battery.commissioned", subject_id=str(self.battery.id)
            ).exists()
        )

    def test_status_retire_and_fault(self):
        res = self.client.post(
            f"/api/v1/mobility/batteries/{self.battery.id}/status/",
            {"status": "FAULTED", "note": "SOH drop"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["status"], "FAULTED")
        self.assertTrue(
            AuditEvent.objects.filter(
                action="battery.faulted", subject_id=str(self.battery.id)
            ).exists()
        )
        self.assertTrue(
            BatteryEvent.objects.filter(
                battery=self.battery, event=BatteryEvent.Event.FAULT
            ).exists()
        )

        res = self.client.post(
            f"/api/v1/mobility/batteries/{self.battery.id}/status/",
            {"status": "RETIRED"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["status"], "RETIRED")
        self.assertTrue(
            AuditEvent.objects.filter(
                action="battery.retired", subject_id=str(self.battery.id)
            ).exists()
        )

    def test_transfer_blocks_issued_and_patch_hub(self):
        self.battery.status = Battery.Status.ISSUED
        self.battery.save(update_fields=["status"])
        res = self.client.post(
            f"/api/v1/mobility/batteries/{self.battery.id}/transfer/",
            {"destination": "hub", "hub_id": str(self.hub2.id)},
            format="json",
        )
        self.assertEqual(res.status_code, 409, res.content)

        self.battery.status = Battery.Status.AVAILABLE
        self.battery.save(update_fields=["status"])
        res = self.client.patch(
            f"/api/v1/mobility/batteries/{self.battery.id}/",
            {"current_hub_id": str(self.hub2.id)},
            format="json",
        )
        self.assertEqual(res.status_code, 403, res.content)

        res = self.client.post(
            f"/api/v1/mobility/batteries/{self.battery.id}/transfer/",
            {"destination": "hub", "hub_id": str(self.hub2.id)},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["current_hub_id"], str(self.hub2.id))
        self.assertTrue(
            BatteryEvent.objects.filter(
                battery=self.battery, event=BatteryEvent.Event.TRANSFERRED
            ).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                action="battery.transferred", subject_id=str(self.battery.id)
            ).exists()
        )

    def test_retired_immutable_and_events_feed(self):
        self.client.post(
            f"/api/v1/mobility/batteries/{self.battery.id}/retire/",
            {"note": "eol"},
            format="json",
        )
        res = self.client.patch(
            f"/api/v1/mobility/batteries/{self.battery.id}/",
            {"charge_pct": 10},
            format="json",
        )
        self.assertEqual(res.status_code, 409, res.content)

        res = self.client.get(
            f"/api/v1/mobility/batteries/{self.battery.id}/events/"
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertGreaterEqual(len(res.json()["results"]), 2)

    def test_stats_export_types(self):
        res = self.client.get("/api/v1/mobility/batteries/stats/")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertGreaterEqual(res.json()["totals"]["all"], 1)
        self.assertGreaterEqual(res.json()["totals"]["available"], 1)

        res = self.client.get(
            "/api/v1/mobility/batteries/export/", {"export": "csv"}
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIn("KUR-BAT-001", res.content.decode())

        res = self.client.get(
            "/api/v1/mobility/batteries/export/", {"export": "pdf"}
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(res.content.startswith(b"%PDF"))

        res = self.client.get("/api/v1/mobility/batteries/types/")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(any(t["name"] == "PowerCore 72V" for t in res.json()))

    def test_create_and_update(self):
        res = self.client.post(
            "/api/v1/mobility/batteries/",
            {
                "serial": "KUR-BAT-NEW",
                "battery_type_id": str(self.btype.id),
                "current_hub_id": str(self.hub.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        bat_id = res.json()["id"]

        res = self.client.patch(
            f"/api/v1/mobility/batteries/{bat_id}/",
            {"charge_pct": 80, "status": "CHARGING"},
            format="json",
        )
        self.assertEqual(res.status_code, 403, res.content)

        res = self.client.patch(
            f"/api/v1/mobility/batteries/{bat_id}/",
            {"charge_pct": 80},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["charge_pct"], 80)

        res = self.client.post(
            f"/api/v1/mobility/batteries/{bat_id}/status/",
            {"status": "CHARGING"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["status"], "CHARGING")

    def test_cap_gate(self):
        driver = User.objects.create(phone="+2348015558888", role=User.Role.DRIVER)
        tokens = issue_tokens(driver)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = client.get("/api/v1/mobility/batteries/")
        self.assertEqual(res.status_code, 403)
