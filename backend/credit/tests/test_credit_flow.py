"""Credit apply/disburse/repay + swap credit consume + audit."""
from __future__ import annotations

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Account
from accounts.services.auth import issue_pin_grant
from audit.models import AuditEvent
from core.models import ConfigVersion
from core.services.config import ConfigService
from credit.models import CreditApplication, Loan
from credit.services.applications import ApplicationService
from credit.services.consume import consume_swap_credit
from credit.services.loans import LoanService
from finance.models import LedgerEntry, LedgerTransaction, Payment, Wallet
from finance.services.wallets import WalletService
from mobility.models import Reservation

User = get_user_model()


class CreditFlowTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+2348011100001", password="x", first_name="A", last_name="B"
        )
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Rider A",
            kyc_status=Account.KycStatus.VERIFIED,
            status=Account.Status.ACTIVE,
            created_at=timezone.now() - timedelta(days=90),
        )
        Account.objects.filter(pk=self.account.pk).update(
            created_at=timezone.now() - timedelta(days=90)
        )
        self.account.refresh_from_db()
        self.maker = User.objects.create_user(
            phone="+2348011100002",
            password="x",
            role="COMMERCIAL_ADMIN",
            first_name="M",
            last_name="K",
        )
        self.checker = User.objects.create_user(
            phone="+2348011100003",
            password="x",
            role="COMMERCIAL_ADMIN",
            first_name="C",
            last_name="K",
        )
        pending = ConfigService.propose(
            namespace="credit",
            value={
                "enabled": True,
                "auto_approve_max_kobo": 5_000_000,
                "min_active_days": 1,
                "min_on_time_pct": 0,
                "min_trusted_device_days": 0,
                "score_threshold": 0,
            },
            actor=self.maker,
        )
        ConfigService.approve(version=pending, actor=self.checker)
        WalletService.get_or_create_wallet(self.account)
        Wallet.objects.filter(account=self.account).update(balance_kobo=10_000_000)

    def _pin(self) -> str:
        return issue_pin_grant(self.owner)["pin_grant"]

    @patch("credit.services.eligibility.EligibilityService._swap_stats")
    def test_apply_disburse_repay_and_audit(self, swap_stats):
        swap_stats.return_value = {"on_time_pct": 100, "swaps_per_week": 8.0}
        result = ApplicationService.apply(
            account=self.account,
            amount_kobo=500_000,
            tenor_days=14,
            idempotency_key="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            pin_grant=self._pin(),
            actor=self.owner,
        )
        self.assertEqual(result["status"], "DISBURSED")
        self.assertIsNotNone(result["loan_id"])
        loan = Loan.objects.get(pk=result["loan_id"])
        self.assertEqual(loan.swap_credit_remaining_kobo, 500_000)
        self.assertTrue(
            AuditEvent.objects.filter(action="credit.loan_disbursed").exists()
        )

        repaid = LoanService.repay(
            loan=loan,
            amount_kobo=50_000,
            idempotency_key="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            pin_grant=self._pin(),
            actor=self.owner,
        )
        self.assertEqual(repaid["repaid_kobo"], 50_000)
        self.assertTrue(
            AuditEvent.objects.filter(action="credit.loan_repaid").exists()
        )
        tx = LedgerTransaction.objects.filter(kind=LedgerTransaction.Kind.LOAN_REPAY).latest(
            "posted_at"
        )
        # First repay applies to interest first (5% of 500k = 25k).
        interest_credit = (
            LedgerEntry.objects.filter(
                transaction=tx, ledger_account__code="revenue:loan_interest"
            ).aggregate(s=Sum("credit_kobo"))["s"]
            or 0
        )
        self.assertGreater(interest_credit, 0)

    @patch("credit.services.eligibility.EligibilityService._swap_stats")
    def test_consume_swap_credit(self, swap_stats):
        swap_stats.return_value = {"on_time_pct": 100, "swaps_per_week": 8.0}
        ApplicationService.apply(
            account=self.account,
            amount_kobo=500_000,
            tenor_days=7,
            idempotency_key="cccccccc-cccc-cccc-cccc-cccccccccccc",
            pin_grant=self._pin(),
            actor=self.owner,
        )
        payment = consume_swap_credit(
            account=self.account,
            amount_kobo=100_000,
            reference="KB-TEST-01",
        )
        self.assertEqual(payment.channel, Payment.Channel.CREDIT)
        loan = Loan.objects.get(account=self.account)
        self.assertEqual(loan.swap_credit_remaining_kobo, 400_000)
        # Revenue + VAT recognised at the swap, owed via the loan receivable.
        tx = LedgerTransaction.objects.get(reference=f"CREDIT-{payment.receipt_code}")
        by_code = {
            e.ledger_account.code: (e.debit_kobo, e.credit_kobo)
            for e in LedgerEntry.objects.filter(transaction=tx).select_related("ledger_account")
        }
        self.assertEqual(by_code["asset:loan_receivable"], (100_000, 0))
        self.assertEqual(by_code["revenue:swap"][1] + by_code["vat_payable"][1], 100_000)
        self.assertEqual(payment.vat_kobo, by_code["vat_payable"][1])

    def test_cap_gate_on_approve(self):
        app = CreditApplication.objects.create(
            account=self.account,
            amount_kobo=500_000,
            tenor_days=7,
            interest_rate_bps=500,
            status=CreditApplication.Status.SUBMITTED,
            idempotency_key="dddddddd-dddd-dddd-dddd-dddddddddddd",
        )
        rider = APIClient()
        rider.force_authenticate(self.owner)
        res = rider.post(f"/api/v1/credit/applications/{app.id}/approve/", {}, format="json")
        self.assertIn(res.status_code, (403, 404))
