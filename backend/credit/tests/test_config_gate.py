"""Credit config gate + eligibility smoke tests."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account
from core.models import ConfigVersion
from core.services.config import ConfigService
from credit.services.eligibility import EligibilityService

User = get_user_model()


class CreditConfigGateTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+2348010000001",
            password="x",
            first_name="Op",
            last_name="One",
        )
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Op One",
            kyc_status=Account.KycStatus.VERIFIED,
            status=Account.Status.ACTIVE,
        )
        self.maker = User.objects.create_user(
            phone="+2348010000002",
            password="x",
            role="COMMERCIAL_ADMIN",
            first_name="Maker",
            last_name="A",
        )
        self.checker = User.objects.create_user(
            phone="+2348010000003",
            password="x",
            role="COMMERCIAL_ADMIN",
            first_name="Checker",
            last_name="B",
        )

    def test_credit_disabled_by_default(self):
        self.assertFalse(ConfigService.is_enabled("credit"))
        elig = EligibilityService.evaluate(account=self.account)
        self.assertIn("CREDIT_DISABLED", elig.blockers)

    def test_maker_checker_enable(self):
        pending = ConfigService.propose(
            namespace="credit",
            value={"enabled": True},
            actor=self.maker,
            note="Latila OK",
        )
        self.assertEqual(pending.status, ConfigVersion.Status.PENDING)
        self.assertFalse(ConfigService.is_enabled("credit"))
        ConfigService.approve(version=pending, actor=self.checker)
        self.assertTrue(ConfigService.is_enabled("credit"))

    def test_creator_cannot_self_approve(self):
        pending = ConfigService.propose(
            namespace="credit",
            value={"enabled": True},
            actor=self.maker,
        )
        from core.exceptions import DomainError

        with self.assertRaises(DomainError) as ctx:
            ConfigService.approve(version=pending, actor=self.maker)
        self.assertEqual(ctx.exception.code, "APPROVAL_FORBIDDEN")

    def test_super_admin_can_self_approve(self):
        from audit.models import AuditEvent

        super_admin = User.objects.create_user(
            phone="+2348010000009",
            password="x",
            role="SUPER_ADMIN",
            first_name="Super",
            last_name="Admin",
            is_staff=True,
            is_superuser=True,
        )
        pending = ConfigService.propose(
            namespace="credit",
            value={"enabled": True},
            actor=super_admin,
            note="Self-approve OK for Super Admin",
        )
        approved = ConfigService.approve(version=pending, actor=super_admin)
        self.assertEqual(approved.status, ConfigVersion.Status.ACTIVE)
        self.assertTrue(ConfigService.is_enabled("credit"))
        audit = AuditEvent.objects.filter(
            action="config.approved", subject_id=str(approved.id)
        ).first()
        self.assertIsNotNone(audit)
        self.assertTrue(audit.metadata.get("self_approved"))
        self.assertTrue(audit.metadata.get("maker_checker_bypass"))

    def test_apply_blocked_when_disabled(self):
        client = APIClient()
        client.force_authenticate(self.owner)
        res = client.post(
            "/api/v1/credit/applications/",
            {
                "amount_kobo": 500000,
                "tenor_days": 14,
                "idempotency_key": "11111111-1111-1111-1111-111111111111",
                "pin_grant": "not-a-real-grant",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["error"]["code"], "CREDIT_DISABLED")
