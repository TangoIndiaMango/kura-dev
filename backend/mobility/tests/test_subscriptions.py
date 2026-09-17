"""Subscription purchase / renew / discount / plan entitlement tests."""
from __future__ import annotations

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Account, Driver, User
from accounts.services.auth import issue_pin_grant
from audit.models import AuditEvent
from core.exceptions import DomainError
from finance.models import LedgerTransaction, Payment, Wallet
from finance.services import WalletService
from mobility.models import (
    BatteryType,
    DiscountCampaign,
    Plan,
    Subscription,
    Vehicle,
    VehicleModel,
    VehicleType,
)
from mobility.services.plans.discount_rules import assert_eligible
from mobility.services.plans.pricing import PricingService
from mobility.services.plans.subscriptions import SubscriptionService


class SubscriptionLifecycleTests(TestCase):
    def setUp(self):
        PricingService.ensure_defaults()
        self.user = User.objects.create_user(
            phone="+2348010000001",
            password="x",
            role=User.Role.DRIVER,
        )
        self.user.set_pin("1234")
        self.user.save(update_fields=["pin_hash", "updated_at"])
        self.account = Account.objects.create(
            owner_user=self.user,
            kind=Account.Kind.INDIVIDUAL,
            display_name="Plan Rider",
            status=Account.Status.ACTIVE,
            kyc_status=Account.KycStatus.VERIFIED,
        )
        Driver.objects.create(user=self.user, account=self.account)
        WalletService.get_or_create_wallet(self.account)
        Wallet.objects.filter(account=self.account).update(balance_kobo=5_000_000)
        bt = BatteryType.objects.create(name="Moto 48V", vehicle_type=VehicleType.MOTORCYCLE)
        self.model = VehicleModel.objects.create(
            make="Spiro",
            model="E-Moto",
            vehicle_type=VehicleType.MOTORCYCLE,
            battery_type=bt,
        )
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=self.model,
            registration_plate="LAG-PLAN-1",
            status=Vehicle.Status.ACTIVE,
        )
        self.plan = Plan.objects.create(
            code="MOTO-WEEK",
            name="Weekly Moto",
            vehicle_type=VehicleType.MOTORCYCLE,
            period=Plan.Period.WEEK,
            duration_days=7,
            swap_allowance=20,
            price_kobo=650_000,
            is_active=True,
            status=Plan.Status.ACTIVE,
        )
        self.plan_month = Plan.objects.create(
            code="MOTO-MONTH",
            name="Monthly Moto",
            vehicle_type=VehicleType.MOTORCYCLE,
            period=Plan.Period.MONTH,
            duration_days=30,
            swap_allowance=80,
            price_kobo=2_400_000,
            is_active=True,
            status=Plan.Status.ACTIVE,
        )
        DiscountCampaign.objects.create(
            name="Welcome",
            code="WELCOME-500",
            value_type=DiscountCampaign.ValueType.AMOUNT,
            value=50_000,
            status=DiscountCampaign.Status.ACTIVE,
            applies_to_all_plans=True,
            periods=["weekly", "daily", "monthly"],
            audience=DiscountCampaign.Audience.ALL,
            channels="App · USSD · Hub",
        )

    def _grant(self) -> str:
        return issue_pin_grant(self.user)["pin_grant"]

    def test_purchase_debits_wallet_and_emits_payment(self):
        sub = SubscriptionService.purchase(
            account=self.account,
            vehicle=self.vehicle,
            plan=self.plan,
            actor=self.user,
            pin_grant=self._grant(),
            idempotency_key="sub-buy-1",
        )
        self.assertEqual(sub.status, Subscription.Status.ACTIVE)
        self.assertGreater(sub.amount_kobo, 0)
        wallet = Wallet.objects.get(account=self.account)
        self.assertEqual(wallet.balance_kobo, 5_000_000 - sub.amount_kobo)
        payment = Payment.objects.get(pk=sub.payment_id)
        self.assertEqual(payment.purpose, "PLAN")
        self.assertTrue(
            LedgerTransaction.objects.filter(reference=f"plan-fee:{payment.id}").exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                action="subscription.purchased", subject_id=str(sub.id)
            ).exists()
        )
        again = SubscriptionService.purchase(
            account=self.account,
            vehicle=self.vehicle,
            plan=self.plan,
            actor=self.user,
            pin_grant=self._grant(),
            idempotency_key="sub-buy-1",
        )
        self.assertEqual(again.id, sub.id)

    def test_purchase_requires_pin(self):
        with self.assertRaises(DomainError) as ctx:
            SubscriptionService.purchase(
                account=self.account,
                vehicle=self.vehicle,
                plan=self.plan,
                actor=self.user,
                pin_grant="",
                idempotency_key="sub-nopin",
            )
        self.assertEqual(ctx.exception.code, "PIN_GRANT_REQUIRED")

    def test_discount_reduces_due(self):
        sub = SubscriptionService.purchase(
            account=self.account,
            vehicle=self.vehicle,
            plan=self.plan,
            actor=self.user,
            pin_grant=self._grant(),
            discount_code="WELCOME-500",
            idempotency_key="sub-disc-1",
        )
        self.assertEqual(sub.discount_kobo, 50_000)
        self.assertEqual(sub.amount_kobo, sub.list_price_kobo - 50_000)

    def test_segment_discount_requires_grant(self):
        d = DiscountCampaign.objects.create(
            name="Seg",
            code="SEG-ONLY",
            value_type=DiscountCampaign.ValueType.PERCENT,
            value=10,
            status=DiscountCampaign.Status.ACTIVE,
            applies_to_all_plans=True,
            periods=["weekly"],
            audience=DiscountCampaign.Audience.SEGMENT,
            segment_id="fleet-lagos",
            channels="App · USSD · Hub",
        )
        with self.assertRaises(DomainError):
            assert_eligible(
                discount=d,
                period="week",
                channel="App",
                plan=self.plan,
                vehicle_count=1,
                granted_segment_id="",
            )

    def test_second_active_blocked(self):
        SubscriptionService.purchase(
            account=self.account,
            vehicle=self.vehicle,
            plan=self.plan,
            actor=self.user,
            pin_grant=self._grant(),
            idempotency_key="sub-a",
        )
        with self.assertRaises(DomainError):
            SubscriptionService.purchase(
                account=self.account,
                vehicle=self.vehicle,
                plan=self.plan,
                actor=self.user,
                pin_grant=self._grant(),
                idempotency_key="sub-b",
            )

    def test_queued_switch_keeps_current_plan(self):
        sub = SubscriptionService.purchase(
            account=self.account,
            vehicle=self.vehicle,
            plan=self.plan,
            actor=self.user,
            pin_grant=self._grant(),
            idempotency_key="sub-q",
        )
        # Upgrade may be deferred until period end when immediate=False.
        switched = SubscriptionService.switch(
            subscription=sub,
            plan=self.plan_month,
            actor=self.user,
            immediate=False,
        )
        self.assertEqual(switched.plan_id, self.plan.id)
        self.assertEqual(switched.queued_plan_id, self.plan_month.id)
        self.assertTrue(
            AuditEvent.objects.filter(action="subscription.switch_queued").exists()
        )

        Subscription.objects.filter(pk=sub.pk).update(
            ends_at=timezone.now() - timedelta(minutes=1)
        )
        renewed = SubscriptionService.renew(
            subscription=sub,
            skip_pin=True,
            idempotency_key="sub-q-renew",
        )
        self.assertEqual(renewed.plan_id, self.plan_month.id)
        self.assertIsNone(renewed.queued_plan_id)

    def test_upgrade_defaults_to_immediate(self):
        sub = SubscriptionService.purchase(
            account=self.account,
            vehicle=self.vehicle,
            plan=self.plan,
            actor=self.user,
            pin_grant=self._grant(),
            idempotency_key="sub-up-1",
        )
        preview = SubscriptionService.preview_switch(
            subscription=sub, plan=self.plan_month
        )
        self.assertEqual(preview.kind, "UPGRADE")
        self.assertEqual(preview.effective, "IMMEDIATE")
        self.assertGreater(preview.due_kobo, 0)
        self.assertTrue(preview.pin_required)

        upgraded = SubscriptionService.switch(
            subscription=sub,
            plan=self.plan_month,
            actor=self.user,
            pin_grant=self._grant(),
            idempotency_key="sub-up-buy",
        )
        self.assertEqual(upgraded.plan_id, self.plan_month.id)
        self.assertEqual(upgraded.status, Subscription.Status.ACTIVE)
        self.assertFalse(
            Subscription.objects.filter(
                pk=sub.pk, status=Subscription.Status.ACTIVE
            ).exists()
        )

    def test_downgrade_rejects_immediate_and_queues(self):
        sub = SubscriptionService.purchase(
            account=self.account,
            vehicle=self.vehicle,
            plan=self.plan_month,
            actor=self.user,
            pin_grant=self._grant(),
            idempotency_key="sub-down-1",
        )
        with self.assertRaises(DomainError) as ctx:
            SubscriptionService.switch(
                subscription=sub,
                plan=self.plan,
                actor=self.user,
                immediate=True,
                pin_grant=self._grant(),
            )
        self.assertEqual(ctx.exception.code, "SWITCH_DOWNGRADE_QUEUED")

        preview = SubscriptionService.preview_switch(
            subscription=sub, plan=self.plan, immediate=None
        )
        self.assertEqual(preview.kind, "DOWNGRADE")
        self.assertEqual(preview.effective, "QUEUED")
        self.assertEqual(preview.due_kobo, 0)
        self.assertEqual(preview.refund_kobo, 0)

        queued = SubscriptionService.switch(
            subscription=sub, plan=self.plan, actor=self.user
        )
        self.assertEqual(queued.plan_id, self.plan_month.id)
        self.assertEqual(queued.queued_plan_id, self.plan.id)

    def test_api_switch_preview(self):
        sub = SubscriptionService.purchase(
            account=self.account,
            vehicle=self.vehicle,
            plan=self.plan,
            actor=self.user,
            pin_grant=self._grant(),
            idempotency_key="sub-prev-1",
        )
        client = APIClient()
        client.force_authenticate(self.user)
        res = client.post(
            f"/api/v1/mobility/subscriptions/{sub.id}/switch-preview/",
            {"plan": str(self.plan_month.id)},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        body = res.data
        self.assertEqual(body.get("kind"), "UPGRADE")
        self.assertEqual(body.get("effective"), "IMMEDIATE")
        self.assertGreater(body.get("due_kobo", 0), 0)

    def test_repeat_renew_unique_ledger_refs(self):
        sub = SubscriptionService.purchase(
            account=self.account,
            vehicle=self.vehicle,
            plan=self.plan,
            actor=self.user,
            pin_grant=self._grant(),
            idempotency_key="sub-ledger-1",
        )
        SubscriptionService.renew(
            subscription=sub, skip_pin=True, idempotency_key="renew-1"
        )
        SubscriptionService.renew(
            subscription=sub, skip_pin=True, idempotency_key="renew-2"
        )
        refs = list(
            LedgerTransaction.objects.filter(kind=LedgerTransaction.Kind.PLAN_FEE)
            .order_by("created_at")
            .values_list("reference", flat=True)
        )
        self.assertEqual(len(refs), 3)
        self.assertEqual(len(set(refs)), 3)

    def test_api_purchase_and_receipt(self):
        client = APIClient()
        client.force_authenticate(self.user)
        res = client.post(
            "/api/v1/mobility/subscriptions/",
            {
                "vehicle": str(self.vehicle.id),
                "plan": str(self.plan.id),
                "idempotency_key": "api-sub-1",
                "pin_grant": self._grant(),
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        payment_id = res.data.get("payment_id")
        self.assertTrue(payment_id)
        self.assertIn("queued_plan_id", res.data)
        receipt = client.get(f"/api/v1/finance/payments/{payment_id}/receipt/")
        self.assertEqual(receipt.status_code, 200)
        body = receipt.data if isinstance(receipt.data, dict) else receipt.json()
        self.assertEqual(body.get("purpose"), "PLAN")
        self.assertIn("integrity_hash", body)

    def test_auto_renew_lapse_on_insufficient(self):
        sub = SubscriptionService.purchase(
            account=self.account,
            vehicle=self.vehicle,
            plan=self.plan,
            actor=self.user,
            pin_grant=self._grant(),
            auto_renew=True,
            idempotency_key="sub-lapse-1",
        )
        Subscription.objects.filter(pk=sub.pk).update(
            ends_at=timezone.now() - timedelta(minutes=1)
        )
        Wallet.objects.filter(account=self.account).update(balance_kobo=0)
        from mobility.services.plans.jobs import renew_due_subscriptions

        result = renew_due_subscriptions(limit=10)
        self.assertGreaterEqual(result["lapsed"], 1)
        sub.refresh_from_db()
        self.assertEqual(sub.status, Subscription.Status.LAPSED_TO_PPS)
