"""Config versions list API — Approvals queue."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.services.auth import issue_tokens
from accounts.services.roles import RoleService
from core.models import ConfigVersion
from core.services.config import ConfigService

User = get_user_model()


class ConfigVersionsApiTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        self.admin = User.objects.create(
            email="cfg.admin@yopmail.com",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
            first_name="Cfg",
            last_name="Admin",
        )
        self.admin.set_password("adminpass123")
        self.admin.save()
        tokens = issue_tokens(self.admin)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_versions_list_not_swallowed_by_namespace(self):
        pending = ConfigService.propose(
            namespace="credit",
            value={"enabled": True},
            actor=self.admin,
            note="Enable credit",
        )
        res = self.client.get(
            "/api/v1/config/versions/",
            {"status": "PENDING", "page": 1, "page_size": 10},
        )
        self.assertEqual(res.status_code, 200, res.content)
        ids = [row["id"] for row in res.json()["results"]]
        self.assertIn(str(pending.id), ids)

    def test_active_filter_and_namespace_still_works(self):
        pending = ConfigService.propose(
            namespace="offers",
            value={"enabled": True},
            actor=self.admin,
        )
        ConfigService.approve(version=pending, actor=self.admin)
        active = self.client.get(
            "/api/v1/config/versions/",
            {"status": "ACTIVE", "page": 1, "page_size": 10},
        )
        self.assertEqual(active.status_code, 200)
        self.assertTrue(any(r["status"] == "ACTIVE" for r in active.json()["results"]))

        ns = self.client.get("/api/v1/config/offers/")
        self.assertEqual(ns.status_code, 200)
        self.assertTrue(ns.json()["effective"]["enabled"])

    def test_approve_action(self):
        pending = ConfigService.propose(
            namespace="credit",
            value={"enabled": True, "score_threshold": 55},
            actor=self.admin,
        )
        res = self.client.post(f"/api/v1/config/versions/{pending.id}/approve/")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["status"], ConfigVersion.Status.ACTIVE)
