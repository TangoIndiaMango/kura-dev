"""Discount quote + atomic consume (race-safe redemption counters)."""
from __future__ import annotations

from dataclasses import dataclass

from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from accounts.helpers.maker_checker import (
    assert_not_self_approve,
    self_approve_audit_metadata,
)
from core.exceptions import DomainError
from core.services.events import emit_event
from mobility.models import Plan
from mobility.models import DiscountCampaign, DiscountRedemption
from mobility.services.plans.discount_rules import (
    assert_eligible,
    assert_live_status,
    compute_discount_kobo,
    normalize_code,
    period_key,
    value_label,
)


@dataclass(frozen=True, slots=True)
class DiscountQuote:
    discount: DiscountCampaign
    list_price_kobo: int
    discount_kobo: int
    due_kobo: int
    code: str
    value_label: str


class DiscountService:
    @classmethod
    def quote(
        cls,
        *,
        code: str,
        list_price_kobo: int,
        period: str,
        channel: str = "App",
        plan: Plan | None = None,
        vehicle_count: int = 1,
        granted_segment_id: str = "",
    ) -> DiscountQuote:
        if list_price_kobo <= 0:
            raise DomainError(
                "DISCOUNT_NOT_APPLICABLE",
                "No charge on this payment — discount does not apply.",
                http=400,
            )
        discount = cls._load_live(code)
        assert_eligible(
            discount=discount,
            period=period,
            channel=channel,
            plan=plan,
            vehicle_count=vehicle_count,
            granted_segment_id=granted_segment_id,
        )
        off = compute_discount_kobo(
            discount=discount, list_price_kobo=list_price_kobo
        )
        return DiscountQuote(
            discount=discount,
            list_price_kobo=list_price_kobo,
            discount_kobo=off,
            due_kobo=max(0, list_price_kobo - off),
            code=discount.code,
            value_label=value_label(discount),
        )

    @classmethod
    def consume(
        cls,
        *,
        code: str,
        list_price_kobo: int,
        period: str,
        channel: str,
        account,
        plan: Plan | None = None,
        vehicle_count: int = 1,
        granted_segment_id: str = "",
        payment=None,
        subscription=None,
        idempotency_key: str = "",
    ) -> DiscountQuote:
        key = (idempotency_key or "").strip()
        if key:
            existing = DiscountRedemption.objects.filter(idempotency_key=key).first()
            if existing is not None:
                return DiscountQuote(
                    discount=existing.discount,
                    list_price_kobo=existing.list_price_kobo,
                    discount_kobo=existing.discount_kobo,
                    due_kobo=existing.due_kobo,
                    code=existing.discount.code,
                    value_label=value_label(existing.discount),
                )

        with transaction.atomic():
            discount = (
                DiscountCampaign.objects.select_for_update()
                .filter(code=normalize_code(code))
                .first()
            )
            if discount is None:
                raise DomainError("DISCOUNT_INVALID", "Code not found.", http=404)
            assert_live_status(discount)
            assert_eligible(
                discount=discount,
                period=period,
                channel=channel,
                plan=plan,
                vehicle_count=vehicle_count,
                granted_segment_id=granted_segment_id,
            )
            if discount.max_per_account and discount.max_per_account > 0:
                used = DiscountRedemption.objects.filter(
                    discount=discount, account=account
                ).count()
                if used >= discount.max_per_account:
                    raise DomainError(
                        "DISCOUNT_EXHAUSTED",
                        "This account has already used this code.",
                        http=409,
                    )

            updated = DiscountCampaign.objects.filter(pk=discount.pk)
            if discount.max_redemptions is not None:
                updated = updated.filter(redemptions_count__lt=discount.max_redemptions)
            n = updated.update(
                redemptions_count=F("redemptions_count") + 1,
                updated_at=timezone.now(),
            )
            if n != 1:
                raise DomainError(
                    "DISCOUNT_EXHAUSTED",
                    "This code has no remaining redemptions.",
                    http=409,
                )

            discount.refresh_from_db()
            off = compute_discount_kobo(
                discount=discount, list_price_kobo=list_price_kobo
            )
            due = max(0, list_price_kobo - off)
            try:
                DiscountRedemption.objects.create(
                    discount=discount,
                    account=account,
                    payment=payment,
                    subscription=subscription,
                    list_price_kobo=list_price_kobo,
                    discount_kobo=off,
                    due_kobo=due,
                    channel=channel,
                    period=period_key(period),
                    idempotency_key=key or None,
                )
            except IntegrityError:
                if key:
                    existing = DiscountRedemption.objects.filter(
                        idempotency_key=key
                    ).first()
                    if existing is not None:
                        return DiscountQuote(
                            discount=existing.discount,
                            list_price_kobo=existing.list_price_kobo,
                            discount_kobo=existing.discount_kobo,
                            due_kobo=existing.due_kobo,
                            code=existing.discount.code,
                            value_label=value_label(existing.discount),
                        )
                raise

            return DiscountQuote(
                discount=discount,
                list_price_kobo=list_price_kobo,
                discount_kobo=off,
                due_kobo=due,
                code=discount.code,
                value_label=value_label(discount),
            )

    @classmethod
    def activate(cls, *, discount: DiscountCampaign, actor=None) -> DiscountCampaign:
        if discount.status not in {
            DiscountCampaign.Status.PENDING,
            DiscountCampaign.Status.SCHEDULED,
            DiscountCampaign.Status.DRAFT,
        }:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot activate discount in status {discount.status}.",
                http=409,
            )
        assert_not_self_approve(
            actor=actor,
            created_by_id=discount.created_by_id,
            message="Creator cannot activate their own discount.",
        )
        before_status = discount.status
        discount.status = DiscountCampaign.Status.ACTIVE
        discount.approved_by = actor
        discount.save(update_fields=["status", "approved_by", "updated_at"])
        emit_event(
            action="discount.activated",
            subject_type="discount",
            subject_id=str(discount.id),
            actor=actor,
            subject_label=discount.code,
            before={"status": before_status},
            after={
                "status": discount.status,
                "code": discount.code,
                "approved_by_id": str(actor.id) if actor else None,
                "created_by_id": (
                    str(discount.created_by_id) if discount.created_by_id else None
                ),
            },
            metadata=self_approve_audit_metadata(
                actor=actor, created_by_id=discount.created_by_id
            ),
        )
        return discount

    @classmethod
    def _load_live(cls, code: str) -> DiscountCampaign:
        discount = DiscountCampaign.objects.filter(code=normalize_code(code)).first()
        if discount is None:
            raise DomainError("DISCOUNT_INVALID", "Code not found.", http=404)
        assert_live_status(discount)
        return discount
