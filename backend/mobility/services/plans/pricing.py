"""Resolve live tariffs and bay hold policy (Admin · Pricing)."""
from __future__ import annotations

from datetime import date

from django.db import transaction
from django.utils import timezone

from accounts.helpers.maker_checker import (
    assert_not_self_approve,
    self_approve_audit_metadata,
)
from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import BayHoldPolicy, PriceMatrix, Plan, VehicleType
from mobility.models.choices import normalize_vehicle_type

# Seed tariffs aligned with admin vehicleTariffs.ts (Naira → kobo at write).
_DEFAULT_MATRICES_NAIRA: dict[str, dict[str, int]] = {
    VehicleType.MOTORCYCLE: {
        "daily": 1200,
        "weekly": 6500,
        "monthly": 24000,
        "pay_per_swap": 450,
    },
    VehicleType.TRICYCLE: {
        "daily": 1800,
        "weekly": 9500,
        "monthly": 35000,
        "pay_per_swap": 650,
    },
    VehicleType.BOAT: {
        "daily": 3500,
        "weekly": 18000,
        "monthly": 65000,
        "pay_per_swap": 1200,
    },
}


class PricingService:
    @staticmethod
    def ensure_defaults(*, as_of: date | None = None) -> None:
        """Idempotent seed so settle never depends on env fees."""
        if not BayHoldPolicy.objects.exists():
            BayHoldPolicy.objects.create(
                default_hold_minutes=15, max_extend_minutes=15
            )

        today = as_of or timezone.localdate()
        for vehicle_type, rates in _DEFAULT_MATRICES_NAIRA.items():
            exists = PriceMatrix.objects.filter(
                vehicle_type=vehicle_type,
                status=PriceMatrix.Status.ACTIVE,
            ).exists()
            if exists:
                continue
            PriceMatrix.objects.create(
                vehicle_type=vehicle_type,
                daily_kobo=rates["daily"] * 100,
                weekly_kobo=rates["weekly"] * 100,
                monthly_kobo=rates["monthly"] * 100,
                pay_per_swap_kobo=rates["pay_per_swap"] * 100,
                effective_from=today,
                status=PriceMatrix.Status.ACTIVE,
            )
        from core.management.commands.seed_data.fleet import upsert_catalogue_plans

        upsert_catalogue_plans()
        for vehicle_type in _DEFAULT_MATRICES_NAIRA:
            matrix = (
                PriceMatrix.objects.filter(
                    vehicle_type=vehicle_type,
                    status=PriceMatrix.Status.ACTIVE,
                )
                .order_by("-effective_from", "-created_at")
                .first()
            )
            if matrix is not None:
                PricingService._sync_plan_catalogue_prices(matrix)

    @staticmethod
    def get_hold_policy() -> BayHoldPolicy:
        policy = BayHoldPolicy.objects.order_by("pk").first()
        if policy is None:
            policy = BayHoldPolicy.objects.create(
                default_hold_minutes=15, max_extend_minutes=15
            )
        return policy

    @staticmethod
    def update_hold_policy(
        *,
        default_hold_minutes: int,
        max_extend_minutes: int,
        actor=None,
    ) -> BayHoldPolicy:
        if not (5 <= default_hold_minutes <= 60):
            raise DomainError(
                "VALIDATION_ERROR",
                "default_hold_minutes must be between 5 and 60.",
            )
        if not (5 <= max_extend_minutes <= 60):
            raise DomainError(
                "VALIDATION_ERROR",
                "max_extend_minutes must be between 5 and 60.",
            )
        policy = PricingService.get_hold_policy()
        before = {
            "default_hold_minutes": policy.default_hold_minutes,
            "max_extend_minutes": policy.max_extend_minutes,
        }
        policy.default_hold_minutes = default_hold_minutes
        policy.max_extend_minutes = max_extend_minutes
        policy.save(
            update_fields=["default_hold_minutes", "max_extend_minutes", "updated_at"]
        )
        emit_event(
            action="hold_policy.updated",
            subject_type="hold_policy",
            subject_id=str(policy.id),
            actor=actor,
            before=before,
            after={
                "default_hold_minutes": policy.default_hold_minutes,
                "max_extend_minutes": policy.max_extend_minutes,
            },
        )
        return policy

    @staticmethod
    def active_matrix(
        *,
        vehicle_type: str,
        as_of: date | None = None,
    ) -> PriceMatrix:
        PricingService.ensure_defaults(as_of=as_of)
        today = as_of or timezone.localdate()
        matrix = (
            PriceMatrix.objects.filter(
                vehicle_type=vehicle_type,
                status=PriceMatrix.Status.ACTIVE,
                effective_from__lte=today,
            )
            .order_by("-effective_from", "-created_at")
            .first()
        )
        if matrix is None:
            raise DomainError(
                "PRICE_NOT_CONFIGURED",
                f"No active price matrix for {vehicle_type}.",
                http=409,
            )
        return matrix

    @staticmethod
    def resolve_pps_kobo(*, vehicle_type: str, as_of: date | None = None) -> int:
        return int(
            PricingService.active_matrix(
                vehicle_type=vehicle_type, as_of=as_of
            ).pay_per_swap_kobo
        )

    @staticmethod
    def resolve_plan_list_kobo(*, vehicle_type: str, period: str) -> int:
        matrix = PricingService.active_matrix(vehicle_type=vehicle_type)
        mapping = {
            "day": matrix.daily_kobo,
            "week": matrix.weekly_kobo,
            "month": matrix.monthly_kobo,
            "swap": matrix.pay_per_swap_kobo,
        }
        if period not in mapping:
            raise DomainError("VALIDATION_ERROR", f"Unknown plan period: {period}.")
        return int(mapping[period])

    @classmethod
    def queue_matrix(
        cls,
        *,
        vehicle_type: str,
        daily_kobo: int,
        weekly_kobo: int,
        monthly_kobo: int,
        pay_per_swap_kobo: int,
        effective_from: date,
        actor=None,
    ) -> PriceMatrix:
        for label, value in (
            ("daily_kobo", daily_kobo),
            ("weekly_kobo", weekly_kobo),
            ("monthly_kobo", monthly_kobo),
            ("pay_per_swap_kobo", pay_per_swap_kobo),
        ):
            if value <= 0:
                raise DomainError("VALIDATION_ERROR", f"{label} must be positive.")
        matrix = PriceMatrix.objects.create(
            vehicle_type=normalize_vehicle_type(vehicle_type),
            daily_kobo=daily_kobo,
            weekly_kobo=weekly_kobo,
            monthly_kobo=monthly_kobo,
            pay_per_swap_kobo=pay_per_swap_kobo,
            effective_from=effective_from,
            status=PriceMatrix.Status.PENDING,
            created_by=actor,
        )
        emit_event(
            action="price_matrix.queued",
            subject_type="price_matrix",
            subject_id=str(matrix.id),
            actor=actor,
            after={
                "vehicle_type": vehicle_type,
                "status": matrix.status,
                "effective_from": effective_from.isoformat(),
            },
        )
        return matrix

    @classmethod
    def activate_matrix(cls, *, matrix: PriceMatrix, actor=None) -> PriceMatrix:
        """Publish matrix (maker-checker). Supersedes prior ACTIVE for same vehicle type."""
        if matrix.status not in {
            PriceMatrix.Status.PENDING,
            PriceMatrix.Status.APPROVED,
            PriceMatrix.Status.SCHEDULED,
        }:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot activate matrix in status {matrix.status}.",
                http=409,
            )
        assert_not_self_approve(
            actor=actor,
            created_by_id=matrix.created_by_id,
            message="Creator cannot activate their own price matrix.",
        )
        with transaction.atomic():
            matrix = PriceMatrix.objects.select_for_update().get(pk=matrix.pk)
            PriceMatrix.objects.filter(
                vehicle_type=matrix.vehicle_type,
                status=PriceMatrix.Status.ACTIVE,
            ).exclude(pk=matrix.pk).update(
                status=PriceMatrix.Status.SUPERSEDED,
                updated_at=timezone.now(),
            )
            matrix.status = PriceMatrix.Status.ACTIVE
            matrix.approved_by = actor
            matrix.save(update_fields=["status", "approved_by", "updated_at"])
            cls._sync_plan_catalogue_prices(matrix)
        emit_event(
            action="price_matrix.activated",
            subject_type="price_matrix",
            subject_id=str(matrix.id),
            actor=actor,
            after={
                "vehicle_type": matrix.vehicle_type,
                "pay_per_swap_kobo": matrix.pay_per_swap_kobo,
                "effective_from": str(matrix.effective_from),
                "approved_by_id": str(actor.id) if actor else None,
                "created_by_id": (
                    str(matrix.created_by_id) if matrix.created_by_id else None
                ),
            },
            metadata=self_approve_audit_metadata(
                actor=actor, created_by_id=matrix.created_by_id
            ),
        )
        return matrix

    @staticmethod
    def _sync_plan_catalogue_prices(matrix: PriceMatrix) -> None:
        """Keep catalogue Plan.price_kobo in sync with the active matrix."""
        mapping = {
            Plan.Period.DAY: matrix.daily_kobo,
            Plan.Period.WEEK: matrix.weekly_kobo,
            Plan.Period.MONTH: matrix.monthly_kobo,
            Plan.Period.SWAP: matrix.pay_per_swap_kobo,
        }
        for period, kobo in mapping.items():
            Plan.objects.filter(
                vehicle_type=matrix.vehicle_type,
                period=period,
                is_active=True,
            ).update(price_kobo=kobo, updated_at=timezone.now())
