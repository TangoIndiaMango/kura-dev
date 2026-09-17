"""Subscription expire + auto-renew + price-change warnings (worker / jobs)."""
from __future__ import annotations

import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event
from mobility.models import Subscription
from mobility.services.plans.helpers import owner_user
from mobility.services.plans.pricing import PricingService
from mobility.services.plans.subscriptions import SubscriptionService

logger = logging.getLogger(__name__)


def expire_due_subscriptions(*, limit: int = 200) -> dict:
    """Expire ended plans without auto-renew; charge queued switches when possible."""
    now = timezone.now()
    ids = list(
        Subscription.objects.filter(
            status=Subscription.Status.ACTIVE,
            auto_renew=False,
            ends_at__lte=now,
        )
        .order_by("ends_at")
        .values_list("id", flat=True)[:limit]
    )
    expired = 0
    queued_applied = 0
    for pk in ids:
        sub = (
            Subscription.objects.select_related(
                "account", "plan", "queued_plan", "vehicle", "vehicle__vehicle_model"
            )
            .filter(pk=pk)
            .first()
        )
        if sub is None:
            continue
        if sub.queued_plan_id:
            try:
                SubscriptionService.renew(
                    subscription=sub,
                    idempotency_key=f"queued-end:{sub.id}:{sub.ends_at.isoformat()}",
                    channel="App",
                    skip_pin=True,
                )
                queued_applied += 1
                continue
            except DomainError as exc:
                logger.info(
                    "queued_switch_charge_failed sub=%s code=%s",
                    sub.id,
                    getattr(exc, "code", ""),
                )

        with transaction.atomic():
            locked = (
                Subscription.objects.select_for_update()
                .select_related("account", "plan")
                .filter(pk=pk, status=Subscription.Status.ACTIVE)
                .first()
            )
            if locked is None or locked.auto_renew or locked.ends_at > timezone.now():
                continue
            before = {
                "status": locked.status,
                "queued_plan_id": str(locked.queued_plan_id)
                if locked.queued_plan_id
                else None,
            }
            locked.status = Subscription.Status.EXPIRED
            locked.queued_plan = None
            locked.save(update_fields=["status", "queued_plan", "updated_at"])
            owner = owner_user(locked.account)
            emit_event(
                action="subscription.expired",
                subject_type="subscription",
                subject_id=str(locked.id),
                before=before,
                after={"status": locked.status},
                notify=NotifySpec(
                    user=owner,
                    title="Plan expired",
                    body=f"{locked.plan.name} ended. Renew or continue pay-per-swap.",
                    source="Billing",
                    template_code="plan.expired",
                    link_path="/plans",
                    dedupe_key=f"sub-expired:{locked.id}",
                )
                if owner
                else None,
            )
            expired += 1
    return {"expired": expired, "queued_applied": queued_applied}


def renew_due_subscriptions(*, limit: int = 100) -> dict:
    """Auto-renew at live price; on failure lapse to pay-per-swap (no retry)."""
    now = timezone.now()
    ids = list(
        Subscription.objects.filter(
            status=Subscription.Status.ACTIVE,
            auto_renew=True,
            ends_at__lte=now,
        )
        .order_by("ends_at")
        .values_list("id", flat=True)[:limit]
    )
    renewed = 0
    lapsed = 0
    for pk in ids:
        sub = Subscription.objects.select_related(
            "account",
            "plan",
            "queued_plan",
            "vehicle",
            "vehicle__vehicle_model",
        ).filter(pk=pk).first()
        if sub is None:
            continue
        try:
            SubscriptionService.renew(
                subscription=sub,
                idempotency_key=f"auto-renew:{sub.id}:{sub.ends_at.isoformat()}",
                channel="App",
                skip_pin=True,
            )
            renewed += 1
        except DomainError as exc:
            logger.info(
                "auto_renew_failed sub=%s code=%s", sub.id, getattr(exc, "code", "")
            )
            with transaction.atomic():
                locked = Subscription.objects.select_for_update().get(pk=sub.pk)
                if locked.status != Subscription.Status.ACTIVE:
                    continue
                before = {"status": locked.status}
                locked.status = Subscription.Status.LAPSED_TO_PPS
                locked.auto_renew = False
                locked.queued_plan = None
                locked.save(
                    update_fields=["status", "auto_renew", "queued_plan", "updated_at"]
                )
                owner = owner_user(locked.account)
                emit_event(
                    action="subscription.lapsed_to_pps",
                    subject_type="subscription",
                    subject_id=str(locked.id),
                    before=before,
                    after={"status": locked.status, "error": str(exc)},
                    notify=NotifySpec(
                        user=owner,
                        title="Auto-renew failed",
                        body=(
                            f"We could not renew {locked.plan.name}. "
                            "You are on pay-per-swap until you renew."
                        ),
                        source="Billing",
                        template_code="plan.lapsed",
                        link_path="/plans",
                        dedupe_key=f"sub-lapsed:{locked.id}",
                    )
                    if owner
                    else None,
                )
            lapsed += 1
    return {"renewed": renewed, "lapsed": lapsed}


