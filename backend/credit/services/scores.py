"""Credit score recompute + manual override."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from accounts.models import Account
from core.services.config import ConfigService
from core.services.events import emit_event
from credit.models import CreditLine, CreditScore
from credit.services.eligibility import EligibilityService


class ScoreService:
    @classmethod
    def recompute(cls, *, account: Account, actor=None) -> CreditScore:
        elig = EligibilityService.evaluate(account=account)
        cfg = ConfigService.get_effective("credit")
        score, factors, limit = EligibilityService._compute_score(
            active_days=elig.progress["active_days"],
            on_time_pct=elig.progress["on_time_pct"],
            swaps_per_week=float(elig.progress.get("swaps_per_week") or 0),
            min_days=int(cfg["min_active_days"]),
            min_on_time=int(cfg["min_on_time_pct"]),
            max_amount_kobo=int(cfg["max_amount_kobo"]),
        )
        with transaction.atomic():
            row = CreditScore.objects.create(
                account=account,
                score=score,
                factors=factors,
                recommended_limit_kobo=limit,
                version="v1",
                computed_by=CreditScore.ComputedBy.SYSTEM,
                computed_at=timezone.now(),
            )
            line, _ = CreditLine.objects.get_or_create(
                account=account,
                defaults={"limit_kobo": limit, "status": CreditLine.Status.ELIGIBLE},
            )
            if line.status != CreditLine.Status.CLOSED:
                line.score = row
                line.limit_kobo = limit
                if score >= int(cfg["score_threshold"]) and line.status == CreditLine.Status.ELIGIBLE:
                    pass
                line.save(update_fields=["score", "limit_kobo", "updated_at"])
        emit_event(
            action="credit.score_recomputed",
            subject_type="credit_score",
            subject_id=str(row.id),
            actor=actor,
            after={"score": score, "recommended_limit_kobo": limit},
        )
        return row

    @classmethod
    def override(
        cls,
        *,
        account: Account,
        score: int,
        recommended_limit_kobo: int,
        reason: str,
        actor,
    ) -> CreditScore:
        if score < 0 or score > 100:
            from core.exceptions import DomainError

            raise DomainError("VALIDATION_ERROR", "score must be 0–100.", http=400)
        with transaction.atomic():
            row = CreditScore.objects.create(
                account=account,
                score=score,
                factors={"override": True},
                recommended_limit_kobo=recommended_limit_kobo,
                version="manual",
                computed_by=CreditScore.ComputedBy.MANUAL,
                override_reason=(reason or "")[:255],
                override_by=actor,
                computed_at=timezone.now(),
            )
            line, _ = CreditLine.objects.get_or_create(
                account=account,
                defaults={
                    "limit_kobo": recommended_limit_kobo,
                    "status": CreditLine.Status.ELIGIBLE,
                },
            )
            line.score = row
            line.limit_kobo = recommended_limit_kobo
            line.save(update_fields=["score", "limit_kobo", "updated_at"])
        emit_event(
            action="credit.score_override",
            subject_type="credit_score",
            subject_id=str(row.id),
            actor=actor,
            after={
                "score": score,
                "recommended_limit_kobo": recommended_limit_kobo,
                "reason": reason,
            },
        )
        return row
