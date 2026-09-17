from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, User
from finance.models import Payment


class RevenueAnalyticsApiTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create(
            email="revenue-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        owner = User.objects.create(
            phone="+2348011117711",
            role=User.Role.DRIVER,
        )
        self.account = Account.objects.create(
            owner_user=owner,
            display_name="Revenue Rider",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_overview_aggregates_successful_payments_in_kobo(self):
        Payment.objects.create(
            account=self.account,
            channel=Payment.Channel.CARD,
            amount_kobo=150_000,
            vat_kobo=10_465,
            status=Payment.Status.SUCCESS,
            purpose="PLAN",
        )
        Payment.objects.create(
            account=self.account,
            channel=Payment.Channel.CARD,
            amount_kobo=50_000,
            status=Payment.Status.PENDING,
            purpose="PLAN",
        )

        response = self.client.get("/api/v1/analytics/revenue/overview/")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["gross_kobo"], 150_000)
        self.assertEqual(response.json()["vat_kobo"], 10_465)
        self.assertEqual(response.json()["outstanding_kobo"], 50_000)
        self.assertEqual(response.json()["channels"][0]["channel"], "CARD")

    def test_driver_is_capability_gated(self):
        driver = User.objects.create(
            phone="+2348011117722",
            role=User.Role.DRIVER,
        )
        self.client.force_authenticate(driver)
        response = self.client.get("/api/v1/analytics/revenue/overview/")
        self.assertEqual(response.status_code, 403)
