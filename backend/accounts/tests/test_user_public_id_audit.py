from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from accounts.services.auth import issue_tokens
from accounts.services.roles import RoleService
from accounts.services.users import UserService
from audit.models import AuditEvent
from notifications.models import Notification


class UserPublicIdAndAuditTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        self.client = APIClient()
        self.admin = User.objects.create(
            email="admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
            first_name="Admin",
            last_name="User",
        )
        self.admin.set_password("adminpass123")
        self.admin.save()
        tokens = issue_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_invite_assigns_public_id_and_audit(self):
        user, _pwd = UserService.invite_staff(
            actor=self.admin,
            email="ops.live@test.eco",
            role_code="OPS_MANAGER",
            first_name="Ops",
            last_name="Live",
        )
        self.assertTrue(user.public_id)
        self.assertTrue(user.public_id.startswith("ST-"))
        self.assertTrue(
            AuditEvent.objects.filter(
                action="user.invited", subject_id=str(user.id)
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                user=self.admin, template_code="user.invited"
            ).exists()
        )

    def test_audit_list_api(self):
        UserService.invite_staff(
            actor=self.admin,
            email="ops2@test.eco",
            role_code="OPS_MANAGER",
        )
        res = self.client.get("/api/v1/audit/")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.json()["results"]), 1)

    def test_notifications_list_api(self):
        UserService.invite_staff(
            actor=self.admin,
            email="ops3@test.eco",
            role_code="HUB_AGENT",
        )
        res = self.client.get("/api/v1/notifications/")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.json()["results"]), 1)
