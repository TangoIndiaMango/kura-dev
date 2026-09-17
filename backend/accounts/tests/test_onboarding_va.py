from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import Account, User
from accounts.services.accounts import AccountService
from accounts.services.auth import issue_tokens
from finance.models import VirtualAccount, Wallet


@override_settings(DEBUG=True, PSP_ALLOW_DEV_VA=True, PAYSTACK_SECRET_KEY="")
class OnboardingVaKickoffTests(TestCase):
    def test_complete_profile_creates_wallet_and_dev_va(self):
        user = User.objects.create(
            phone="+2348015550001",
            role=User.Role.DRIVER,
            onboarding_step=User.OnboardingStep.PROFILE,
        )
        with self.captureOnCommitCallbacks(execute=True):
            account = AccountService.complete_profile(
                user=user,
                display_name="Ada Rider",
                id_number="12345678901",
            )
        self.assertEqual(account.kyc_status, Account.KycStatus.PENDING_PSP)
        self.assertTrue(Wallet.objects.filter(account=account).exists())
        va = VirtualAccount.objects.get(account=account)
        self.assertEqual(va.status, VirtualAccount.Status.ACTIVE)
        self.assertEqual(len(va.nuban or ""), 10)
        self.assertTrue((va.nuban or "").startswith("99"))

    def test_fund_requires_active_va_in_dev(self):
        user = User.objects.create(
            phone="+2348015550002",
            role=User.Role.DRIVER,
            onboarding_step=User.OnboardingStep.PROFILE,
        )
        with self.captureOnCommitCallbacks(execute=True):
            AccountService.complete_profile(user=user, display_name="Bob")
        tokens = issue_tokens(user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = client.post(
            "/api/v1/finance/wallets/fund/",
            {"amount_kobo": 5000, "channel": "CARD"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)

    @override_settings(DEBUG=False, PSP_ALLOW_DEV_VA=False)
    def test_fund_blocked_outside_debug(self):
        user = User.objects.create(
            phone="+2348015550003",
            role=User.Role.DRIVER,
        )
        Account.objects.create(owner_user=user, display_name="Prod")
        tokens = issue_tokens(user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = client.post(
            "/api/v1/finance/wallets/fund/",
            {"amount_kobo": 5000, "channel": "CARD"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_mine_does_not_create_account(self):
        user = User.objects.create(phone="+2348015550004", role=User.Role.DRIVER)
        tokens = issue_tokens(user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = client.get("/api/v1/finance/wallets/mine/")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Account.objects.filter(owner_user=user).count(), 0)
