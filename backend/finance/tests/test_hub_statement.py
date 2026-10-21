"""Hub daily statement: Lagos-day bounds, channel/account totals, cash VAT booking."""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from django.db.models import Sum
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, User
from finance.models import LedgerEntry, LedgerTransaction, Payment
from mobility.models import Hub
from operations.services.cash.deposits import CashDepositService

LAGOS = ZoneInfo("Africa/Lagos")


class HubStatementTests(TestCase):
    def setUp(self):
        self.ops = User.objects.create(
            email="ops.stmt@test.eco", role=User.Role.OPS_MANAGER, is_staff=True
        )
        self.agent = User.objects.create(phone="+2348015556601", role=User.Role.HUB_AGENT)
        owner = User.objects.create(phone="+2348015556602", role=User.Role.DRIVER)
        self.account = Account.objects.create(
            owner_user=owner, display_name="Stmt Rider", status=Account.Status.ACTIVE
        )
        self.hub = Hub.objects.create(code="HUB-STM", name="Stmt Hub", address="Lagos")
        self.other = Hub.objects.create(code="HUB-OTH", name="Other Hub", address="Lagos")

    def _payment(self, *, hub, channel, kobo, at):
        p = Payment.objects.create(
            account=self.account, hub=hub, channel=channel, amount_kobo=kobo, purpose="SWAP"
        )
        Payment.objects.filter(pk=p.pk).update(created_at=at)

    def test_cash_swap_books_vat_like_wallet(self):
        deposit = CashDepositService.record(
            agent=self.agent,
            hub=self.hub,
            account=self.account,
            amount_kobo=45_000,
            actor=self.agent,
            purpose="SWAP",
            idempotency_key="stmt-cash-1",
        )
        self.assertGreater(deposit.payment.vat_kobo, 0)
        tx = LedgerTransaction.objects.get(reference=f"CASH-{deposit.receipt_code}")
        credits = dict(
            LedgerEntry.objects.filter(transaction=tx)
            .values_list("ledger_account__code")
            .annotate(c=Sum("credit_kobo"))
        )
        self.assertEqual(credits["vat_payable"], deposit.payment.vat_kobo)
        self.assertEqual(credits["revenue:swap"] + credits["vat_payable"], 45_000)

    def test_daily_statement_uses_lagos_day_and_totals(self):
        day = datetime(2026, 10, 15, tzinfo=LAGOS)
        # 00:30 WAT on the 15th is 23:30 UTC on the 14th — must be on the 15th.
        self._payment(hub=self.hub, channel=Payment.Channel.AGENT_CASH, kobo=45_000,
                      at=day.replace(hour=0, minute=30))
        self._payment(hub=self.hub, channel=Payment.Channel.WALLET_DEBIT, kobo=40_500,
                      at=day.replace(hour=12))
        self._payment(hub=self.other, channel=Payment.Channel.AGENT_CASH, kobo=99_900,
                      at=day.replace(hour=13))
        self._payment(hub=self.hub, channel=Payment.Channel.AGENT_CASH, kobo=11_100,
                      at=datetime(2026, 10, 16, 0, 5, tzinfo=LAGOS))

        client = APIClient()
        client.force_authenticate(self.ops)
        res = client.get(
            "/api/v1/finance/payments/export/",
            {"hub": str(self.hub.id), "start_date": "2026-10-15", "end_date": "2026-10-15"},
        )
        self.assertEqual(res.status_code, 200, res.content)
        body = res.content.decode()
        self.assertEqual(body.count("HUB-STM"), 2)  # two rows for that hub/day only
        self.assertNotIn("HUB-OTH", body)
        self.assertIn("2026-10-15 00:30", body)
        self.assertIn(",855.00,", body)  # day total 450 + 405
        self.assertIn("Cash at hub,1,450.00", body)
        self.assertIn("Wallet,1,405.00", body)

    def test_stats_are_period_totals_for_filters(self):
        day = datetime(2026, 10, 15, 12, tzinfo=LAGOS)
        for kobo in (45_000, 40_500, 50_000):
            self._payment(hub=self.hub, channel=Payment.Channel.WALLET_DEBIT, kobo=kobo, at=day)
        self._payment(hub=self.other, channel=Payment.Channel.AGENT_CASH, kobo=99_900, at=day)
        client = APIClient()
        client.force_authenticate(self.ops)
        res = client.get(
            "/api/v1/finance/payments/stats/",
            {"hub": str(self.hub.id), "start_date": "2026-10-15", "end_date": "2026-10-15"},
        )
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body["success_kobo"], 135_500)
        self.assertEqual(body["success_count"], 3)
        self.assertEqual(body["by_channel"], [
            {"channel": "WALLET_DEBIT", "count": 3, "amount_kobo": 135_500}
        ])

    def test_long_open_shift_shows_in_later_range_with_live_cash(self):
        from datetime import timedelta

        from django.utils import timezone

        from operations.models import Shift

        deposit = CashDepositService.record(
            agent=self.agent, hub=self.hub, account=self.account, amount_kobo=45_000,
            actor=self.agent, purpose="SWAP", idempotency_key="stmt-shift-1",
        )
        Shift.objects.filter(pk=deposit.shift_id).update(
            opened_at=timezone.now() - timedelta(days=40)
        )
        client = APIClient()
        client.force_authenticate(self.ops)
        today = timezone.localdate()
        res = client.get(
            "/api/v1/operations/shifts/",
            {
                "hub": str(self.hub.id),
                "start_date": (today - timedelta(days=3)).isoformat(),
                "end_date": today.isoformat(),
            },
        )
        self.assertEqual(res.status_code, 200, res.content)
        rows = res.json()["results"]
        self.assertEqual(len(rows), 1)  # opened 40 days ago, still open → overlaps
        self.assertEqual(rows[0]["collected_cash_kobo"], 45_000)
        self.assertTrue(rows[0]["is_stale"])

    def test_search_matches_receipt_account_name_and_kura_id(self):
        day = datetime(2026, 10, 15, 12, tzinfo=LAGOS)
        self._payment(hub=self.hub, channel=Payment.Channel.WALLET_DEBIT, kobo=45_000, at=day)
        other_owner = User.objects.create(phone="+2348015556603", role=User.Role.DRIVER)
        other = Account.objects.create(
            owner_user=other_owner, display_name="Zed Logistics", status=Account.Status.ACTIVE
        )
        Payment.objects.create(
            account=other, hub=self.hub, channel=Payment.Channel.AGENT_CASH,
            amount_kobo=40_500, purpose="SWAP",
        )
        client = APIClient()
        client.force_authenticate(self.ops)

        def ids(term):
            res = client.get("/api/v1/finance/payments/", {"search": term})
            self.assertEqual(res.status_code, 200, res.content)
            return {row["account_name"] for row in res.json()["results"]}

        self.assertEqual(ids("zed log"), {"Zed Logistics"})
        self.assertEqual(ids(other.kura_id.lower()), {"Zed Logistics"})
        receipt = Payment.objects.get(account=self.account).receipt_code
        self.assertEqual(ids(receipt), {"Stmt Rider"})
