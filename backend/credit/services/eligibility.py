"""Credit eligibility + behavioural score snapshot."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from django.utils import timezone

from accounts.models import Account
from accounts.services.devices import DeviceTrustService
from core.services.config import ConfigService
from credit.models import CreditLine, CreditScore, Loan
from mobility.models import Swap


@dataclass(frozen=True, slots=True)
class EligibilityResult:
    eligible: bool
    score: int
    threshold: int
    recommended_limit_kobo: int
    kyc_verified: bool
    loan_active: bool
    progress: dict[str, Any]
    blockers: list[str]
    credit_line_status: str | None
    payload: dict[str, Any]


class EligibilityService:
    @classmethod
    def evaluate(cls, *, account: Account, device_id: str = "") -> EligibilityResult:
        cfg = ConfigService.get_effective("credit")
        threshold = int(cfg["score_threshold"])
        min_days = int(cfg["min_active_days"])
        min_on_time = int(cfg["min_on_time_pct"])
        min_trusted = int(cfg["min_trusted_device_days"])

        now = timezone.now()
        active_days = max(0, (now.date() - account.created_at.date()).days)
        swap_stats = cls._swap_stats(account)
        on_time_pct = swap_stats["on_time_pct"]
        trusted_days = DeviceTrustService.max_trusted_days(account=account)
        this_browser_days = DeviceTrustService.current_device_days(
            account=account, device_id=device_id
        )

        score_row = (
            CreditScore.objects.filter(account=account).order_by("-computed_at").first()
        )
        if score_row is None:
            score, factors, limit = cls._compute_score(
                active_days=active_days,
                on_time_pct=on_time_pct,
                swaps_per_week=swap_stats["swaps_per_week"],
                min_days=min_days,
                min_on_time=min_on_time,
                max_amount_kobo=int(cfg["max_amount_kobo"]),
            )
        else:
            score = int(score_row.score)
            factors = score_row.factors or {}
            limit = int(score_row.recommended_limit_kobo)

        kyc_ok = account.kyc_status == Account.KycStatus.VERIFIED
        loan_active = Loan.objects.filter(
            account=account,
            status__in=[
                Loan.Status.ACTIVE,
                Loan.Status.GRACE,
                Loan.Status.RESTRICTED,
            ],
        ).exists()
        line = CreditLine.objects.filter(account=account).first()
        line_status = line.status if line else None

        blockers: list[str] = []
        if not ConfigService.is_enabled("credit"):
            blockers.append("CREDIT_DISABLED")
        if active_days < min_days:
            blockers.append("ACTIVE_DAYS")
        if on_time_pct < min_on_time:
            blockers.append("ON_TIME")
        if trusted_days < min_trusted:
            blockers.append("TRUSTED_DEVICE")
        if score < threshold:
            blockers.append("SCORE")
        if not kyc_ok:
            blockers.append("KYC")
        if loan_active:
            blockers.append("LOAN_ACTIVE")
        if line_status == CreditLine.Status.RESTRICTED:
            blockers.append("LINE_RESTRICTED")
        if line_status == CreditLine.Status.CLOSED:
            blockers.append("LINE_CLOSED")
        if account.status != Account.Status.ACTIVE:
            blockers.append("ACCOUNT_STATUS")
        risk_status = getattr(account, "risk_status", None) or Account.RiskStatus.NORMAL
        if risk_status != Account.RiskStatus.NORMAL:
            blockers.append("RISK_STATUS")

        eligible = len(blockers) == 0
        progress = {
            "active_days": active_days,
            "active_days_required": min_days,
            "on_time_pct": on_time_pct,
            "on_time_required_pct": min_on_time,
            "trusted_device_days": trusted_days,
            "trusted_device_required_days": min_trusted,
            "this_browser_days": this_browser_days,
            "swaps_per_week": swap_stats["swaps_per_week"],
            "factors": factors,
            "device_trust_note": (
                "Trust is per browser (this install). Clearing site data or using "
                "Incognito starts a new browser clock."
            ),
        }
        payload = {
            "eligible": eligible,
            "score": score,
            "threshold": threshold,
            "recommended_limit_kobo": limit if eligible else 0,
            "kyc_verified": kyc_ok,
            "loan_active": loan_active,
            "risk_status": risk_status,
            "progress": progress,
            "blockers": blockers,
            "credit_line_status": line_status,
            "credit_enabled": ConfigService.is_enabled("credit"),
            "offers_enabled": ConfigService.is_enabled("offers"),
        }
        return EligibilityResult(
            eligible=eligible,
            score=score,
            threshold=threshold,
            recommended_limit_kobo=limit if eligible else 0,
            kyc_verified=kyc_ok,
            loan_active=loan_active,
            progress=progress,
            blockers=blockers,
            credit_line_status=line_status,
            payload=payload,
        )

    @staticmethod
    def _swap_stats(account: Account) -> dict[str, Any]:
        since = timezone.now() - timedelta(days=60)
        completed = Swap.objects.filter(
            account=account,
            status=Swap.Status.COMPLETED,
            created_at__gte=since,
        ).count()
        # MVP proxy: completed swaps count as on-time; failed as miss
        failed = Swap.objects.filter(
            account=account,
            status=Swap.Status.FAILED,
            created_at__gte=since,
        ).count()
        total = completed + failed
        on_time_pct = int(round(100 * completed / total)) if total else 0
        weeks = 60 / 7
        swaps_per_week = round(completed / weeks, 1) if weeks else 0.0
        return {"on_time_pct": on_time_pct, "swaps_per_week": swaps_per_week}

    @staticmethod
    def _compute_score(
        *,
        active_days: int,
        on_time_pct: int,
        swaps_per_week: float,
        min_days: int,
        min_on_time: int,
        max_amount_kobo: int,
    ) -> tuple[int, dict, int]:
        tenure = min(40, int(40 * active_days / max(min_days, 1)))
        ontime = min(40, int(40 * on_time_pct / max(min_on_time, 1)))
        freq = min(20, int(min(swaps_per_week, 10) * 2))
        score = max(0, min(100, tenure + ontime + freq))
        factors = {
            "tenure_pts": tenure,
            "on_time_pts": ontime,
            "frequency_pts": freq,
        }
        limit = 0
        if score >= 60:
            limit = int(max_amount_kobo * score / 100)
            limit = max(500_000, min(max_amount_kobo, (limit // 100_000) * 100_000))
        return score, factors, limit
