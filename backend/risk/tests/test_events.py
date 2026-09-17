from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, User
from accounts.services.auth import issue_tokens
from risk.models import RiskEvent
from risk.services import RiskService


class RiskEventApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create(
            email="risk-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        tokens = issue_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        owner = User.objects.create(phone="+2348019990011", role=User.Role.DRIVER)
        self.account = Account.objects.create(owner_user=owner, display_name="Risk Rider")

    def test_emit_filter_and_review(self):
        event = RiskService.emit(
            rule_code="BATTERY_MISMATCH",
            subject_type="account",
            subject_id=str(self.account.id),
            account=self.account,
            context={"returned": "BAT-X", "expected": "BAT-Y"},
        )
        res = self.client.get(
            "/api/v1/risk/events/",
            {"account": str(self.account.id)},
        )
        self.assertEqual(res.status_code, 200)
        rows = res.json()["results"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["rule_code"], "BATTERY_MISMATCH")

        res = self.client.post(
            f"/api/v1/risk/events/{event.id}/review/",
            {"status": RiskEvent.Status.REVIEWED_OK, "note": "False positive"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "REVIEWED_OK")

    def test_manual_flag(self):
        res = self.client.post(
            "/api/v1/risk/events/",
            {
                "account_id": str(self.account.id),
                "note": "Ops spotted chargeback pattern",
                "severity": "HIGH",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["rule_code"], "MANUAL_FLAG")
        self.assertEqual(body["account_id"], str(self.account.id))
        self.assertEqual(body["account_display_name"], "Risk Rider")

    def test_stats_queue_and_period(self):
        RiskService.emit(
            rule_code="BATTERY_MISMATCH",
            subject_type="account",
            subject_id=str(self.account.id),
            account=self.account,
        )
        RiskService.emit(
            rule_code="MANUAL_FLAG",
            subject_type="account",
            subject_id=str(self.account.id),
            account=self.account,
            severity=RiskEvent.Severity.CRITICAL,
        )
        res = self.client.get("/api/v1/risk/events/stats/")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        self.assertGreaterEqual(data["queue"]["open"], 2)
        self.assertGreaterEqual(data["period"]["opened"], 2)
        self.assertTrue(any(r["rule"] == "BATTERY_MISMATCH" for r in data["period"]["by_rule"]))

    def test_export_csv(self):
        RiskService.emit(
            rule_code="GEO_IMPOSSIBLE",
            subject_type="account",
            subject_id=str(self.account.id),
            account=self.account,
            context={"note": "Export me"},
        )
        res = self.client.get("/api/v1/risk/events/export/", {"export": "csv"})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIn("text/csv", res["Content-Type"])
        body = res.content.decode()
        self.assertIn("rule_code", body.splitlines()[0])
        self.assertIn("GEO_IMPOSSIBLE", body)

    def test_export_pdf(self):
        RiskService.emit(
            rule_code="NEW_DEVICE",
            subject_type="account",
            subject_id=str(self.account.id),
            account=self.account,
        )
        res = self.client.get("/api/v1/risk/events/export/", {"export": "pdf"})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res["Content-Type"], "application/pdf")
        self.assertTrue(res.content.startswith(b"%PDF"))
