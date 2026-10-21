"""F1 E1.5: NUBAN provisioning retries on a schedule, then tells ops."""
from __future__ import annotations

from datetime import timedelta
from unittest import mock

from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.models import Account, User
from core.exceptions import DomainError
from finance.models import VirtualAccount
from integrations.ports.psp import VaProvisionResult
from integrations.services.va import (
    RETRY_DELAYS,
    provision_virtual_account_for,
    retry_pending_virtual_accounts,
)
from notifications.models import Notification


class _FailingPsp:
    def provision_virtual_account(self, **kwargs):
        raise DomainError("INTEGRATION_ERROR", "Paystack unavailable")


class _PendingPsp:
    def provision_virtual_account(self, **kwargs):
        return VaProvisionResult(pending=True, psp_reference="CUS_retry")


class _AssigningPsp:
    def provision_virtual_account(self, **kwargs):
        return VaProvisionResult(
            pending=False,
            nuban="0123456789",
            bank_name="Wema Bank",
            account_name="KURA / Retry Rider",
            psp_reference="CUS_ok",
        )


@override_settings(DEBUG=False, PSP_ALLOW_DEV_VA=False)
class VirtualAccountRetryTests(TestCase):
    def setUp(self):
        user = User.objects.create(phone="+2348015558801", role=User.Role.DRIVER)
        self.account = Account.objects.create(
            owner_user=user, display_name="Retry Rider", kind=Account.Kind.INDIVIDUAL
        )
        self.ops = User.objects.create(
            email="ops.va@test.eco", role=User.Role.OPS_MANAGER, is_staff=True
        )

    def _va(self):
        return VirtualAccount.objects.get(account=self.account)

    def _make_due(self):
        VirtualAccount.objects.filter(account=self.account).update(
            next_attempt_at=timezone.now() - timedelta(seconds=1)
        )

    def test_failed_request_is_scheduled_five_minutes_out(self):
        with mock.patch("integrations.services.va.get_psp", return_value=_FailingPsp()):
            with self.assertRaises(DomainError):
                provision_virtual_account_for(self.account)
        va = self._va()
        self.assertEqual(va.status, VirtualAccount.Status.PENDING)
        self.assertEqual(va.provision_attempts, 1)
        self.assertIn("Paystack unavailable", va.last_error)
        wait = va.next_attempt_at - va.last_attempt_at
        self.assertEqual(wait, RETRY_DELAYS[0])

    def test_accepted_but_no_webhook_is_retried(self):
        with mock.patch("integrations.services.va.get_psp", return_value=_PendingPsp()):
            provision_virtual_account_for(self.account)
        va = self._va()
        self.assertEqual(va.provision_attempts, 1)
        self.assertIsNotNone(va.next_attempt_at)
        self.assertEqual(va.psp_reference, "CUS_retry")

    def test_sweep_skips_not_yet_due_and_assigns_when_psp_recovers(self):
        with mock.patch("integrations.services.va.get_psp", return_value=_FailingPsp()):
            with self.assertRaises(DomainError):
                provision_virtual_account_for(self.account)
        # Not due yet: nothing happens.
        self.assertEqual(retry_pending_virtual_accounts()["retried"], 0)

        self._make_due()
        with mock.patch("integrations.services.va.get_psp", return_value=_AssigningPsp()):
            out = retry_pending_virtual_accounts()
        self.assertEqual(out, {"retried": 1, "assigned": 1, "gave_up": 0})
        va = self._va()
        self.assertEqual(va.status, VirtualAccount.Status.ACTIVE)
        self.assertEqual(va.nuban, "0123456789")
        # Active accounts drop out of the sweep.
        self._make_due()
        self.assertEqual(retry_pending_virtual_accounts()["retried"], 0)

    def test_gives_up_after_schedule_and_notifies_ops_once(self):
        with mock.patch("integrations.services.va.get_psp", return_value=_FailingPsp()):
            with self.assertRaises(DomainError):
                provision_virtual_account_for(self.account)
            VirtualAccount.objects.filter(account=self.account).update(
                provision_attempts=len(RETRY_DELAYS)
            )
            self._make_due()
            out = retry_pending_virtual_accounts()
        self.assertEqual(out["gave_up"], 1)
        va = self._va()
        self.assertIsNone(va.next_attempt_at)
        self.assertEqual(va.provision_attempts, len(RETRY_DELAYS) + 1)
        notes = Notification.objects.filter(user=self.ops, title="Transfer account not issued")
        self.assertEqual(notes.count(), 1)
        self.assertIn(self.account.kura_id, notes.first().body)
        # Spent schedule: later sweeps leave it alone.
        self.assertEqual(retry_pending_virtual_accounts()["retried"], 0)

    def test_retry_reuses_id_number_on_file(self):
        from accounts.models import IdentityDocument
        from core.helpers.crypto import encrypt_text

        IdentityDocument.objects.create(
            account=self.account,
            doc_type=IdentityDocument.DocType.NIN,
            number_encrypted=encrypt_text("12345678901"),
            number_last4="8901",
        )
        with mock.patch("integrations.services.va.get_psp", return_value=_FailingPsp()):
            with self.assertRaises(DomainError):
                provision_virtual_account_for(self.account)
        self._make_due()
        psp = mock.Mock(wraps=_AssigningPsp())
        with mock.patch("integrations.services.va.get_psp", return_value=psp):
            retry_pending_virtual_accounts()
        self.assertEqual(
            psp.provision_virtual_account.call_args.kwargs["bvn_or_nin"], "12345678901"
        )


