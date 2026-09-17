"""Cash receipt PDF + HMAC + email notify tests."""
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import Account, User
from accounts.services.auth import issue_tokens
from accounts.services.roles import RoleService
from finance.services.receipts import (
    build_cash_receipt_document,
    render_receipt_pdf,
    verify_receipt_seal,
)
from mobility.models import Hub
from operations.models import CashDeposit
from operations.services.cash.deposits import CashDepositService
from operations.services.shifts import ShiftService
from support.models import SupportCase


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    TASKS={"default": {"BACKEND": "django.tasks.backends.immediate.ImmediateBackend"}},
)
class CashReceiptTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        self.agent = User.objects.create(
            email="agent.rcpt@test.eco",
            role=User.Role.HUB_AGENT,
            is_staff=True,
            first_name="Agent",
        )
        self.agent.set_password("agentpass123")
        self.agent.save()
        self.driver = User.objects.create(
            phone="+2348010000088",
            email="rider.rcpt@test.eco",
            role=User.Role.DRIVER,
            first_name="Rider",
        )
        self.account = Account.objects.create(
            owner_user=self.driver,
            kura_id="KR-RCPT01",
            display_name="Receipt Rider",
            status=Account.Status.ACTIVE,
            kyc_status=Account.KycStatus.VERIFIED,
        )
        self.hub = Hub.objects.create(
            code="HUB-RCPT-01",
            name="Receipt Hub",
            address="Lagos",
            lat=6.5,
            lng=3.3,
            slot_count=4,
            status=Hub.Status.ONLINE,
        )
        ShiftService.open_shift(
            agent=self.agent, hub=self.hub, opening_cash_kobo=0, actor=self.agent
        )
        tokens = issue_tokens(self.agent)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_signed_pdf_and_email(self):
        with self.captureOnCommitCallbacks(execute=True):
            deposit = CashDepositService.record(
                agent=self.agent,
                hub=self.hub,
                account=self.account,
                amount_kobo=150_000,
                actor=self.agent,
                purpose="SWAP",
                idempotency_key="rcpt-1",
            )
        doc = build_cash_receipt_document(deposit=deposit)
        self.assertTrue(verify_receipt_seal(doc))
        self.assertEqual(doc["operator_name"], "Rider")
        self.assertEqual(doc["agent_name"], "Agent")
        self.assertIn("integrity_hash", doc)
        pdf = render_receipt_pdf(doc)
        self.assertTrue(pdf.startswith(b"%PDF"))
        self.assertGreaterEqual(len(mail.outbox), 1)
        self.assertIn(deposit.receipt_code, mail.outbox[0].subject)
        self.assertNotIn("SMS", mail.outbox[0].body)
        self.assertTrue(mail.outbox[0].attachments)

    def test_flag_opens_dispute(self):
        deposit = CashDepositService.record(
            agent=self.agent,
            hub=self.hub,
            account=self.account,
            amount_kobo=50_000,
            actor=self.agent,
            idempotency_key="rcpt-flag",
        )
        rider_tokens = issue_tokens(self.driver)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {rider_tokens['access']}"
        )
        res = self.client.post(
            f"/api/v1/operations/cash-deposits/{deposit.id}/flag/",
            {
                "note": "I paid 2000 naira but receipt shows less",
                "claimed_amount_kobo": 200_000,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(
            SupportCase.objects.filter(
                kind=SupportCase.Kind.PAYMENT_DISPUTE,
                account=self.account,
            ).exists()
        )
        pdf_res = self.client.get(
            f"/api/v1/operations/cash-deposits/{deposit.id}/receipt/?as=pdf"
        )
        self.assertEqual(pdf_res.status_code, 200)
        self.assertEqual(pdf_res["Content-Type"], "application/pdf")
