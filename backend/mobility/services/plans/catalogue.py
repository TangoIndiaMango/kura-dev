"""Admin catalogue Plan create / update / activate / deactivate."""
from __future__ import annotations

from django.db import transaction

from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import Plan, VehicleType


class PlanCatalogueService:
    @staticmethod
    def create(
        *,
        code: str,
        name: str,
        vehicle_type: str,
        period: str,
        duration_days: int | None,
        swap_allowance: int | None,
        price_kobo: int,
        description: str = "",
        auto_renew_default: bool = False,
        actor=None,
    ) -> Plan:
        code = (code or "").strip().upper()
        if not code:
            raise DomainError("VALIDATION_ERROR", "Plan code is required.")
        if vehicle_type not in {c.value for c in VehicleType}:
            raise DomainError("VALIDATION_ERROR", f"Unknown vehicle type: {vehicle_type}.")
        if period not in {c.value for c in Plan.Period}:
            raise DomainError("VALIDATION_ERROR", f"Unknown period: {period}.")
        if price_kobo < 0:
            raise DomainError("VALIDATION_ERROR", "price_kobo must be ≥ 0.")
        if Plan.objects.filter(code=code).exists():
            raise DomainError("CONFLICT", f"Plan code {code} already exists.", http=409)

        with transaction.atomic():
            plan = Plan.objects.create(
                code=code,
                name=name.strip(),
                vehicle_type=vehicle_type,
                period=period,
                duration_days=duration_days,
                swap_allowance=swap_allowance,
                price_kobo=price_kobo,
                description=description or "",
                auto_renew_default=auto_renew_default,
                status=Plan.Status.ACTIVE,
                is_active=True,
            )
            emit_event(
                action="plan.created",
                subject_type="plan",
                subject_id=str(plan.id),
                subject_label=plan.code,
                actor=actor,
                after={
                    "code": plan.code,
                    "vehicle_type": plan.vehicle_type,
                    "period": plan.period,
                    "price_kobo": plan.price_kobo,
                    "status": plan.status,
                },
            )
        return plan

    @staticmethod
    def update(
        *,
        plan: Plan,
        name: str | None = None,
        description: str | None = None,
        duration_days: int | None = None,
        swap_allowance: int | None = None,
        price_kobo: int | None = None,
        auto_renew_default: bool | None = None,
        actor=None,
    ) -> Plan:
        before = {
            "name": plan.name,
            "description": plan.description,
            "duration_days": plan.duration_days,
            "swap_allowance": plan.swap_allowance,
            "price_kobo": plan.price_kobo,
            "auto_renew_default": plan.auto_renew_default,
        }
        dirty: list[str] = []
        if name is not None and name.strip() != plan.name:
            plan.name = name.strip()
            dirty.append("name")
        if description is not None and description != plan.description:
            plan.description = description
            dirty.append("description")
        if duration_days is not None and duration_days != plan.duration_days:
            plan.duration_days = duration_days
            dirty.append("duration_days")
        if swap_allowance is not None and swap_allowance != plan.swap_allowance:
            plan.swap_allowance = swap_allowance
            dirty.append("swap_allowance")
        if price_kobo is not None and price_kobo != plan.price_kobo:
            if price_kobo < 0:
                raise DomainError("VALIDATION_ERROR", "price_kobo must be ≥ 0.")
            plan.price_kobo = price_kobo
            dirty.append("price_kobo")
        if (
            auto_renew_default is not None
            and auto_renew_default != plan.auto_renew_default
        ):
            plan.auto_renew_default = auto_renew_default
            dirty.append("auto_renew_default")
        if not dirty:
            return plan
        dirty.append("updated_at")
        with transaction.atomic():
            plan.save(update_fields=dirty)
            emit_event(
                action="plan.updated",
                subject_type="plan",
                subject_id=str(plan.id),
                subject_label=plan.code,
                actor=actor,
                before=before,
                after={
                    "name": plan.name,
                    "description": plan.description,
                    "duration_days": plan.duration_days,
                    "swap_allowance": plan.swap_allowance,
                    "price_kobo": plan.price_kobo,
                    "auto_renew_default": plan.auto_renew_default,
                },
            )
        return plan

    @staticmethod
    def activate(*, plan: Plan, actor=None) -> Plan:
        if plan.status == Plan.Status.ACTIVE and plan.is_active:
            return plan
        before = {"status": plan.status, "is_active": plan.is_active}
        with transaction.atomic():
            plan.status = Plan.Status.ACTIVE
            plan.is_active = True
            plan.save(update_fields=["status", "is_active", "updated_at"])
            emit_event(
                action="plan.activated",
                subject_type="plan",
                subject_id=str(plan.id),
                subject_label=plan.code,
                actor=actor,
                before=before,
                after={"status": plan.status, "is_active": plan.is_active},
            )
        return plan

    @staticmethod
    def deactivate(*, plan: Plan, actor=None) -> Plan:
        if plan.status == Plan.Status.DEACTIVATED and not plan.is_active:
            return plan
        before = {"status": plan.status, "is_active": plan.is_active}
        with transaction.atomic():
            plan.status = Plan.Status.DEACTIVATED
            plan.is_active = False
            plan.save(update_fields=["status", "is_active", "updated_at"])
            emit_event(
                action="plan.deactivated",
                subject_type="plan",
                subject_id=str(plan.id),
                subject_label=plan.code,
                actor=actor,
                before=before,
                after={"status": plan.status, "is_active": plan.is_active},
            )
        return plan
