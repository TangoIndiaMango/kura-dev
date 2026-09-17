"""Audit subject_type ∩ capability scoping."""
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from accounts.services.auth import issue_tokens
from audit.services import AuditService


class AuditScopeTests(TestCase):
    def setUp(self):
        self.actor = User.objects.create(
            email="auditor@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        AuditService.record(
            action="account.suspended",
            subject_type="account",
            subject_id="acc-1",
            actor=self.actor,
            subject_label="KR-1",
        )
        AuditService.record(
            action="user.login",
            subject_type="user",
            subject_id="usr-1",
            actor=self.actor,
        )
        AuditService.record(
            action="wallet.funded",
            subject_type="wallet",
            subject_id="wal-1",
            actor=self.actor,
        )
        AuditService.record(
            action="role.updated",
            subject_type="role",
            subject_id="role-1",
            actor=self.actor,
        )

    def _client_for(self, user: User) -> APIClient:
        client = APIClient()
        tokens = issue_tokens(user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        return client

    def test_super_admin_sees_all(self):
        client = self._client_for(self.actor)
        res = client.get("/api/v1/audit/")
        self.assertEqual(res.status_code, 200)
        types = {row["subject_type"] for row in res.json()["results"]}
        self.assertEqual(types, {"account", "user", "wallet", "role"})

    def test_government_viewer_finance_and_ops_only(self):
        gov = User.objects.create(
            email="gov@test.eco",
            role=User.Role.GOVERNMENT_VIEWER,
            is_staff=True,
        )
        client = self._client_for(gov)
        res = client.get("/api/v1/audit/")
        self.assertEqual(res.status_code, 200)
        types = {row["subject_type"] for row in res.json()["results"]}
        self.assertEqual(types, {"wallet"})
        self.assertNotIn("user", types)
        self.assertNotIn("account", types)
        self.assertNotIn("role", types)

    def test_commercial_sees_accounts_users_finance_not_roles(self):
        commercial = User.objects.create(
            email="commerce@test.eco",
            role=User.Role.COMMERCIAL_ADMIN,
            is_staff=True,
        )
        client = self._client_for(commercial)
        res = client.get("/api/v1/audit/")
        self.assertEqual(res.status_code, 200)
        types = {row["subject_type"] for row in res.json()["results"]}
        self.assertEqual(types, {"account", "user", "wallet"})
        self.assertNotIn("role", types)

    def test_stats_match_scoped_list(self):
        gov = User.objects.create(
            email="gov2@test.eco",
            role=User.Role.GOVERNMENT_VIEWER,
            is_staff=True,
        )
        client = self._client_for(gov)
        stats = client.get("/api/v1/audit/stats/")
        self.assertEqual(stats.status_code, 200)
        self.assertEqual(stats.json()["totals"]["all"], 1)

    def test_hub_agent_without_audit_read_forbidden(self):
        agent = User.objects.create(
            email="agent@test.eco",
            role=User.Role.HUB_AGENT,
            is_staff=True,
        )
        client = self._client_for(agent)
        res = client.get("/api/v1/audit/")
        self.assertEqual(res.status_code, 403)
