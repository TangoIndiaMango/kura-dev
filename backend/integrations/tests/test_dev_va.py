from django.test import TestCase, override_settings

from accounts.models import Account, User
from finance.models import VirtualAccount
from integrations.services.va import attach_dev_virtual_account, provision_virtual_account_for


@override_settings(DEBUG=True, PSP_ALLOW_DEV_VA=True)
class DevVirtualAccountTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="deva@kura.test",
            phone="+2348099990001",
            password="x",
            role=User.Role.DRIVER,
        )
        self.account = Account.objects.create(
            owner_user=self.user,
            display_name="Dev Rider",
            kind=Account.Kind.INDIVIDUAL,
            kyc_status=Account.KycStatus.PENDING_PSP,
        )

    def test_attach_dev_va_activates_nuban(self):
        va = attach_dev_virtual_account(
            self.account, psp_code="PAYSTACK", reason="unit"
        )
        self.assertEqual(va.status, VirtualAccount.Status.ACTIVE)
        self.assertEqual(len(va.nuban or ""), 10)
        self.account.refresh_from_db()
        self.assertEqual(self.account.kyc_status, Account.KycStatus.PENDING_PSP)

    @override_settings(DEBUG=False, PSP_ALLOW_DEV_VA=True)
    def test_dev_va_blocked_when_not_debug(self):
        from core.exceptions import DomainError

        with self.assertRaises(DomainError):
            attach_dev_virtual_account(
                self.account, psp_code="PAYSTACK", reason="nope"
            )

    @override_settings(
        DEBUG=True,
        PSP_ALLOW_DEV_VA=True,
        PAYSTACK_SECRET_KEY="",
        DEFAULT_PSP="PAYSTACK",
    )
    def test_provision_falls_back_to_dev_va(self):
        va = provision_virtual_account_for(self.account)
        self.assertEqual(va.status, VirtualAccount.Status.ACTIVE)
        self.assertTrue((va.nuban or "").startswith("99"))
