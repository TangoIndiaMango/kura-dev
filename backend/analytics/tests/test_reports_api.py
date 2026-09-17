"""ReportJob IMPACT_PDF + CSV API."""
from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.services.roles import RoleService
from analytics.models import DailyHubMetric, MonthlyImpactMetric, ReportJob
from audit.models import AuditEvent
from finance.models import LedgerAccount, LedgerTransaction
from finance.services.ledger import LedgerService
from mobility.models import Battery, BatteryType, Hub

User = get_user_model()


class ReportJobApiTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        self.ops = User.objects.create_user(
            phone="+2348033700001",
            password="x",
            role="OPS_MANAGER",
            is_staff=True,
        )
        MonthlyImpactMetric.objects.create(
            period="2026-09",
            operators_served=10,
            swaps=100,
            fuel_savings_kobo=1_000_000,
            engines_replaced=2,
            co2_kg=Decimal("500.000"),
        )
        self.hub = Hub.objects.create(
            code="TST-HUB",
            name="Test Hub",
            address="Lagos",
        )
        DailyHubMetric.objects.create(
            hub=self.hub,
            date=timezone.localdate(),
            swaps=12,
            revenue_kobo_by_channel={"WALLET": 50_000, "CASH": 20_000},
            batteries_ready_avg=Decimal("8.50"),
            no_shows=1,
            overrides=0,
        )
        bt = BatteryType.objects.create(name="TestPack", manufacturer="KURA")
        Battery.objects.create(
            serial="BAT-RPT-1",
            battery_type=bt,
            status=Battery.Status.AVAILABLE,
            charge_pct=90,
            health_pct=95,
            cycle_count=40,
            current_hub=self.hub,
        )
        LedgerService.post_transaction(
            kind=LedgerTransaction.Kind.PLAN_FEE,
            reference="plan-fee:report-test",
            description="Plan fee test",
            entries=[
                {
                    "code": "wallet:KR-TEST",
                    "type": LedgerAccount.AccountType.LIABILITY,
                    "debit": 10_750,
                    "credit": 0,
                },
                {
                    "code": "revenue:plan",
                    "type": LedgerAccount.AccountType.REVENUE,
                    "debit": 0,
                    "credit": 10_000,
                },
                {
                    "code": "vat_payable",
                    "type": LedgerAccount.AccountType.LIABILITY,
                    "debit": 0,
                    "credit": 750,
                },
            ],
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.ops)

    def _create(self, kind: str, params: dict | None = None, key: str = "") -> dict:
        body = {"kind": kind, "params": params or {}}
        if key:
            body["idempotency_key"] = key
        res = self.client.post("/api/v1/reports/", body, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        return res.json()

    def test_create_ready_download_and_audit(self):
        body = self._create(
            "IMPACT_PDF",
            {"period": "2026-09"},
            key="impact-pdf-test-1",
        )
        self.assertEqual(body["kind"], "IMPACT_PDF")
        self.assertEqual(body["status"], "READY")
        self.assertTrue(body["download_path"])
        rid = body["id"]
        self.assertTrue(
            AuditEvent.objects.filter(action="report.queued", subject_id=rid).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(action="report.ready", subject_id=rid).exists()
        )

        detail = self.client.get(f"/api/v1/reports/{rid}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["status"], "READY")

        dl = self.client.get(f"/api/v1/reports/{rid}/download/")
        self.assertEqual(dl.status_code, 200)
        self.assertEqual(dl["Content-Type"], "application/pdf")
        payload = b"".join(dl.streaming_content)
        self.assertTrue(payload.startswith(b"%PDF"))

        again = self._create(
            "IMPACT_PDF",
            {"period": "2026-09"},
            key="impact-pdf-test-1",
        )
        self.assertEqual(again["id"], rid)

    def test_ops_fleet_revenue_csv(self):
        ops = self._create("OPS_CSV", key="ops-csv-1")
        self.assertEqual(ops["status"], "READY")
        self.assertTrue(ops["raw"]["filename"].endswith(".csv"))
        dl = self.client.get(f"/api/v1/reports/{ops['id']}/download/")
        self.assertEqual(dl.status_code, 200)
        text = b"".join(dl.streaming_content).decode()
        self.assertIn("hub_code", text)
        self.assertIn("TST-HUB", text)

        fleet = self._create("FLEET_CSV", key="fleet-csv-1")
        self.assertEqual(fleet["status"], "READY")
        ftext = b"".join(
            self.client.get(
                f"/api/v1/reports/{fleet['id']}/download/"
            ).streaming_content
        ).decode()
        self.assertIn("BAT-RPT-1", ftext)
        self.assertIn("GOOD", ftext)

        rev = self._create(
            "REVENUE_CSV",
            {"period": timezone.now().strftime("%Y-%m")},
            key="rev-csv-1",
        )
        self.assertEqual(rev["status"], "READY")
        rtext = b"".join(
            self.client.get(f"/api/v1/reports/{rev['id']}/download/").streaming_content
        ).decode()
        self.assertIn("latila_share_kobo", rtext)
        self.assertIn("plan-fee:report-test", rtext)
        self.assertEqual(ReportJob.objects.filter(kind="REVENUE_CSV").count(), 1)

    def test_cap_gate(self):
        driver = User.objects.create_user(
            phone="+2348033700002", password="x", role="DRIVER"
        )
        self.client.force_authenticate(user=driver)
        res = self.client.post(
            "/api/v1/reports/",
            {"kind": "IMPACT_PDF"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)
