from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import Account, Consent, Driver, IdentityDocument, User
from accounts.services.auth import issue_tokens
from accounts.services.consent import ConsentService
from audit.models import AuditEvent
from core.exceptions import DomainError
from core.models import MediaAsset


@override_settings(CONSENT_POLICY_VERSION="2026-10")
class ConsentServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(
            phone="+2348011223344",
            role=User.Role.DRIVER,
            onboarding_step=User.OnboardingStep.DONE,
        )
        self.account = Account.objects.create(
            owner_user=self.user,
            display_name="Ada Obi",
            kyc_status=Account.KycStatus.NONE,
        )

    def test_grant_creates_row_and_audit(self):
        row = ConsentService.grant(
            account=self.account,
            purpose="SERVICE",
            channel="WEB",
            actor=self.user,
        )
        self.assertTrue(row.is_active)
        self.assertEqual(row.policy_version, "2026-10")
        self.assertEqual(row.channel, Consent.Channel.WEB)
        audit = AuditEvent.objects.get(
            action="consent.granted", subject_id=str(self.account.id)
        )
        self.assertEqual(audit.after["purpose"], "SERVICE")
        self.assertEqual(audit.after["policy_version"], "2026-10")

    def test_grant_is_idempotent_at_same_version(self):
        ConsentService.grant(account=self.account, purpose="DATA_SHARING")
        ConsentService.grant(account=self.account, purpose="DATA_SHARING")
        self.assertEqual(Consent.objects.filter(account=self.account).count(), 1)
        self.assertEqual(
            AuditEvent.objects.filter(action="consent.granted").count(), 1
        )

    def test_new_policy_version_restamps_active_row(self):
        ConsentService.grant(account=self.account, purpose="SERVICE")
        self.assertTrue(ConsentService.has_service_consent(self.account))
        with override_settings(CONSENT_POLICY_VERSION="2027-01"):
            self.assertFalse(ConsentService.has_service_consent(self.account))
            ConsentService.grant(account=self.account, purpose="SERVICE")
            self.assertTrue(ConsentService.has_service_consent(self.account))
        rows = Consent.objects.filter(account=self.account)
        self.assertEqual(rows.count(), 1)
        self.assertEqual(rows.get().policy_version, "2027-01")

    def test_withdraw_data_sharing_stamps_row_and_audits(self):
        ConsentService.grant(account=self.account, purpose="DATA_SHARING")
        row = ConsentService.withdraw(
            account=self.account, purpose="DATA_SHARING", actor=self.user
        )
        self.assertIsNotNone(row.withdrawn_at)
        audit = AuditEvent.objects.get(action="consent.withdrawn")
        self.assertEqual(audit.after["purpose"], "DATA_SHARING")
        self.assertFalse(audit.after["granted"])
        state = ConsentService.state(self.account)
        self.assertFalse(state["data_sharing"]["granted"])
        self.assertIsNotNone(state["data_sharing"]["withdrawn_at"])

    def test_regrant_after_withdraw_keeps_history(self):
        ConsentService.grant(account=self.account, purpose="DATA_SHARING")
        ConsentService.withdraw(account=self.account, purpose="DATA_SHARING")
        ConsentService.grant(account=self.account, purpose="DATA_SHARING")
        rows = Consent.objects.filter(account=self.account, purpose="DATA_SHARING")
        self.assertEqual(rows.count(), 2)
        self.assertEqual(rows.filter(withdrawn_at__isnull=True).count(), 1)
        self.assertTrue(ConsentService.state(self.account)["data_sharing"]["granted"])

    def test_withdraw_without_grant_is_noop(self):
        self.assertIsNone(
            ConsentService.withdraw(account=self.account, purpose="DATA_SHARING")
        )
        self.assertFalse(AuditEvent.objects.filter(action="consent.withdrawn").exists())

    def test_service_withdrawal_refused(self):
        ConsentService.grant(account=self.account, purpose="SERVICE")
        with self.assertRaises(DomainError) as ctx:
            ConsentService.withdraw(account=self.account, purpose="SERVICE")
        self.assertEqual(ctx.exception.code, "CONSENT_NOT_WITHDRAWABLE")
        self.assertTrue(ConsentService.has_service_consent(self.account))
        self.assertFalse(AuditEvent.objects.filter(action="consent.withdrawn").exists())

    def test_prompt_required_only_for_accounts_with_kyc_data(self):
        self.assertFalse(ConsentService.state(self.account)["prompt_required"])
        self.account.kyc_status = Account.KycStatus.PENDING
        self.account.save(update_fields=["kyc_status"])
        state = ConsentService.state(self.account)
        self.assertTrue(state["needs_service_consent"])
        self.assertTrue(state["prompt_required"])
        ConsentService.grant(account=self.account, purpose="SERVICE")
        self.assertFalse(ConsentService.state(self.account)["prompt_required"])


