"""Reservations and swaps must not expose ModelViewSet's generic writes."""
from __future__ import annotations

import uuid

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from accounts.services.auth import issue_tokens


class ClosedVerbsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(phone="+2348000000999", role=User.Role.DRIVER)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {issue_tokens(self.user)['access']}")

    def test_reservation_put_patch_delete_not_allowed(self):
        url = f"/api/v1/mobility/reservations/{uuid.uuid4()}/"
        for method in ("put", "patch", "delete"):
            res = getattr(self.client, method)(url, {"status": "USED"}, format="json")
            self.assertEqual(res.status_code, 405, method)

    def test_swap_create_not_allowed(self):
        res = self.client.post("/api/v1/mobility/swaps/", {"status": "COMPLETED"}, format="json")
        self.assertEqual(res.status_code, 405)
