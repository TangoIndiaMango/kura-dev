from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, Driver, User
from accounts.services.auth import issue_tokens


class DriverAccountFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create(
            email="drv-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        tokens = issue_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        self.owner_a = User.objects.create(phone="+2348017770001", role=User.Role.DRIVER)
        self.account_a = Account.objects.create(
            owner_user=self.owner_a, display_name="Fleet A"
        )
        self.driver_a = Driver.objects.create(user=self.owner_a, account=self.account_a)

        self.owner_b = User.objects.create(phone="+2348017770002", role=User.Role.DRIVER)
        self.account_b = Account.objects.create(
            owner_user=self.owner_b, display_name="Fleet B"
        )
        Driver.objects.create(user=self.owner_b, account=self.account_b)

    def test_filter_drivers_by_account(self):
        res = self.client.get(
            "/api/v1/drivers/",
            {"account": str(self.account_a.id)},
        )
        self.assertEqual(res.status_code, 200)
        ids = {row["id"] for row in res.json()["results"]}
        self.assertEqual(ids, {str(self.driver_a.id)})