@override_settings(CONSENT_POLICY_VERSION="2026-10")
class ConsentApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(
            phone="+2348011225566",
            role=User.Role.DRIVER,
            first_name="Ada",
            last_name="Obi",
            onboarding_step=User.OnboardingStep.PROFILE,
        )
        self.account = Account.objects.create(
            owner_user=self.user,
            display_name="Ada Obi",
            kyc_status=Account.KycStatus.NONE,
        )
        Driver.objects.create(user=self.user, account=self.account)
        tokens = issue_tokens(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_me_exposes_consent_state(self):
        res = self.client.get("/api/v1/auth/me/")
        self.assertEqual(res.status_code, 200)
        consent = res.json()["consent"]
        self.assertEqual(consent["policy_version"], "2026-10")
        self.assertFalse(consent["service"]["granted"])
        self.assertFalse(consent["data_sharing"]["granted"])
        self.assertTrue(consent["needs_service_consent"])
        self.assertFalse(consent["prompt_required"])

    def test_owner_grants_and_withdraws_data_sharing(self):
        res = self.client.post(
            "/api/v1/auth/me/consent/",
            {"purpose": "DATA_SHARING", "granted": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["data_sharing"]["granted"])

        res = self.client.post(
            "/api/v1/auth/me/consent/",
            {"purpose": "DATA_SHARING", "granted": False},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["data_sharing"]["granted"])
        me = self.client.get("/api/v1/auth/me/").json()
        self.assertFalse(me["consent"]["data_sharing"]["granted"])

    def test_owner_cannot_withdraw_service(self):
        ConsentService.grant(account=self.account, purpose="SERVICE")
        res = self.client.post(
            "/api/v1/auth/me/consent/",
            {"purpose": "SERVICE", "granted": False},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"]["code"], "CONSENT_NOT_WITHDRAWABLE")
        self.assertTrue(ConsentService.has_service_consent(self.account))

    def test_existing_rider_confirms_service_via_endpoint(self):
        self.account.kyc_status = Account.KycStatus.VERIFIED
        self.account.save(update_fields=["kyc_status"])
        self.assertTrue(
            self.client.get("/api/v1/auth/me/").json()["consent"]["prompt_required"]
        )
        res = self.client.post(
            "/api/v1/auth/me/consent/",
            {"purpose": "SERVICE", "granted": True, "channel": "APP"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body["service"]["granted"])
        self.assertEqual(body["service"]["channel"], "APP")
        self.assertFalse(body["prompt_required"])


@override_settings(
    FIELD_ENCRYPTION_KEY="test-identity-key", CONSENT_POLICY_VERSION="2026-10"
)
class IdentityConsentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(
            phone="+2348011227788",
            role=User.Role.DRIVER,
            onboarding_step=User.OnboardingStep.PROFILE,
        )
        self.account = Account.objects.create(
            owner_user=self.user,
            display_name="Rider 7788",
            kyc_status=Account.KycStatus.NONE,
        )
        Driver.objects.create(user=self.user, account=self.account)
        tokens = issue_tokens(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def _asset(self, key: str) -> MediaAsset:
        return MediaAsset.objects.create(
            provider=MediaAsset.Provider.CLOUDINARY,
            storage_key=key,
            content_type="image/jpeg",
            resource_type="image",
            uploaded_by=self.user,
        )

    def _payload(self, **extra) -> dict:
        return {
            "display_name": "Chidi Eze",
            "id_type": "NIN",
            "id_number": "12345678901",
            "face_asset_id": str(self._asset(f"uploads/face/{len(extra)}").id),
            "id_front_asset_id": str(self._asset("uploads/identity/f").id),
            "id_back_asset_id": str(self._asset("uploads/identity/b").id),
            **extra,
        }

    def test_identity_submit_without_service_consent_is_refused(self):
        res = self.client.post(
            "/api/v1/accounts/identity/", self._payload(), format="json"
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"]["code"], "CONSENT_REQUIRED")
        self.assertFalse(IdentityDocument.objects.filter(account=self.account).exists())
        self.account.refresh_from_db()
        self.assertEqual(self.account.kyc_status, Account.KycStatus.NONE)

    @patch("accounts.helpers.kyc.delivery_url", return_value="https://cdn.example/f.jpg")
    def test_identity_submit_records_consents(self, _mock_url):
        res = self.client.post(
            "/api/v1/accounts/identity/",
            self._payload(consent_service=True, consent_data_sharing=True),
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        purposes = set(
            Consent.objects.filter(
                account=self.account, withdrawn_at__isnull=True
            ).values_list("purpose", flat=True)
        )
        self.assertEqual(purposes, {"SERVICE", "DATA_SHARING"})
        self.assertEqual(
            AuditEvent.objects.filter(
                action="consent.granted", subject_id=str(self.account.id)
            ).count(),
            2,
        )

    @patch("accounts.helpers.kyc.delivery_url", return_value="https://cdn.example/f.jpg")
    def test_resubmit_with_consent_on_file_needs_no_flag(self, _mock_url):
        ConsentService.grant(account=self.account, purpose="SERVICE")
        res = self.client.post(
            "/api/v1/accounts/identity/", self._payload(), format="json"
        )
        self.assertEqual(res.status_code, 201)
        self.assertFalse(
            Consent.objects.filter(account=self.account, purpose="DATA_SHARING").exists()
        )
