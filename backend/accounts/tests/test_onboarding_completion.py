from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, User
from accounts.services.auth import issue_tokens
from audit.models import AuditEvent


class OnboardingCompletionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(
            phone="+2348019090909",
            role=User.Role.DRIVER,
            onboarding_step=User.OnboardingStep.PROFILE,
        )
        self.account = Account.objects.create(
            owner_user=self.user,
            display_name="Resume Rider",
        )
        self.client = APIClient()
        tokens = issue_tokens(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_completion_does_not_require_a_vehicle(self):
        response = self.client.post(
            "/api/v1/auth/onboarding/complete/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.user.refresh_from_db()
        self.assertEqual(self.user.onboarding_step, User.OnboardingStep.DONE)

    def test_completion_persists_and_audits(self):
        response = self.client.post(
            "/api/v1/auth/onboarding/complete/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.user.refresh_from_db()
        self.assertEqual(self.user.onboarding_step, User.OnboardingStep.DONE)
        self.assertTrue(
            AuditEvent.objects.filter(
                action="account.onboarding_completed",
                subject_id=str(self.account.id),
            ).exists()
        )

    def test_me_releases_riders_parked_on_vehicle_step(self):
        self.user.onboarding_step = User.OnboardingStep.VEHICLE
        self.user.save(update_fields=["onboarding_step"])

        response = self.client.get("/api/v1/auth/me/")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["onboarding_step"], "home")
        self.user.refresh_from_db()
        self.assertEqual(self.user.onboarding_step, User.OnboardingStep.DONE)