def notify_price_change_before_renew(*, within_hours: int = 24, limit: int = 200) -> dict:
    """Warn riders ~24h before renew when the live price differs from what they paid."""
    now = timezone.now()
    window_end = now + timedelta(hours=within_hours)
    qs = (
        Subscription.objects.filter(
            status=Subscription.Status.ACTIVE,
            auto_renew=True,
            ends_at__gt=now,
            ends_at__lte=window_end,
        )
        .filter(Q(queued_plan__isnull=True))
        .select_related("account", "plan", "vehicle", "vehicle__vehicle_model")
        .order_by("ends_at")[:limit]
    )
    notified = 0
    for sub in qs:
        try:
            live = PricingService.resolve_plan_list_kobo(
                vehicle_type=sub.vehicle.vehicle_model.vehicle_type,
                period=sub.plan.period,
            )
        except DomainError:
            continue
        if int(live) == int(sub.list_price_kobo):
            continue
        owner = owner_user(sub.account)
        if owner is None:
            continue
        emit_event(
            action="subscription.price_change_warned",
            subject_type="subscription",
            subject_id=str(sub.id),
            metadata={
                "prior_list_kobo": sub.list_price_kobo,
                "live_list_kobo": live,
                "ends_at": sub.ends_at.isoformat(),
            },
            notify=NotifySpec(
                user=owner,
                title="Plan price updated",
                body=(
                    f"Your {sub.plan.name} renews on {sub.ends_at.date()} "
                    f"at the current rate (was ₦{sub.list_price_kobo // 100:,})."
                ),
                source="Billing",
                template_code="plan.price_change",
                link_path="/plans",
                dedupe_key=f"sub-price:{sub.id}:{sub.ends_at.date().isoformat()}",
            ),
        )
        notified += 1
    return {"notified": notified}


def activate_due_price_matrices(*, limit: int = 100) -> dict:
    """Promote SCHEDULED price matrices whose effective_from date has arrived."""
    from mobility.models import PriceMatrix
    from mobility.services.plans.pricing import PricingService

    today = timezone.localdate()
    ids = list(
        PriceMatrix.objects.filter(
            status=PriceMatrix.Status.SCHEDULED,
            effective_from__lte=today,
        )
        .order_by("effective_from", "created_at")
        .values_list("id", flat=True)[:limit]
    )
    activated = 0
    for pk in ids:
        matrix = PriceMatrix.objects.filter(pk=pk).first()
        if matrix is None or matrix.status != PriceMatrix.Status.SCHEDULED:
            continue
        try:
            PricingService.activate_matrix(matrix=matrix, actor=None)
            activated += 1
        except DomainError as exc:
            logger.info(
                "activate_due_matrix_skipped id=%s code=%s",
                pk,
                getattr(exc, "code", ""),
            )
    return {"activated": activated, "candidates": len(ids)}
