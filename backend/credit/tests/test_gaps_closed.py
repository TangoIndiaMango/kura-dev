"""Device trust, bustout close, segment assign, loan list/detail."""
from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from accounts.models import Account, TrustedDevice
from accounts.services.devices import DeviceTrustService, hash_device_key
from core.services.config import ConfigService
from credit.models import CreditApplication, CreditLine, Loan, ProductOffer
from credit.services.bustout import close_credit_line_for_bustout
from credit.services.eligibility import EligibilityService
from credit.services.loans import LoanService
from credit.services.offers import OfferService
from credit.services.segments import resolve_account_ids_for_segment

User = get_user_model()


class DeviceTrustTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            phone="+2348022200001", password="x", first_name="D", last_name="T"
        )
        self.account = Account.objects.create(
            owner_user=self.user,
            display_name="Device Rider",
            kyc_status=Account.KycStatus.VERIFIED,
            status=Account.Status.ACTIVE,
        )

    def test_heartbeat_and_eligibility_days(self):
        device = "11111111-1111-4111-8111-111111111111"
        DeviceTrustService.heartbeat(account=self.account, device_id=device)
        row = TrustedDevice.objects.get(
            account=self.account, device_key=hash_device_key(device)
        )
        TrustedDevice.objects.filter(pk=row.pk).update(
            first_seen_at=timezone.now() - timedelta(days=10)
        )
        self.assertEqual(DeviceTrustService.max_trusted_days(account=self.account), 10)
        elig = EligibilityService.evaluate(account=self.account, device_id=device)
        self.assertEqual(elig.progress["trusted_device_days"], 10)
        self.assertEqual(elig.progress["this_browser_days"], 10)
        self.assertIn("browser", elig.progress["device_trust_note"].lower())


class SegmentAssignTests(TestCase):
    def setUp(self):
        self.ops = User.objects.create_user(
            phone="+2348022200002",
            password="x",
            role="COMMERCIAL_ADMIN",
            first_name="O",
            last_name="P",
        )
        self.owner = User.objects.create_user(
            phone="+2348022200003", password="x", first_name="A", last_name="B"
        )
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Seg Rider",
            kyc_status=Account.KycStatus.VERIFIED,
            status=Account.Status.ACTIVE,
            kind=Account.Kind.INDIVIDUAL,
        )
        Account.objects.filter(pk=self.account.pk).update(
            created_at=timezone.now() - timedelta(days=90)
        )
        pending = ConfigService.propose(
            namespace="offers", value={"enabled": True}, actor=self.ops
        )
        checker = User.objects.create_user(
            phone="+2348022200004",
            password="x",
            role="COMMERCIAL_ADMIN",
            first_name="C",
            last_name="K",
        )
        ConfigService.approve(version=pending, actor=checker)

    def test_resolve_and_assign_by_criteria(self):
        ids = resolve_account_ids_for_segment(
            segment_criteria={
                "status": "ACTIVE",
                "kyc_status": "VERIFIED",
                "min_active_days": 30,
            }
        )
        self.assertIn(self.account.id, ids)
        offer = OfferService.create_offer(
            name="Tier 1",
            offer_type=ProductOffer.Type.CREDIT,
            status=ProductOffer.Status.ACTIVE,
            segment_criteria={"kyc_status": "VERIFIED"},
            actor=self.ops,
        )
        rows = OfferService.assign(
            offer=offer,
            segment_criteria={"status": "ACTIVE", "kyc_status": "VERIFIED"},
            actor=self.ops,
        )
        self.assertGreaterEqual(len(rows), 1)


class BustoutAndLoanPayloadTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+2348022200005", password="x", first_name="B", last_name="O"
        )
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Bust Rider",
            status=Account.Status.ACTIVE,
            kyc_status=Account.KycStatus.VERIFIED,
        )

    def _loan(self) -> Loan:
        app = CreditApplication.objects.create(
            account=self.account,
            amount_kobo=500_000,
            tenor_days=7,
            interest_rate_bps=500,
            status=CreditApplication.Status.DISBURSED,
            idempotency_key="eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
        )
        now = timezone.now()
        return Loan.objects.create(
            application=app,
            account=self.account,
            principal_kobo=500_000,
            interest_kobo=25_000,
            total_due_kobo=525_000,
            repaid_kobo=0,
            daily_installment_kobo=75_000,
            swap_credit_remaining_kobo=500_000,
            starts_at=now,
            due_at=now + timedelta(days=7),
            status=Loan.Status.ACTIVE,
        )

    def test_loan_list_omits_schedule(self):
        loan = self._loan()
        listing = LoanService.loan_list_payload(loan)
        detail = LoanService.loan_payload(loan)
        self.assertNotIn("schedule", listing)
        self.assertIn("schedule", detail)
        self.assertEqual(len(detail["schedule"]), 7)

    def test_bustout_closes_line(self):
        loan = self._loan()
        CreditLine.objects.create(
            account=self.account,
            limit_kobo=500_000,
            status=CreditLine.Status.ACTIVE,
        )
        closed = close_credit_line_for_bustout(
            account=self.account,
            loan=loan,
            context={"today_swaps": 6, "baseline_avg": 1.0},
        )
        self.assertTrue(closed)
        loan.refresh_from_db()
        self.assertEqual(loan.status, Loan.Status.RESTRICTED)
        self.assertEqual(loan.swap_credit_remaining_kobo, 0)
        line = CreditLine.objects.get(account=self.account)
        self.assertEqual(line.status, CreditLine.Status.CLOSED)
