from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from accounts.services.auth import issue_tokens
from audit.models import AuditEvent
from mobility.models import Hub
from operations.models import Alert
from operations.services import AlertService


class AlertApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create(
            email="alerts-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        tokens = issue_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.hub = Hub.objects.create(
            code="HUB-AL",
            name="Alert Hub",
            address="1 Test St, Lagos",
            lat=6.45,
            lng=3.39,
        )

    def test_list_ack_resolve_escalate(self):
        alert = AlertService.open(
            kind=Alert.Kind.LOW_INVENTORY,
            message="Ready pack below threshold",
            severity=Alert.Severity.WARNING,
            hub=self.hub,
        )
        res = self.client.get("/api/v1/operations/alerts/")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(len(res.json()["results"]), 1)

        res = self.client.post(
            f"/api/v1/operations/alerts/{alert.id}/ack/",
            {},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["status"], "ACKNOWLEDGED")

        res = self.client.post(
            f"/api/v1/operations/alerts/{alert.id}/escalate/",
            {"note": "Needs ops lead"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["status"], "ESCALATED")
        self.assertEqual(res.json()["severity"], "CRITICAL")

        res = self.client.post(
            f"/api/v1/operations/alerts/{alert.id}/resolve/",
            {"note": "Restocked"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["status"], "RESOLVED")
        self.assertTrue(res.json()["is_resolved"])
        actions = set(
            AuditEvent.objects.filter(subject_id=str(alert.id)).values_list(
                "action", flat=True
            )
        )
        self.assertTrue(
            {
                "alert.opened",
                "alert.acknowledged",
                "alert.escalated",
                "alert.resolved",
            }.issubset(actions)
        )

    def test_driver_cannot_read_alert_queue(self):
        driver = User.objects.create(
            phone="+2348010101010",
            role=User.Role.DRIVER,
        )
        tokens = issue_tokens(driver)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        response = self.client.get("/api/v1/operations/alerts/")
        self.assertEqual(response.status_code, 403)

    def test_stats_and_export(self):
        AlertService.open(
            kind=Alert.Kind.HUB_OFFLINE,
            message="Hub unreachable",
            severity=Alert.Severity.CRITICAL,
            hub=self.hub,
        )
        AlertService.open(
            kind=Alert.Kind.CASH_LIMIT,
            message="Cash float high",
            severity=Alert.Severity.INFO,
            hub=self.hub,
        )
        res = self.client.get("/api/v1/operations/alerts/stats/")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        self.assertGreaterEqual(data["queue"]["open"], 2)
        self.assertGreaterEqual(data["period"]["opened"], 2)

        res = self.client.get(
            "/api/v1/operations/alerts/export/", {"export": "csv"}
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIn("text/csv", res["Content-Type"])
        self.assertIn("kind", res.content.decode())

        res = self.client.get(
            "/api/v1/operations/alerts/export/", {"export": "pdf"}
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(res.content.startswith(b"%PDF"))
