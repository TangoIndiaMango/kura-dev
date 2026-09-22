from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, User
from accounts.services.auth import issue_tokens
from core.exceptions import DomainError
from finance.models import VirtualAccount, Wallet
from finance.services import WalletService


class FinanceWalletsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create(
            email="fin-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        self.admin.set_password("adminpass123")
        self.admin.save()
        tokens = issue_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        self.owner = User.objects.create(
            phone="+2348013330001",
            role=User.Role.DRIVER,
        )
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Wallet Rider",
        )
        self.wallet = WalletService.get_or_create_wallet(self.account)

    def test_new_wallet_starts_at_zero_without_va(self):
        self.assertEqual(self.wallet.balance_kobo, 0)
        self.assertFalse(VirtualAccount.objects.filter(account=self.account).exists())

    def test_list_filter_by_account(self):
        res = self.client.get(
            "/api/v1/finance/wallets/",
            {"account": str(self.account.id)},
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["count"], 1)
        row = body["results"][0]
        self.assertEqual(row["id"], str(self.wallet.id))
        self.assertEqual(row["account_id"], str(self.account.id))
        self.assertEqual(row["balance_kobo"], 0)
        self.assertNotIn("balance_naira", row)

    def test_detail_va_null_until_psp_assign(self):
        res = self.client.get(f"/api/v1/finance/wallets/{self.wallet.id}/")
        self.assertEqual(res.status_code, 200)
        row = res.json()
        self.assertIsNone(row["virtual_account_id"])
        self.assertIsNone(row["virtual_account"])

        WalletService.assign_virtual_account(
            account=self.account,
            nuban="9910482910",
            bank_name="Wema Bank",
            account_name="KURA / Wallet Rider",
            psp_reference="DVA_test_1",
        )
        res = self.client.get(f"/api/v1/finance/wallets/{self.wallet.id}/")
        row = res.json()
        self.assertIsNotNone(row["virtual_account"])
        self.assertEqual(row["virtual_account"]["nuban"], "9910482910")
        self.assertEqual(row["virtual_account"]["status"], "ACTIVE")

    def test_assign_rejects_fake_short_nuban(self):
        with self.assertRaises(DomainError):
            WalletService.assign_virtual_account(
                account=self.account,
                nuban="123",
                bank_name="Wema Bank",
                account_name="KURA / Rider",
            )

    def test_payments_filter_by_account(self):
        WalletService.fund_wallet(
            account=self.account,
            amount_kobo=10_000,
            channel="CARD",
        )
        res = self.client.get(
            "/api/v1/finance/payments/",
            {"account": str(self.account.id)},
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertGreaterEqual(len(body["results"]), 1)
        self.assertEqual(body["results"][0]["amount_kobo"], 10_000)
        self.assertIn("hub_id", body["results"][0])
        self.assertIsNone(body["results"][0]["hub_id"])

    def test_payments_filter_by_hub_and_dates(self):
        from datetime import timedelta

        from django.utils import timezone
        from finance.models import Payment
        from mobility.models import Hub

        hub = Hub.objects.create(
            code="HUB-PAY-01",
            name="Pay Hub",
            address="Lagos",
            lat=6.4,
            lng=3.4,
            slot_count=4,
            status=Hub.Status.ONLINE,
        )
        pay = Payment.objects.create(
            account=self.account,
            channel=Payment.Channel.AGENT_CASH,
            amount_kobo=5_000,
            purpose="SWAP",
            status=Payment.Status.SUCCESS,
            hub=hub,
        )
        other = Payment.objects.create(
            account=self.account,
            channel=Payment.Channel.CARD,
            amount_kobo=7_000,
            purpose="FUND",
            status=Payment.Status.SUCCESS,
        )
        today = timezone.now().date().isoformat()
        res = self.client.get(
            "/api/v1/finance/payments/",
            {
                "hub": str(hub.id),
                "start_date": today,
                "end_date": today,
            },
        )
        self.assertEqual(res.status_code, 200)
        ids = {r["id"] for r in res.json()["results"]}
        self.assertIn(str(pay.id), ids)
        self.assertNotIn(str(other.id), ids)
        old = timezone.now().date() - timedelta(days=40)
        res_old = self.client.get(
            "/api/v1/finance/payments/",
            {
                "hub": str(hub.id),
                "start_date": old.isoformat(),
                "end_date": old.isoformat(),
            },
        )
        self.assertEqual(res_old.status_code, 200)
        self.assertEqual(len(res_old.json()["results"]), 0)

    def test_driver_only_sees_own_wallet(self):
        other = User.objects.create(phone="+2348013330002", role=User.Role.DRIVER)
        other_account = Account.objects.create(
            owner_user=other, display_name="Other"
        )
        WalletService.get_or_create_wallet(other_account)

        driver_client = APIClient()
        tokens = issue_tokens(self.owner)
        driver_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = driver_client.get("/api/v1/finance/wallets/")
        self.assertEqual(res.status_code, 200)
        ids = {r["account_id"] for r in res.json()["results"]}
        self.assertEqual(ids, {str(self.account.id)})
