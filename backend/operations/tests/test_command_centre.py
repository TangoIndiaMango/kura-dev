"""Command-centre is ops-only — hub agents must not see network KPIs."""
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import StaffMembership, User
from accounts.services.auth import issue_tokens
from accounts.services.roles import RoleService
from mobility.models import Hub


class CommandCentreAccessTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        self.hub = Hub.objects.create(
            code="HUB-CC-01",
            name="CC Hub",
            address="Lagos",
            lat=6.5,
            lng=3.3,
            slot_count=4,
            status=Hub.Status.ONLINE,
        )

    def _client_for(self, user: User) -> APIClient:
        client = APIClient()
        tokens = issue_tokens(user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        return client

    def test_ops_manager_can_read_command_centre(self):
        ops = User.objects.create(
            email="ops.cc@test.eco",
            role=User.Role.OPS_MANAGER,
            is_staff=True,
        )
        client = self._client_for(ops)
        res = client.get("/api/v1/operations/command-centre/")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIn("kpis", res.json())

    def test_hub_agent_forbidden_on_command_centre(self):
        agent = User.objects.create(
            email="agent.cc@test.eco",
            role=User.Role.HUB_AGENT,
            is_staff=True,
        )
        StaffMembership.objects.create(
            user=agent,
            role=User.Role.HUB_AGENT,
            hub_id=str(self.hub.id),
        )
        client = self._client_for(agent)
        res = client.get("/api/v1/operations/command-centre/")
        self.assertEqual(res.status_code, 403, res.content)
        activity = client.get("/api/v1/operations/activity/")
        self.assertEqual(activity.status_code, 403, activity.content)
