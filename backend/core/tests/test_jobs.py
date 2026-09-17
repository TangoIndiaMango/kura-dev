from django.test import TestCase, override_settings
from rest_framework.test import APIClient


class FlagUnreturnedJobViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/v1/internal/jobs/flag-unreturned/"

    def test_rejects_missing_secret(self):
        with override_settings(CRON_SECRET="test-cron-secret"):
            res = self.client.post(self.url)
        self.assertEqual(res.status_code, 401)

    def test_accepts_valid_secret(self):
        with override_settings(CRON_SECRET="test-cron-secret"):
            res = self.client.post(
                self.url, HTTP_X_CRON_SECRET="test-cron-secret"
            )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get("ok"))
        self.assertEqual(res.data.get("job"), "flag_unreturned_batteries")