class _FeatureOffPsp:
    """What Paystack returns when Dedicated NUBAN is not enabled for the business."""

    def provision_virtual_account(self, **kwargs):
        raise DomainError(
            "INTEGRATION_ERROR",
            "paystack POST failed (403).",
            details={
                "body": '{"status":false,"message":"Dedicated NUBAN is not available '
                'for your business","type":"api_error","code":"feature_unavailable"}'
            },
            http=502,
        )


@override_settings(DEBUG=False, PSP_ALLOW_DEV_VA=False)
class PspAccountProblemTests(TestCase):
    def setUp(self):
        self.ops = User.objects.create(
            email="ops.psp@test.eco", role=User.Role.OPS_MANAGER, is_staff=True
        )

    def _rider(self, n):
        user = User.objects.create(phone=f"+234801555890{n}", role=User.Role.DRIVER)
        return Account.objects.create(
            owner_user=user, display_name=f"Rider {n}", kind=Account.Kind.INDIVIDUAL
        )

    def test_reason_is_stored_and_ops_told_once_for_all_riders(self):
        with mock.patch("integrations.services.va.get_psp", return_value=_FeatureOffPsp()):
            for n in (1, 2, 3):
                with self.assertRaises(DomainError):
                    provision_virtual_account_for(self._rider(n))
        va = VirtualAccount.objects.first()
        self.assertEqual(
            va.last_error,
            "Dedicated NUBAN is not available for your business [feature_unavailable]",
        )
        self.assertIsNotNone(va.next_attempt_at)  # still retried once fixed
        alerts = Notification.objects.filter(
            user=self.ops, title="Paystack cannot issue transfer accounts"
        )
        self.assertEqual(alerts.count(), 1)
        self.assertIn("Dedicated NUBAN is not available", alerts.first().body)

    def test_sweep_stops_when_psp_rate_limits(self):
        class _RateLimited:
            calls = 0

            def provision_virtual_account(self, **kwargs):
                type(self).calls += 1
                raise DomainError(
                    "INTEGRATION_ERROR",
                    "paystack POST failed (429).",
                    details={"body": '{"message":"Rate limit exceeded!","code":"rate_limited"}'},
                )

        for n in (4, 5, 6):
            acct = self._rider(n)
            VirtualAccount.objects.create(
                account=acct, next_attempt_at=timezone.now() - timedelta(seconds=1)
            )
        with mock.patch("integrations.services.va.get_psp", return_value=_RateLimited()):
            out = retry_pending_virtual_accounts()
        self.assertEqual(_RateLimited.calls, 1)
        self.assertEqual(out["retried"], 1)
        # The others are still due for the next sweep.
        self.assertEqual(
            VirtualAccount.objects.filter(next_attempt_at__lte=timezone.now()).count(), 2
        )
