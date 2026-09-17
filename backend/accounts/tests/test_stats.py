from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, User
from accounts.services.auth import issue_tokens


class ModuleStatsApiTests(TestCase):
    def setUp(self):
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

        rider = User.objects.create(phone="+2348011110001", role=User.Role.DRIVER)
        Account.objects.create(
            owner_user=rider,
            display_name="Rider One",
            status=Account.Status.ACTIVE,
        )
        Account.objects.create(
            owner_user=rider,
            display_name="Rider Two",
            status=Account.Status.SUSPENDED,
        )

    def test_accounts_stats(self):
        res = self.client.get("/api/v1/accounts/stats/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["totals"]["all"], 2)
        self.assertEqual(body["totals"]["active"], 1)
        self.assertEqual(body["totals"]["suspended"], 1)
        self.assertIn("registrations", body)

    def test_users_stats(self):
        res = self.client.get("/api/v1/users/stats/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertGreaterEqual(body["totals"]["all"], 1)
        self.assertIn("invited", body["totals"])

    def test_roles_stats(self):
        res = self.client.get("/api/v1/roles/stats/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("all", body["totals"])
        self.assertIn("system", body["totals"])

    def test_users_export_csv(self):
        res = self.client.get("/api/v1/users/export/", {"export": "csv"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/csv", res["Content-Type"])
        self.assertIn("name", res.content.decode())

    def test_roles_export_csv(self):
        res = self.client.get("/api/v1/roles/export/", {"export": "csv"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/csv", res["Content-Type"])

    def test_accounts_export_csv(self):
        res = self.client.get("/api/v1/accounts/export/", {"export": "csv"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/csv", res["Content-Type"])
        body = res.content.decode()
        self.assertIn("kura_id", body)
        self.assertIn("Rider One", body)

    def test_accounts_export_pdf(self):
        res = self.client.get("/api/v1/accounts/export/", {"export": "pdf"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Content-Type"], "application/pdf")
        self.assertTrue(res.content.startswith(b"%PDF"))

    def test_users_export_pdf(self):
        res = self.client.get("/api/v1/users/export/", {"export": "pdf"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Content-Type"], "application/pdf")
        self.assertTrue(res.content.startswith(b"%PDF"))

    def test_roles_export_pdf(self):
        res = self.client.get("/api/v1/roles/export/", {"export": "pdf"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Content-Type"], "application/pdf")
        self.assertTrue(res.content.startswith(b"%PDF"))

