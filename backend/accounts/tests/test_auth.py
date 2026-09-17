from django.test import TestCase, override_settings
from django.db import IntegrityError
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError

from accounts.models import Account, OtpChallenge, User
from accounts.services import AuthService, RoleService
from core.exceptions import custom_exception_handler


class AuthSliceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        RoleService.sync_catalog()

    def test_otp_request_always_202_no_enumeration(self):
        res = self.client.post(
            "/api/v1/auth/otp/request/",
            {"phone": "08012345678", "purpose": "REGISTER", "channel": "WEB"},
            format="json",
        )
        self.assertEqual(res.status_code, 202)
        body = res.json()
        self.assertEqual(body["status"], "accepted")
        self.assertEqual(body["channel"], "WEB")
        self.assertEqual(body["next"], "otp")
        challenge = OtpChallenge.objects.get(phone="+2348012345678")
        self.assertEqual(challenge.channel, "WEB")

    def test_login_begin_routes_to_pin_without_otp_throttle(self):
        user = User.objects.create(phone="+2348055555555", role=User.Role.DRIVER)
        user.set_pin("1234")
        user.first_name = "Ibrahim"
        user.save(update_fields=["pin_hash", "first_name", "updated_at"])

        res = self.client.post(
            "/api/v1/auth/login/begin/",
            {"phone": "+2348055555555", "channel": "WEB"},
            format="json",
        )
        self.assertEqual(res.status_code, 202)
        body = res.json()
        self.assertEqual(body["next"], "pin")
        self.assertTrue(body["has_pin"])
        self.assertEqual(body["display_name"], "Ibrahim")
        self.assertFalse(OtpChallenge.objects.filter(phone="+2348055555555").exists())

        login = self.client.post(
            "/api/v1/auth/pin/login/",
            {"phone": "+2348055555555", "pin": "1234", "channel": "WEB"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)
        self.assertIn("access", login.json())
        self.assertTrue(login.json()["has_pin"])

    def test_login_request_routes_to_pin_when_set(self):
        user = User.objects.create(phone="+2348066666666", role=User.Role.DRIVER)
        user.set_pin("1234")
        user.save(update_fields=["pin_hash", "updated_at"])

        res = self.client.post(
            "/api/v1/auth/otp/request/",
            {"phone": "+2348066666666", "purpose": "LOGIN", "channel": "WEB"},
            format="json",
        )
        self.assertEqual(res.status_code, 202)
        self.assertEqual(res.json()["next"], "pin")
        self.assertFalse(OtpChallenge.objects.filter(phone="+2348066666666").exists())

    @override_settings(DEBUG=True, OTP_DEV_CODE="123456")
    def test_otp_verify_provisions_operator_with_app_channel(self):
        self.client.post(
            "/api/v1/auth/otp/request/",
            {"phone": "+2348011111111", "purpose": "LOGIN", "channel": "APP"},
            format="json",
        )
        res = self.client.post(
            "/api/v1/auth/otp/verify/",
            {"phone": "+2348011111111", "code": "123456", "purpose": "LOGIN", "channel": "APP"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body["is_new_user"])
        self.assertEqual(body["onboarding_step"], "pin")
        user = User.objects.get(phone="+2348011111111")
        self.assertEqual(user.onboarding_step, User.OnboardingStep.PIN)
        account = Account.objects.get(owner_user=user)
        self.assertEqual(account.registration_channel, "APP")

    @override_settings(DEBUG=True, OTP_DEV_CODE="123456")
    def test_me_and_pin_and_capabilities(self):
        AuthService.request_otp(phone="+2348022222222", purpose="LOGIN", channel="WEB")
        verify = AuthService.verify_otp(
            phone="+2348022222222", code="123456", purpose="LOGIN", channel="WEB"
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {verify['access']}")

        me = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertIn("accounts:write_own", me.json()["capabilities"])
        self.assertEqual(me.json()["onboarding_step"], "pin")

        pin = self.client.post(
            "/api/v1/auth/pin/set/",
            {"pin": "4242", "pin_confirm": "4242"},
            format="json",
        )
        self.assertEqual(pin.status_code, 200)

        me2 = self.client.get("/api/v1/auth/me/")
        self.assertTrue(me2.json()["has_pin"])
        self.assertEqual(me2.json()["onboarding_step"], "profile")

        profile = self.client.post(
            "/api/v1/accounts/",
            {"display_name": "Ada Obi"},
            format="json",
        )
        self.assertEqual(profile.status_code, 201)
        self.assertEqual(profile.json()["display_name"], "Ada Obi")

        me3 = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me3.json()["onboarding_step"], "home")

    def test_me_heals_pin_step_when_pin_already_set(self):
        from accounts.services.auth import issue_tokens

        user = User.objects.create(
            phone="+2348033333333",
            role=User.Role.DRIVER,
            onboarding_step=User.OnboardingStep.PIN,
        )
        user.set_pin("1234")
        user.save(update_fields=["pin_hash", "updated_at"])

        tokens = issue_tokens(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        me = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertTrue(me.json()["has_pin"])
        self.assertEqual(me.json()["onboarding_step"], "profile")
        user.refresh_from_db()
        self.assertEqual(user.onboarding_step, User.OnboardingStep.PROFILE)

    def test_logout_revokes_refresh_and_emits_audit(self):
        from accounts.services.auth import issue_tokens
        from audit.models import AuditEvent

        user = User.objects.create(phone="+2348033333399", role=User.Role.DRIVER)
        tokens = issue_tokens(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        response = self.client.post(
            "/api/v1/auth/logout/",
            {"refresh": tokens["refresh"]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        refresh = self.client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": tokens["refresh"]},
            format="json",
        )
        self.assertEqual(refresh.status_code, 401)
        self.assertTrue(
            AuditEvent.objects.filter(
                action="auth.logout",
                subject_id=str(user.id),
            ).exists()
        )

    def test_pin_reset_revokes_old_session_and_returns_current_tokens(self):
        from accounts.services.auth import issue_tokens

        user = User.objects.create(phone="+2348033333388", role=User.Role.DRIVER)
        user.set_pin("1234")
        user.save(update_fields=["pin_hash", "updated_at"])
        old_tokens = issue_tokens(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {old_tokens['access']}")

        response = self.client.post(
            "/api/v1/auth/pin/set/",
            {"pin": "5678", "pin_confirm": "5678"},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()["was_reset"])
        old_client = APIClient()
        old_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {old_tokens['access']}"
        )
        self.assertEqual(old_client.get("/api/v1/auth/me/").status_code, 401)
        current_client = APIClient()
        current_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.json()['access']}"
        )
        self.assertEqual(current_client.get("/api/v1/auth/me/").status_code, 200)

    @override_settings(DEBUG=True, OTP_DEV_CODE="123456")
    def test_staff_login_rejects_driver(self):
        AuthService.request_otp(phone="+2348044444444", purpose="LOGIN")
        AuthService.verify_otp(phone="+2348044444444", code="123456", purpose="LOGIN")
        user = User.objects.get(phone="+2348044444444")
        user.set_password("driverpass123")
        user.save(update_fields=["password"])

        res = self.client.post(
            "/api/v1/auth/login/",
            {"identifier": "+2348044444444", "password": "driverpass123"},
            format="json",
        )
        self.assertEqual(res.status_code, 401)

        admin = User.objects.create(
            email="admin-test@yopmail.com",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        admin.set_password("adminpass123")
        admin.save()
        ok = self.client.post(
            "/api/v1/auth/login/",
            {"identifier": "admin-test@yopmail.com", "password": "adminpass123"},
            format="json",
        )
        self.assertEqual(ok.status_code, 200)
        self.assertIn("access", ok.json())

    def test_staff_profile_avatar_update_emits_audit(self):
        from audit.models import AuditEvent
        from core.models import MediaAsset

        admin = User.objects.create(
            email="avatar-admin@yopmail.com",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            first_name="Amina",
            last_name="Bello",
        )
        admin.set_password("adminpass123")
        admin.save()
        login = self.client.post(
            "/api/v1/auth/login/",
            {"identifier": "avatar-admin@yopmail.com", "password": "adminpass123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.json()['access']}")
        asset = MediaAsset.objects.create(
            provider=MediaAsset.Provider.CLOUDINARY,
            storage_key="kura/avatars/test-face",
            kind="avatar",
            content_type="image/jpeg",
            uploaded_by=admin,
        )
        res = self.client.patch(
            "/api/v1/auth/me/profile/",
            {"avatar_asset_id": str(asset.id), "phone": "+2348012345678"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["user"]["phone"], "+2348012345678")
        self.assertTrue(body["photo_url"])
        admin.refresh_from_db()
        self.assertEqual(admin.avatar_id, asset.id)
        self.assertTrue(
            AuditEvent.objects.filter(
                action="user.profile_updated", subject_id=str(admin.id)
            ).exists()
        )


class ExceptionEnvelopeTests(TestCase):
    def test_validation_error_uses_envelope_not_raw_detail(self):
        response = custom_exception_handler(
            ValidationError({"phone": ["required"]}),
            {"request": type("R", (), {"request_id": "r1"})()},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_ERROR")
        self.assertEqual(response.data["error"]["details"]["phone"], ["required"])
        self.assertNotIn("detail", response.data)

    def test_integrity_error_maps_to_conflict_envelope(self):
        response = custom_exception_handler(
            IntegrityError('duplicate key value violates unique constraint\nDETAIL: Key (phone)=(+2348011111111) already exists.'),
            {"request": type("R", (), {"request_id": "r2"})()},
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_ERROR")
        self.assertIn("phone", response.data["error"]["details"])
