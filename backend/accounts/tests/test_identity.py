from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import Account, Driver, IdentityDocument, User
from accounts.services.auth import issue_tokens
from accounts.services.identity import IdentityService
from core.models import MediaAsset


@override_settings(FIELD_ENCRYPTION_KEY="test-identity-key")
class IdentitySubmitTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(
            phone="+2348099001122",
            role=User.Role.DRIVER,
            first_name="Ibrahim",
            last_name="Musa",
            onboarding_step=User.OnboardingStep.PROFILE,
        )
        self.account = Account.objects.create(
            owner_user=self.user,
            display_name="Ibrahim Musa",
            kyc_status=Account.KycStatus.NONE,
        )
        Driver.objects.create(user=self.user, account=self.account)
        tokens = issue_tokens(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def _asset(self, key: str, *, user=None) -> MediaAsset:
        return MediaAsset.objects.create(
            provider=MediaAsset.Provider.CLOUDINARY,
            storage_key=key,
            content_type="image/jpeg",
            resource_type="image",
            uploaded_by=user or self.user,
        )

    @patch("accounts.helpers.kyc.delivery_url", return_value="https://cdn.example/face.jpg")
    def test_submit_identity(self, _mock_url):
        face = self._asset("uploads/face/abc")
        front = self._asset("uploads/identity/front1")
        back = self._asset("uploads/identity/back1")
        res = self.client.post(
            "/api/v1/accounts/identity/",
            {
                "display_name": "Ibrahim Musa",
                "id_type": "NIN",
                "id_number": "12345678901",
                "face_asset_id": str(face.id),
                "id_front_asset_id": str(front.id),
                "id_back_asset_id": str(back.id),
                "consent_service": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertEqual(body["status"], "PENDING")
        self.assertEqual(body["id_last4"], "8901")
        self.assertEqual(body["face_asset_id"], str(face.id))
        self.assertEqual(body["photo_url"], "https://cdn.example/face.jpg")

        self.account.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(self.account.kyc_status, Account.KycStatus.PENDING)
        self.assertEqual(self.user.onboarding_step, User.OnboardingStep.DONE)
        doc = IdentityDocument.objects.get(account=self.account)
        self.assertEqual(doc.number_last4, "8901")
        self.assertTrue(doc.number_encrypted)
        self.assertEqual(doc.front_image_id, front.id)
        self.assertEqual(doc.back_image_id, back.id)

    def test_submit_requires_face(self):
        front = self._asset("uploads/identity/front-req")
        back = self._asset("uploads/identity/back-req")
        res = self.client.post(
            "/api/v1/accounts/identity/",
            {
                "id_type": "NIN",
                "id_number": "12345678901",
                "id_front_asset_id": str(front.id),
                "id_back_asset_id": str(back.id),
                "consent_service": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"]["code"], "VALIDATION_ERROR")

    def test_submit_requires_id_card_photos(self):
        face = self._asset("uploads/face/need-cards")
        res = self.client.post(
            "/api/v1/accounts/identity/",
            {
                "id_type": "NIN",
                "id_number": "12345678901",
                "face_asset_id": str(face.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"]["code"], "VALIDATION_ERROR")

    def test_cannot_attach_others_asset(self):
        other = User.objects.create(phone="+2348099009999", role=User.Role.DRIVER)
        stolen = self._asset("uploads/face/stolen", user=other)
        front = self._asset("uploads/identity/front-steal")
        back = self._asset("uploads/identity/back-steal")
        res = self.client.post(
            "/api/v1/accounts/identity/",
            {
                "display_name": "Ibrahim Musa",
                "id_type": "NIN",
                "id_number": "12345678901",
                "face_asset_id": str(stolen.id),
                "id_front_asset_id": str(front.id),
                "id_back_asset_id": str(back.id),
                "consent_service": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["error"]["code"], "FORBIDDEN")

    @patch("core.services.media.delivery_url", return_value="https://cdn.example/face.jpg")
    def test_me_includes_photo_and_kyc(self, _mock_url):
        face = self._asset("uploads/face/xyz")
        front = self._asset("uploads/identity/front-me")
        back = self._asset("uploads/identity/back-me")
        IdentityService.submit(
            user=self.user,
            display_name="Ibrahim Musa",
            id_type="NIN",
            id_number="12345678901",
            face_asset_id=face.id,
            id_front_asset_id=front.id,
            id_back_asset_id=back.id,
            consent_service=True,
        )
        me = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me.status_code, 200)
        body = me.json()
        self.assertEqual(body["photo_url"], "https://cdn.example/face.jpg")
        self.assertEqual(body["kyc"]["id_last4"], "8901")
        self.assertEqual(body["kyc"]["status"], "PENDING")
        self.assertEqual(body["kyc"]["face_asset_id"], str(face.id))

    def test_withdraw_clears_pending_pack(self):
        face = self._asset("uploads/face/wd")
        front = self._asset("uploads/identity/wd-front")
        back = self._asset("uploads/identity/wd-back")
        IdentityService.submit(
            user=self.user,
            display_name="Ibrahim Musa",
            id_type="NIN",
            id_number="12345678901",
            face_asset_id=face.id,
            id_front_asset_id=front.id,
            id_back_asset_id=back.id,
            consent_service=True,
        )
        res = self.client.post("/api/v1/accounts/identity/withdraw/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "NONE")
        self.assertEqual(res.json()["next_action"], "submit")
        self.account.refresh_from_db()
        self.assertEqual(self.account.kyc_status, Account.KycStatus.NONE)
        self.assertFalse(IdentityDocument.objects.filter(account=self.account).exists())

    def test_resubmit_keeps_number_and_assets(self):
        face = self._asset("uploads/face/keep")
        front = self._asset("uploads/identity/keep-front")
        back = self._asset("uploads/identity/keep-back")
        IdentityService.submit(
            user=self.user,
            display_name="Ibrahim Musa",
            id_type="NIN",
            id_number="12345678901",
            face_asset_id=face.id,
            id_front_asset_id=front.id,
            id_back_asset_id=back.id,
            consent_service=True,
        )
        res = self.client.post(
            "/api/v1/accounts/identity/",
            {
                "display_name": "Ibrahim Musa Updated",
                "id_type": "NIN",
                "id_number": "",
                "face_asset_id": str(face.id),
                "id_front_asset_id": str(front.id),
                "id_back_asset_id": str(back.id),
                "consent_service": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertEqual(body["id_last4"], "8901")
        self.assertEqual(body["face_asset_id"], str(face.id))
        self.account.refresh_from_db()
        self.assertEqual(self.account.display_name, "Ibrahim Musa Updated")


@override_settings(FIELD_ENCRYPTION_KEY="test-identity-key")
class IdentityOpsReviewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ops = User.objects.create(
            email="ops@test.eco",
            role=User.Role.OPS_MANAGER,
            is_staff=True,
            first_name="Ops",
            last_name="Manager",
        )
        self.ops.set_password("opspass123")
        self.ops.save()
        self.rider = User.objects.create(
            phone="+2348099003344",
            role=User.Role.DRIVER,
            first_name="Rider",
            last_name="One",
        )
        self.account = Account.objects.create(
            owner_user=self.rider,
            display_name="Rider One",
            kyc_status=Account.KycStatus.NONE,
        )
        Driver.objects.create(user=self.rider, account=self.account)
        tokens = issue_tokens(self.ops)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def _submit(self):
        face = MediaAsset.objects.create(
            provider=MediaAsset.Provider.CLOUDINARY,
            storage_key="uploads/face/ops",
            content_type="image/jpeg",
            resource_type="image",
            uploaded_by=self.rider,
        )
        front = MediaAsset.objects.create(
            provider=MediaAsset.Provider.CLOUDINARY,
            storage_key="uploads/identity/ops-front",
            content_type="image/jpeg",
            resource_type="image",
            uploaded_by=self.rider,
        )
        back = MediaAsset.objects.create(
            provider=MediaAsset.Provider.CLOUDINARY,
            storage_key="uploads/identity/ops-back",
            content_type="image/jpeg",
            resource_type="image",
            uploaded_by=self.rider,
        )
        with patch(
            "accounts.helpers.kyc.delivery_url",
            return_value="https://cdn.example/face.jpg",
        ):
            IdentityService.submit(
                user=self.rider,
                display_name="Rider One",
                id_type="NIN",
                id_number="12345678901",
                face_asset_id=face.id,
                id_front_asset_id=front.id,
                id_back_asset_id=back.id,
                consent_service=True,
            )

    def test_ops_verify_requires_card_photos(self):
        face = MediaAsset.objects.create(
            provider=MediaAsset.Provider.CLOUDINARY,
            storage_key="uploads/face/ops-only",
            content_type="image/jpeg",
            resource_type="image",
            uploaded_by=self.rider,
        )
        IdentityDocument.objects.create(
            account=self.account,
            doc_type=IdentityDocument.DocType.NIN,
            number_last4="8901",
            status=IdentityDocument.Status.PENDING,
        )
        Driver.objects.filter(user=self.rider).update(photo=face)
        self.account.kyc_status = Account.KycStatus.PENDING
        self.account.save(update_fields=["kyc_status"])
        res = self.client.post(
            f"/api/v1/accounts/{self.account.id}/kyc/verify/",
            {"via": "MANUAL"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"]["code"], "KYC_PHOTOS_REQUIRED")

    def test_ops_verify_kyc(self):
        self._submit()
        res = self.client.post(
            f"/api/v1/accounts/{self.account.id}/kyc/verify/",
            {"via": "MANUAL"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "VERIFIED")
        self.assertEqual(res.json()["verified_via"], "MANUAL")
        self.account.refresh_from_db()
        self.assertEqual(self.account.kyc_status, Account.KycStatus.VERIFIED)

    def test_ops_reject_kyc(self):
        self._submit()
        res = self.client.post(
            f"/api/v1/accounts/{self.account.id}/kyc/reject/",
            {"reason": "Blurry face photo"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "REJECTED")
        self.account.refresh_from_db()
        self.assertEqual(self.account.kyc_status, Account.KycStatus.REJECTED)

    def test_ops_request_photos_notifies_rider(self):
        from audit.models import AuditEvent
        from notifications.models import Notification

        self._submit()
        res = self.client.post(
            f"/api/v1/accounts/{self.account.id}/kyc/request-photos/",
            {"note": "ID front is blurry — retake in daylight"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["status"], "PENDING")
        self.assertEqual(body["next_action"], "upload_photos")
        self.assertEqual(body["request_note"], "ID front is blurry — retake in daylight")
        self.assertTrue(body["photos_requested"])
        self.assertTrue(
            AuditEvent.objects.filter(
                action="kyc.photos_requested",
                subject_id=str(self.account.id),
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                user=self.rider,
                template_code="kyc.photos_requested",
            ).exists()
        )

    def test_ops_notify_rider_in_app(self):
        from audit.models import AuditEvent
        from notifications.models import Notification

        res = self.client.post(
            f"/api/v1/accounts/{self.account.id}/notify/",
            {"message": "Full name must match your NIN card"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(
            AuditEvent.objects.filter(
                action="account.ops_note",
                subject_id=str(self.account.id),
            ).exists()
        )
        note = Notification.objects.filter(
            user=self.rider,
            template_code="account.ops_note",
        ).first()
        self.assertIsNotNone(note)
        self.assertIn("identity", (note.link_path or "").lower())

    def test_rider_adjust_photos_clears_request(self):
        self._submit()
        IdentityService.request_photos(
            account=self.account,
            actor=self.ops,
            note="Please retake the back of your ID",
        )
        front = MediaAsset.objects.create(
            provider=MediaAsset.Provider.CLOUDINARY,
            storage_key="uploads/identity/adj-front",
            content_type="image/jpeg",
            resource_type="image",
            uploaded_by=self.rider,
        )
        back = MediaAsset.objects.create(
            provider=MediaAsset.Provider.CLOUDINARY,
            storage_key="uploads/identity/adj-back",
            content_type="image/jpeg",
            resource_type="image",
            uploaded_by=self.rider,
        )
        rider_tokens = issue_tokens(self.rider)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {rider_tokens['access']}")
        res = self.client.post(
            "/api/v1/accounts/identity/photos/",
            {
                "id_front_asset_id": str(front.id),
                "id_back_asset_id": str(back.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["status"], "PENDING")
        self.assertEqual(body["next_action"], "wait_for_review")
        self.assertFalse(body["photos_requested"])
        self.assertIsNone(body["request_note"])

    def test_ops_suspend_and_reinstate(self):
        res = self.client.post(
            f"/api/v1/accounts/{self.account.id}/suspend/",
            {"reason": "Fraud review"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "SUSPENDED")
        res = self.client.post(
            f"/api/v1/accounts/{self.account.id}/reinstate/",
            {},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ACTIVE")

    def test_crm_list_includes_phone(self):
        res = self.client.get("/api/v1/accounts/")
        self.assertEqual(res.status_code, 200)
        rows = res.json()["results"]
        self.assertTrue(any(r["kura_id"] == self.account.kura_id for r in rows))
        match = next(r for r in rows if r["id"] == str(self.account.id))
        self.assertEqual(match["phone"], "+2348099003344")
