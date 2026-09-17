from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from accounts.services.auth import issue_tokens
from accounts.services.roles import RoleService
from audit.models import AuditEvent
from notifications.models import Notification


class StaffUsersApiTests(TestCase):
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

    def test_list_staff_users(self):
        User.objects.create(
            email="ops2@test.eco",
            role=User.Role.OPS_MANAGER,
            is_staff=True,
        )
        User.objects.create(phone="+2348011111111", role=User.Role.DRIVER)
        res = self.client.get("/api/v1/users/")
        self.assertEqual(res.status_code, 200)
        emails = {u["email"] for u in res.json()["results"]}
        self.assertIn("admin@test.eco", emails)
        self.assertIn("ops2@test.eco", emails)
        self.assertEqual(len(res.json()["results"]), 2)

    def test_invite_staff(self):
        res = self.client.post(
            "/api/v1/users/",
            {
                "email": "new.ops@test.eco",
                "role": "OPS_MANAGER",
                "first_name": "New",
                "last_name": "Ops",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertEqual(body["email"], "new.ops@test.eco")
        self.assertEqual(body["role"], "OPS_MANAGER")
        self.assertTrue(body["invite_email_sent"])
        self.assertEqual(body["expires_hours"], 72)
        user = User.objects.get(email="new.ops@test.eco", is_staff=True)
        self.assertFalse(user.has_usable_password())

    def test_role_change_revokes_sessions_notifies_subject_and_audits(self):
        user = User.objects.create(
            email="role.target@test.eco",
            role=User.Role.OPS_MANAGER,
            is_staff=True,
        )
        old_tokens = issue_tokens(user)

        response = self.client.patch(
            f"/api/v1/users/{user.id}/",
            {"role": User.Role.HUB_AGENT, "hub_ids": []},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            AuditEvent.objects.filter(
                action="user.updated",
                subject_id=str(user.id),
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                user=user,
                template_code="user.role_changed",
            ).exists()
        )
        target_client = APIClient()
        target_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {old_tokens['access']}"
        )
        self.assertEqual(
            target_client.get("/api/v1/auth/me/").status_code,
            401,
        )

    def test_admin_cannot_change_own_role(self):
        response = self.client.patch(
            f"/api/v1/users/{self.admin.id}/",
            {"role": User.Role.OPS_MANAGER},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
