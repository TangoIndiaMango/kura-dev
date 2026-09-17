"""Cash deposit + shift close tests."""
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, StaffMembership, User
from accounts.services.auth import issue_tokens
from accounts.services.roles import RoleService
from audit.models import AuditEvent
from mobility.models import Hub
from operations.models import CashDeposit, Shift
from operations.services.cash.deposits import CashDepositService
from operations.services.shifts import ShiftService


class CashShiftApiTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        self.client = APIClient()
        self.agent = User.objects.create(
            email="agent.cash@test.eco",
            role=User.Role.HUB_AGENT,
            is_staff=True,
            first_name="Agent",
        )
        self.agent.set_password("agentpass123")
        self.agent.save()
        tokens = issue_tokens(self.agent)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.hub = Hub.objects.create(
            code="HUB-CASH-01",
            name="Cash Test Hub",
            address="Lagos",
            lat=6.5,
            lng=3.3,
            slot_count=4,
            status=Hub.Status.ONLINE,
        )
        StaffMembership.objects.create(
            user=self.agent,
            role=User.Role.HUB_AGENT,
            hub_id=str(self.hub.id),
        )
        owner = User.objects.create(phone="+2348010000099", role=User.Role.DRIVER)
        self.account = Account.objects.create(
            owner_user=owner,
            kura_id="KR-CASH01",
            display_name="Cash Rider",
            status=Account.Status.ACTIVE,
            kyc_status=Account.KycStatus.VERIFIED,
        )

    def test_open_record_close_with_audit(self):
        shift = ShiftService.open_shift(
            agent=self.agent, hub=self.hub, opening_cash_kobo=100_000, actor=self.agent
        )
        deposit = CashDepositService.record(
            agent=self.agent,
            hub=self.hub,
            account=self.account,
            amount_kobo=50_000,
            actor=self.agent,
        )
        self.assertEqual(deposit.status, CashDeposit.Status.SUCCESS)
        closed = ShiftService.close_shift(
            shift=shift, closing_cash_kobo=140_000, actor=self.agent
        )
        self.assertEqual(closed.status, Shift.Status.CLOSED)
        self.assertEqual(closed.expected_cash_kobo, 150_000)
        self.assertEqual(closed.variance_kobo, -10_000)
        self.assertTrue(
            AuditEvent.objects.filter(action="cash_deposit.recorded").exists()
        )
        self.assertTrue(AuditEvent.objects.filter(action="shift.closed").exists())

    def test_cash_deposit_api_auto_opens_shift(self):
        self.assertFalse(
            Shift.objects.filter(
                agent=self.agent, hub=self.hub, status=Shift.Status.OPEN
            ).exists()
        )
        res = self.client.post(
            "/api/v1/operations/cash-deposits/",
            {
                "account_id": str(self.account.id),
                "hub_id": str(self.hub.id),
                "amount_kobo": 20_000,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["amount_kobo"], 20_000)
        self.assertTrue(
            Shift.objects.filter(
                agent=self.agent, hub=self.hub, status=Shift.Status.OPEN
            ).exists()
        )

        self.assertTrue(AuditEvent.objects.filter(action="shift.opened").exists())

        res2 = self.client.post(
            "/api/v1/operations/cash-deposits/",
            {
                "account_id": str(self.account.id),
                "hub_id": str(self.hub.id),
                "amount_kobo": 15_000,
            },
            format="json",
        )
        self.assertEqual(res2.status_code, 201)
        self.assertEqual(
            Shift.objects.filter(
                agent=self.agent, hub=self.hub, status=Shift.Status.OPEN
            ).count(),
            1,
        )

    def test_cash_deposit_rejects_unassigned_hub(self):
        other_hub = Hub.objects.create(
            code="HUB-CASH-02",
            name="Other Cash Hub",
            address="Lagos",
        )
        response = self.client.post(
            "/api/v1/operations/cash-deposits/",
            {
                "account_id": str(self.account.id),
                "hub_id": str(other_hub.id),
                "amount_kobo": 20_000,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_idempotent_deposit_and_float_ledger(self):
        ShiftService.open_shift(
            agent=self.agent, hub=self.hub, opening_cash_kobo=0, actor=self.agent
        )
        d1 = CashDepositService.record(
            agent=self.agent,
            hub=self.hub,
            account=self.account,
            amount_kobo=10_000,
            actor=self.agent,
            idempotency_key="cash-test-1",
        )
        d2 = CashDepositService.record(
            agent=self.agent,
            hub=self.hub,
            account=self.account,
            amount_kobo=10_000,
            actor=self.agent,
            idempotency_key="cash-test-1",
        )
        self.assertEqual(d1.id, d2.id)
        self.assertEqual(
            CashDeposit.objects.filter(idempotency_key="cash-test-1").count(), 1
        )
        from finance.models import LedgerAccount

        float_acct = LedgerAccount.objects.get(code=f"cash_float:{self.agent.id}")
        self.assertEqual(float_acct.balance_kobo, 10_000)

    def test_float_limit_blocks(self):
        from django.test import override_settings

        ShiftService.open_shift(
            agent=self.agent, hub=self.hub, opening_cash_kobo=0, actor=self.agent
        )
        with override_settings(CASH_FLOAT_LIMIT_KOBO=5_000):
            with self.assertRaises(Exception) as ctx:
                CashDepositService.record(
                    agent=self.agent,
                    hub=self.hub,
                    account=self.account,
                    amount_kobo=6_000,
                    actor=self.agent,
                )
            self.assertIn("CASH_FLOAT", str(ctx.exception.code))

    def test_fund_purpose_credits_wallet(self):
        from finance.models import Wallet
        from finance.services.wallets import WalletService

        ShiftService.open_shift(
            agent=self.agent, hub=self.hub, opening_cash_kobo=0, actor=self.agent
        )
        WalletService.get_or_create_wallet(self.account)
        before = Wallet.objects.get(account=self.account).balance_kobo
        CashDepositService.record(
            agent=self.agent,
            hub=self.hub,
            account=self.account,
            amount_kobo=25_000,
            actor=self.agent,
            purpose="FUND",
            idempotency_key="fund-1",
        )
        wallet = Wallet.objects.get(account=self.account)
        self.assertEqual(wallet.balance_kobo, before + 25_000)

    def test_lodge_clears_float_and_audit(self):
        from finance.models import LedgerAccount
        from operations.models import Alert
        from operations.services.cash.settlement import CashSettlementService

        shift = ShiftService.open_shift(
            agent=self.agent, hub=self.hub, opening_cash_kobo=0, actor=self.agent
        )
        CashDepositService.record(
            agent=self.agent,
            hub=self.hub,
            account=self.account,
            amount_kobo=40_000,
            actor=self.agent,
            idempotency_key="lodge-dep-1",
        )
        closed = ShiftService.close_shift(
            shift=shift, closing_cash_kobo=40_000, actor=self.agent
        )
        lodged = CashSettlementService.confirm_lodge(
            shift=closed,
            lodge_ref="SLIP-99",
            actor=self.agent,
        )
        self.assertIsNotNone(lodged.lodged_at)
        self.assertEqual(lodged.lodged_amount_kobo, 40_000)
        float_acct = LedgerAccount.objects.get(code=f"cash_float:{self.agent.id}")
        self.assertEqual(float_acct.balance_kobo, 0)
        psp = LedgerAccount.objects.get(code="psp_clearing")
        self.assertGreaterEqual(psp.balance_kobo, 40_000)
        self.assertTrue(AuditEvent.objects.filter(action="shift.cash_lodged").exists())

        again = CashSettlementService.confirm_lodge(
            shift=lodged, lodge_ref="SLIP-99", actor=self.agent
        )
        self.assertEqual(again.id, lodged.id)

        mismatch = ShiftService.open_shift(
            agent=self.agent, hub=self.hub, opening_cash_kobo=0, actor=self.agent
        )
        CashDepositService.record(
            agent=self.agent,
            hub=self.hub,
            account=self.account,
            amount_kobo=30_000,
            actor=self.agent,
            idempotency_key="lodge-dep-2",
        )
        closed2 = ShiftService.close_shift(
            shift=mismatch, closing_cash_kobo=30_000, actor=self.agent
        )
        CashSettlementService.confirm_lodge(
            shift=closed2,
            lodge_ref="SLIP-MIS",
            amount_kobo=10_000,
            actor=self.agent,
        )
        self.assertTrue(
            Alert.objects.filter(kind=Alert.Kind.SETTLEMENT_MISMATCH).exists()
        )

    def test_close_variance_opens_alert(self):
        from operations.models import Alert

        shift = ShiftService.open_shift(
            agent=self.agent, hub=self.hub, opening_cash_kobo=100_000, actor=self.agent
        )
        ShiftService.close_shift(
            shift=shift, closing_cash_kobo=80_000, actor=self.agent
        )
        self.assertTrue(
            Alert.objects.filter(kind=Alert.Kind.SHIFT_CASH_VARIANCE).exists()
        )
