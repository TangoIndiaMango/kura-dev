from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, User
from accounts.services.auth import issue_tokens
from core.models import MediaAsset
from finance.models import Payment
from support.models import CaseEvent, SupportCase
from support.services import SupportCaseService


class SupportCaseApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create(
            email="cases-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        tokens = issue_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.owner = User.objects.create(phone="+2348019990001", role=User.Role.DRIVER)
        self.account = Account.objects.create(
            owner_user=self.owner, display_name="Case Rider"
        )

    def _asset(self, *, user, key: str) -> MediaAsset:
        return MediaAsset.objects.create(
            provider=MediaAsset.Provider.CLOUDINARY,
            storage_key=key,
            kind="support",
            content_type="image/jpeg",
            resource_type="image",
            original_filename="evidence.jpg",
            uploaded_by=user,
        )

    def test_open_and_filter_by_account(self):
        case = SupportCaseService.open_case(
            account=self.account,
            subject="Wallet dispute",
            kind=SupportCase.Kind.PAYMENT_DISPUTE,
            opened_by=self.admin,
            body="Customer says transfer missing.",
        )
        res = self.client.get(
            "/api/v1/support/cases/",
            {"account": str(self.account.id)},
        )
        self.assertEqual(res.status_code, 200)
        rows = res.json()["results"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["id"], str(case.id))
        self.assertEqual(rows[0]["code"], case.code)

    def test_create_with_assignee(self):
        assignee = User.objects.create(
            email="assignee@test.eco",
            role=User.Role.OPS_MANAGER,
            is_staff=True,
        )
        res = self.client.post(
            "/api/v1/support/cases/",
            {
                "account_id": str(self.account.id),
                "subject": "Bay identity follow-up",
                "kind": "IDENTITY",
                "priority": "HIGH",
                "body": "Mismatch at bay 2",
                "assigned_to_id": str(assignee.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["account_id"], str(self.account.id))
        self.assertEqual(body["assigned_to_id"], str(assignee.id))
        self.assertEqual(body["account_display_name"], "Case Rider")
        self.assertTrue(body["assigned_to_name"])

        case_id = body["id"]
        res = self.client.post(
            f"/api/v1/support/cases/{case_id}/assign/",
            {"assigned_to_id": None},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIsNone(res.json()["assigned_to_id"])
        self.assertIsNotNone(body.get("sla_due_at"))

    def test_rider_opens_own_case(self):
        tokens = issue_tokens(self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = self.client.post(
            "/api/v1/support/cases/",
            {
                "subject": "Swap bay charged wrong plate",
                "kind": "GENERAL",
                "body": "Agent scanned another bike.",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["account_id"], str(self.account.id))
        self.assertEqual(body["subject"], "Swap bay charged wrong plate")
        list_res = self.client.get("/api/v1/support/cases/")
        self.assertEqual(list_res.status_code, 200, list_res.content)
        self.assertEqual(len(list_res.json()["results"]), 1)

    def test_rider_opens_with_payment_and_attachment(self):
        payment = Payment.objects.create(
            account=self.account,
            channel=Payment.Channel.NUBAN_TRANSFER,
            amount_kobo=10_000_00,
            purpose="FUND",
        )
        asset = self._asset(user=self.owner, key="support/own-1")
        tokens = issue_tokens(self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = self.client.post(
            "/api/v1/support/cases/",
            {
                "subject": "Missing wallet credit",
                "kind": "PAYMENT_DISPUTE",
                "priority": "HIGH",
                "body": "Transfer not reflected.",
                "payment_id": str(payment.id),
                "attachment_asset_id": str(asset.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["payment_id"], str(payment.id))
        events = body["events"]
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["attachment_id"], str(asset.id))
        self.assertEqual(events[0]["kind"], "NOTE")

    def test_attachment_idor_rejected(self):
        other = User.objects.create(phone="+2348019990002", role=User.Role.DRIVER)
        stolen = self._asset(user=other, key="support/stolen-1")
        tokens = issue_tokens(self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = self.client.post(
            "/api/v1/support/cases/",
            {
                "subject": "Should fail attach",
                "kind": "GENERAL",
                "attachment_asset_id": str(stolen.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, 403, res.content)

    def test_payment_other_account_rejected(self):
        other_owner = User.objects.create(phone="+2348019990003", role=User.Role.DRIVER)
        other_account = Account.objects.create(
            owner_user=other_owner, display_name="Other"
        )
        payment = Payment.objects.create(
            account=other_account,
            channel=Payment.Channel.WALLET_DEBIT,
            amount_kobo=500_00,
            purpose="SWAP",
        )
        tokens = issue_tokens(self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = self.client.post(
            "/api/v1/support/cases/",
            {
                "subject": "Wrong payment link",
                "kind": "PAYMENT_DISPUTE",
                "payment_id": str(payment.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, 403, res.content)

    def test_photo_only_note(self):
        case = SupportCaseService.open_case(
            account=self.account,
            subject="Need more evidence",
            opened_by=self.admin,
            body="Please send bay photo.",
        )
        asset = self._asset(user=self.owner, key="support/note-1")
        tokens = issue_tokens(self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = self.client.post(
            f"/api/v1/support/cases/{case.id}/notes/",
            {"attachment_asset_id": str(asset.id)},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        events = res.json()["events"]
        attach = [e for e in events if e["kind"] == "ATTACHMENT"]
        self.assertEqual(len(attach), 1)
        self.assertEqual(attach[0]["attachment_id"], str(asset.id))
        self.assertTrue(
            CaseEvent.objects.filter(
                case=case, kind=CaseEvent.Kind.ATTACHMENT, attachment=asset
            ).exists()
        )

    def test_stats_queue_and_period(self):
        SupportCaseService.open_case(
            account=self.account,
            subject="Wallet dispute",
            kind=SupportCase.Kind.PAYMENT_DISPUTE,
            priority=SupportCase.Priority.HIGH,
            opened_by=self.admin,
        )
        SupportCaseService.open_case(
            account=self.account,
            subject="General help",
            kind=SupportCase.Kind.GENERAL,
            opened_by=self.admin,
        )
        res = self.client.get("/api/v1/support/cases/stats/")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        self.assertEqual(data["queue"]["open"], 2)
        self.assertEqual(data["queue"]["unassigned"], 2)
        self.assertEqual(data["queue"]["disputes"], 1)
        self.assertEqual(data["queue"]["high_priority"], 1)
        self.assertEqual(data["period"]["opened"], 2)
        kinds = {row["kind"]: row["count"] for row in data["period"]["by_kind"]}
        self.assertEqual(kinds["PAYMENT_DISPUTE"], 1)
        self.assertEqual(kinds["GENERAL"], 1)

    def test_export_csv(self):
        SupportCaseService.open_case(
            account=self.account,
            subject="Export me",
            kind=SupportCase.Kind.GENERAL,
            opened_by=self.admin,
        )
        res = self.client.get("/api/v1/support/cases/export/", {"export": "csv"})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIn("text/csv", res["Content-Type"])
        body = res.content.decode()
        self.assertIn("code", body.splitlines()[0])
        self.assertIn("Export me", body)

    def test_export_pdf(self):
        SupportCaseService.open_case(
            account=self.account,
            subject="PDF row",
            opened_by=self.admin,
        )
        res = self.client.get("/api/v1/support/cases/export/", {"export": "pdf"})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIn("application/pdf", res["Content-Type"])
        self.assertTrue(res.content.startswith(b"%PDF"))
