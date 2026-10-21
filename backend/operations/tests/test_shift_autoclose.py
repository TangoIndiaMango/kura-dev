"""Nightly auto-close of duty windows; count recorded afterwards."""
from __future__ import annotations

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from accounts.models import Account, User
from core.exceptions import DomainError
from mobility.models import Hub
from operations.models import Shift
from operations.services.cash.deposits import CashDepositService
from operations.services.shifts import ShiftService


class ShiftAutoCloseTests(TestCase):
    def setUp(self):
        self.agent = User.objects.create(phone="+2348015557701", role=User.Role.HUB_AGENT)
        self.ops = User.objects.create(
            email="ops.close@test.eco", role=User.Role.OPS_MANAGER, is_staff=True
        )
        owner = User.objects.create(phone="+2348015557702", role=User.Role.DRIVER)
        self.account = Account.objects.create(
            owner_user=owner, display_name="Close Rider", status=Account.Status.ACTIVE
        )
        self.hub = Hub.objects.create(code="HUB-ACL", name="Close Hub", address="Lagos")

    def _take(self, key, kobo=45_000):
        return CashDepositService.record(
            agent=self.agent, hub=self.hub, account=self.account, amount_kobo=kobo,
            actor=self.agent, purpose="SWAP", idempotency_key=key,
        )

    def test_old_window_auto_closes_with_expected_and_pending_count(self):
        deposit = self._take("acl-1")
        shift = Shift.objects.get(pk=deposit.shift_id)
        Shift.objects.filter(pk=shift.pk).update(opened_at=timezone.now() - timedelta(days=2))

        out = ShiftService.auto_close_stale_shifts()
        self.assertEqual(out["auto_closed"], 1)
        shift.refresh_from_db()
        self.assertEqual(shift.status, Shift.Status.CLOSED)
        self.assertTrue(shift.auto_closed)
        self.assertEqual(shift.expected_cash_kobo, shift.opening_cash_kobo + 45_000)
        self.assertIsNone(shift.closing_cash_kobo)  # never invent a count
        self.assertIsNone(shift.variance_kobo)
        # Idempotent: a second sweep touches nothing.
        self.assertEqual(ShiftService.auto_close_stale_shifts()["auto_closed"], 0)

        # Next cash take opens a fresh window for today.
        nxt = self._take("acl-2")
        self.assertNotEqual(nxt.shift_id, shift.pk)

    def test_todays_window_is_left_open(self):
        deposit = self._take("acl-today")
        self.assertEqual(ShiftService.auto_close_stale_shifts()["auto_closed"], 0)
        self.assertEqual(Shift.objects.get(pk=deposit.shift_id).status, Shift.Status.OPEN)

    def test_ops_records_count_after_auto_close(self):
        deposit = self._take("acl-count")
        shift = Shift.objects.get(pk=deposit.shift_id)
        Shift.objects.filter(pk=shift.pk).update(opened_at=timezone.now() - timedelta(days=1, hours=2))
        ShiftService.auto_close_stale_shifts()
        shift.refresh_from_db()
        closed_at = shift.closed_at

        counted = shift.expected_cash_kobo - 20_000  # ₦200 short
        ShiftService.close_shift(shift=shift, closing_cash_kobo=counted, actor=self.ops)
        shift.refresh_from_db()
        self.assertEqual(shift.closing_cash_kobo, counted)
        self.assertEqual(shift.variance_kobo, -20_000)
        self.assertEqual(shift.closed_at, closed_at)

        with self.assertRaises(DomainError):
            ShiftService.close_shift(shift=shift, closing_cash_kobo=counted, actor=self.ops)
