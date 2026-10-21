"""Admin on-behalf operator registration (POST /accounts/register/)."""
from __future__ import annotations

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, User
from audit.models import AuditEvent
from finance.models import Wallet


class OperatorRegistrationTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone="+2348035500001",
            password="x",
            role=User.Role.SUPER_ADMIN,
            first_name="Ada",
            last_name="Admin",
            is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_register_creates_operator_account_wallet_and_audit(self):
        res = self.client.post(
            "/api/v1/accounts/register/",
            {
                "full_name": "New Rider",
                "phone": "08035551122",
                "email": "new.rider@example.com",
                "id_type": "NIN",
                "id_number": "12345678901",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertTrue(body["invite_email_sent"])
        self.assertTrue(body["kura_id"])

        account = Account.objects.get(pk=body["id"])
        self.assertEqual(account.display_name, "New Rider")
        self.assertEqual(account.owner_user.phone, "+2348035551122")
        self.assertEqual(account.owner_user.role, User.Role.DRIVER)
        self.assertFalse(account.owner_user.has_usable_password())
        self.assertTrue(Wallet.objects.filter(account=account).exists())
        self.assertTrue(
            AuditEvent.objects.filter(
                action="account.registered", subject_id=str(account.id)
            ).exists()
        )

    def test_duplicate_phone_rejected(self):
        User.objects.create(
            phone="+2348035551122", role=User.Role.DRIVER, first_name="Old"
        )
        res = self.client.post(
            "/api/v1/accounts/register/",
            {
                "full_name": "Copy Cat",
                "phone": "08035551122",
                "email": "copy@example.com",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 409, res.content)

    def test_admin_can_submit_identity_photos_on_behalf(self):
        from accounts.models import IdentityDocument
        from core.models import MediaAsset

        res = self.client.post(
            "/api/v1/accounts/register/",
            {
                "full_name": "Photo Rider",
                "phone": "08035553344",
                "email": "photo.rider@example.com",
                "id_type": "NIN",
                "id_number": "12345678901",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        account_id = res.json()["id"]

        def asset(key: str) -> MediaAsset:
            return MediaAsset.objects.create(
                provider=MediaAsset.Provider.CLOUDINARY,
                storage_key=key,
                content_type="image/jpeg",
                resource_type="image",
                uploaded_by=self.admin,
            )

        submit = self.client.post(
            f"/api/v1/accounts/{account_id}/kyc/submit/",
            {
                "display_name": "Photo Rider",
                "id_type": "NIN",
                "id_number": "12345678901",
                "face_asset_id": str(asset("uploads/face/pr1").id),
                "id_front_asset_id": str(asset("uploads/identity/prf").id),
                "id_back_asset_id": str(asset("uploads/identity/prb").id),
            },
            format="json",
        )
        self.assertEqual(submit.status_code, 201, submit.content)
        account = Account.objects.get(pk=account_id)
        self.assertEqual(account.kyc_status, Account.KycStatus.PENDING)
        self.assertTrue(
            IdentityDocument.objects.filter(account=account).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                action="kyc.submitted_by_admin", subject_id=str(account.id)
            ).exists()
        )

    def test_non_staff_cannot_register_operators(self):
        rider = User.objects.create(phone="+2348035551999", role=User.Role.DRIVER)
        self.client.force_authenticate(user=rider)
        res = self.client.post(
            "/api/v1/accounts/register/",
            {
                "full_name": "Nope Rider",
                "phone": "08035552233",
                "email": "nope@example.com",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 403, res.content)
