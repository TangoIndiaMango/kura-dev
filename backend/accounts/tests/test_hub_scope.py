"""Hub-scoped staff querysets — HUB_AGENT only sees assigned hubs."""
from __future__ import annotations

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import StaffMembership, User
from accounts.selectors.scope import hub_ids_for
from accounts.services.auth import issue_tokens
from accounts.services.roles import RoleService
from mobility.models import Hub
from mobility.selectors import hubs_with_slot_counts, swaps_for
from mobility.services.hubs.service import HubService


class HubScopeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        RoleService.sync_catalog()
        cls.yaba = HubService.create_hub(
            code="HUB-YABA-SC",
            name="Yaba Scope",
            address="Yaba",
            slot_count=2,
        )
        cls.ikeja = HubService.create_hub(
            code="HUB-IKJ-SC",
            name="Ikeja Scope",
            address="Ikeja",
            slot_count=2,
        )
        cls.agent = User.objects.create(
            email="scope.agent@test.local",
            role=User.Role.HUB_AGENT,
            is_staff=True,
            first_name="Chinedu",
            last_name="Okafor",
        )
        StaffMembership.objects.create(
            user=cls.agent,
            role=User.Role.HUB_AGENT,
            hub_id=str(cls.yaba.id),
        )
        cls.ops = User.objects.create(
            email="scope.ops@test.local",
            role=User.Role.OPS_MANAGER,
            is_staff=True,
        )
        cls.inviter = User.objects.create(
            email="scope.inviter@test.local",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )

    def test_hub_ids_for_agent_membership(self):
        self.assertEqual(hub_ids_for(self.agent), [self.yaba.id])

    def test_invite_agent_with_hub_ids(self):
        from accounts.services.staff_invite import invite_staff

        user, meta = invite_staff(
            actor=self.inviter,
            email="new.agent@test.local",
            role_code=User.Role.HUB_AGENT,
            first_name="Ada",
            last_name="Okafor",
            hub_ids=[self.yaba.id, self.ikeja.id],
        )
        self.assertEqual(user.role, User.Role.HUB_AGENT)
        self.assertEqual(set(meta["hub_ids"]), {str(self.yaba.id), str(self.ikeja.id)})
        self.assertEqual(set(hub_ids_for(user)), {self.yaba.id, self.ikeja.id})

    def test_hub_ids_for_ops_unrestricted(self):
        self.assertIsNone(hub_ids_for(self.ops))

    def test_hubs_list_scoped_for_agent(self):
        ids = set(hubs_with_slot_counts(self.agent).values_list("id", flat=True))
        self.assertEqual(ids, {self.yaba.id})

    def test_hubs_api_hides_other_hub(self):
        client = APIClient()
        tokens = issue_tokens(self.agent)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        listed = client.get("/api/v1/mobility/hubs/")
        self.assertEqual(listed.status_code, 200)
        codes = {row["code"] for row in listed.json()["results"]}
        self.assertIn("HUB-YABA-SC", codes)
        self.assertNotIn("HUB-IKJ-SC", codes)

        other = client.get(f"/api/v1/mobility/hubs/{self.ikeja.id}/")
        self.assertEqual(other.status_code, 404)

    def test_agent_cannot_list_staff_users(self):
        client = APIClient()
        tokens = issue_tokens(self.agent)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = client.get("/api/v1/users/")
        self.assertEqual(res.status_code, 403)

    def test_swaps_scoped_empty_without_yaba_swaps(self):
        self.assertEqual(swaps_for(self.agent).count(), 0)
