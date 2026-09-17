"""Maker-checker Super Admin bypass."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.helpers.maker_checker import (
    assert_not_self_approve,
    can_bypass_maker_checker,
)
from core.exceptions import DomainError
from mobility.models import BatteryType, VehicleType
from mobility.services.batteries.types import BatteryTypeService
from mobility.services.plans.pricing import PricingService
from mobility.models import PriceMatrix

User = get_user_model()


class MakerCheckerBypassTests(TestCase):
    def setUp(self):
        self.ops = User.objects.create_user(
            phone="+2348033500001",
            password="x",
            role="OPS_MANAGER",
            is_staff=True,
        )
        self.super_admin = User.objects.create_user(
            phone="+2348033500002",
            password="x",
            role="SUPER_ADMIN",
            is_staff=True,
            is_superuser=True,
        )

    def test_helper_recognises_super_admin(self):
        self.assertFalse(can_bypass_maker_checker(self.ops))
        self.assertTrue(can_bypass_maker_checker(self.super_admin))

    def test_assert_blocks_non_super_self_approve(self):
        with self.assertRaises(DomainError) as ctx:
            assert_not_self_approve(
                actor=self.ops,
                created_by_id=self.ops.id,
                message="nope",
            )
        self.assertEqual(ctx.exception.code, "APPROVAL_FORBIDDEN")

    def test_assert_allows_super_self_approve(self):
        assert_not_self_approve(
            actor=self.super_admin,
            created_by_id=self.super_admin.id,
            message="nope",
        )

    def test_battery_type_super_admin_self_activate(self):
        row = BatteryTypeService.create(
            data={"name": "Self Type 72V", "vehicle_type": VehicleType.MOTORCYCLE},
            actor=self.super_admin,
        )
        activated = BatteryTypeService.activate(
            battery_type=row, actor=self.super_admin
        )
        self.assertEqual(activated.status, BatteryType.Status.ACTIVE)

    def test_battery_type_creator_blocked(self):
        row = BatteryTypeService.create(
            data={"name": "Blocked Type", "vehicle_type": VehicleType.MOTORCYCLE},
            actor=self.ops,
        )
        with self.assertRaises(DomainError) as ctx:
            BatteryTypeService.activate(battery_type=row, actor=self.ops)
        self.assertEqual(ctx.exception.code, "APPROVAL_FORBIDDEN")

    def test_price_matrix_super_admin_self_activate(self):
        from django.utils import timezone

        matrix = PriceMatrix.objects.create(
            vehicle_type=VehicleType.MOTORCYCLE,
            daily_kobo=100_000,
            weekly_kobo=500_000,
            monthly_kobo=1_500_000,
            pay_per_swap_kobo=45_000,
            effective_from=timezone.localdate(),
            status=PriceMatrix.Status.PENDING,
            created_by=self.super_admin,
        )
        activated = PricingService.activate_matrix(
            matrix=matrix, actor=self.super_admin
        )
        self.assertEqual(activated.status, PriceMatrix.Status.ACTIVE)
