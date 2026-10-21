from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from accounts.services.auth import issue_tokens
from core.services.events import NotifySpec, emit_event
from notifications.models import Notification
from notifications.preferences import (
    DEFAULT_NOTIF_PREFS,
    PREF_LOAN_UPDATES,
    PREF_PAYMENT_ALERTS,
    PREF_PLAN_EXPIRY,
    PREF_SWAP_SMS,
    category_for_template,
    normalized_notif_prefs,
)

SMS = Notification.Channel.SMS
IN_APP = Notification.Channel.IN_APP


class TemplateCategoryMappingTests(TestCase):
    def test_rider_templates_map_to_categories(self):
        cases = {
            "swap.completed": PREF_SWAP_SMS,
            "cash.deposit_receipt": PREF_PAYMENT_ALERTS,
            "plan.purchased": PREF_PAYMENT_ALERTS,
            "plan.renewed": PREF_PAYMENT_ALERTS,
            "payment.received": PREF_PAYMENT_ALERTS,
            "plan.expired": PREF_PLAN_EXPIRY,
            "plan.lapsed": PREF_PLAN_EXPIRY,
            "plan.expiring_soon": PREF_PLAN_EXPIRY,
            "loan.approved": PREF_LOAN_UPDATES,
        }
        for code, category in cases.items():
            with self.subTest(code=code):
                self.assertEqual(category_for_template(code), category)

    def test_security_and_legal_templates_never_gated(self):
        for code in (
            "auth.pin_reset",
            "auth.staff_login",
            "auth.operator_login",
            "otp.login",
            "pin.changed",
            "phone.changed",
            "account.suspended",
            "kyc.rejected",
            "tariff.customer_notice",
            "user.role_changed",
            "",
            "reservation.created",
        ):
            with self.subTest(code=code):
                self.assertIsNone(category_for_template(code))

    def test_normalize_defaults_all_on_and_ignores_unknown_keys(self):
        self.assertEqual(normalized_notif_prefs(None), DEFAULT_NOTIF_PREFS)
        prefs = normalized_notif_prefs({"swap_sms": 0, "bogus": False})
        self.assertFalse(prefs["swap_sms"])
        self.assertTrue(prefs["email"])
        self.assertNotIn("bogus", prefs)


class EmitEventPrefGateTests(TestCase):
    def setUp(self):
        self.rider = User.objects.create(phone="+2348019990001", role=User.Role.DRIVER)

    def _emit(self, template_code, dedupe):
        return emit_event(
            action=template_code or "test.event",
            subject_type="user",
            subject_id=str(self.rider.id),
            notify=NotifySpec(
                user=self.rider,
                title="t",
                channels=(IN_APP, SMS),
                template_code=template_code,
                dedupe_key=dedupe,
            ),
        )

    def _set(self, **prefs):
        self.rider.notification_prefs = normalized_notif_prefs(prefs)
        self.rider.save(update_fields=["notification_prefs"])

    def test_disabled_category_drops_sms_keeps_in_app(self):
        self._set(swap_sms=False)
        res = self._emit("swap.completed", "swap.completed:x")
        self.assertEqual([n.channel for n in res.notifications], [IN_APP])
        self.assertEqual(
            Notification.objects.get(user=self.rider).dedupe_key,
            "swap.completed:x:IN_APP",
        )

    def test_other_categories_unaffected(self):
        self._set(swap_sms=False)
        res = self._emit("plan.expired", "plan.expired:x")
        self.assertEqual({n.channel for n in res.notifications}, {IN_APP, SMS})

    def test_security_template_sends_even_with_everything_off(self):
        self._set(
            swap_sms=False,
            payment_alerts=False,
            plan_expiry=False,
            loan_updates=False,
        )
        res = self._emit("auth.pin_reset", "pin:x")
        self.assertEqual({n.channel for n in res.notifications}, {IN_APP, SMS})


class RiderPrefsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.rider = User.objects.create(phone="+2348019990002", role=User.Role.DRIVER)
        tokens = issue_tokens(self.rider)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_me_exposes_and_profile_patch_updates_rider_prefs(self):
        me = self.client.get("/api/v1/auth/me/").json()
        for key in ("swap_sms", "payment_alerts", "plan_expiry", "loan_updates"):
            self.assertTrue(me["notification_prefs"][key])

        res = self.client.patch(
            "/api/v1/auth/me/profile/",
            {"notification_prefs": {"swap_sms": False, "loan_updates": False}},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        prefs = res.json()["notification_prefs"]
        self.assertFalse(prefs["swap_sms"])
        self.assertFalse(prefs["loan_updates"])
        self.assertTrue(prefs["payment_alerts"])
        self.rider.refresh_from_db()
        self.assertFalse(self.rider.notification_prefs["swap_sms"])
