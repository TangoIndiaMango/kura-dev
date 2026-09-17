"""Segment criteria contract, preview, and account resolution."""
from __future__ import annotations

from datetime import timedelta
from typing import Any
from uuid import UUID

from django.db.models import QuerySet
from django.utils import timezone

from accounts.models import Account
from core.exceptions import DomainError

ALLOWED_FILTER_KEYS = frozenset(
    {
        "status",
        "kyc_status",
        "kind",
        "cooperative_id",
        "min_active_days",
        "max_active_days",
        "min_score",
    }
)
# Stored on offer.segment_criteria to point at a saved Segment row.
META_KEYS = frozenset({"segment_id"})


def validate_criteria(segment_criteria: dict | None) -> dict[str, Any]:
    criteria = segment_criteria or {}
    if not isinstance(criteria, dict):
        raise DomainError(
            "VALIDATION_ERROR",
            "segment_criteria must be an object.",
            http=400,
        )
    unknown = set(criteria.keys()) - ALLOWED_FILTER_KEYS - META_KEYS
    if unknown:
        raise DomainError(
            "VALIDATION_ERROR",
            f"Unsupported segment_criteria keys: {sorted(unknown)}",
            http=400,
        )
    filters = {k: criteria[k] for k in ALLOWED_FILTER_KEYS if k in criteria}
    if "segment_id" in criteria and criteria["segment_id"]:
        return {"segment_id": str(criteria["segment_id"]), **filters}
    if not filters:
        raise DomainError(
            "VALIDATION_ERROR",
            "Provide at least one filter key or segment_id.",
            http=400,
        )
    return filters


CRITERIA_LABELS = {
    "status": "Account status",
    "kyc_status": "KYC",
    "kind": "Account kind",
    "cooperative_id": "Cooperative",
    "min_active_days": "Min tenure",
    "max_active_days": "Max tenure",
    "min_score": "Min credit score",
}

VALUE_LABELS = {
    "status": {
        "ACTIVE": "Active",
        "SUSPENDED": "Suspended",
        "PENDING": "Pending",
        "DEREGISTERED": "Deregistered",
    },
    "kyc_status": {
        "VERIFIED": "Verified",
        "PENDING": "Pending",
        "PROVISIONAL": "Provisional",
        "NONE": "None",
        "REJECTED": "Rejected",
    },
    "kind": {
        "INDIVIDUAL": "Individual",
        "FLEET": "Fleet",
    },
}


def format_criterion_value(key: str, value: Any) -> str:
    if key in ("min_active_days", "max_active_days"):
        return f"{value} days"
    if key == "min_score":
        return str(value)
    mapped = VALUE_LABELS.get(key, {}).get(str(value))
    return mapped if mapped else str(value)


def criteria_summary(criteria: dict | None) -> str:
    raw = criteria or {}
    parts: list[str] = []
    if sid := raw.get("segment_id"):
        parts.append(f"Saved segment {str(sid)[:8]}")
    for key in (
        "status",
        "kyc_status",
        "kind",
        "cooperative_id",
        "min_active_days",
        "max_active_days",
        "min_score",
    ):
        if key not in raw or raw[key] in (None, ""):
            continue
        label = CRITERIA_LABELS.get(key, key)
        parts.append(f"{label}: {format_criterion_value(key, raw[key])}")
    return " · ".join(parts) if parts else "—"


def _expand_saved_segment(criteria: dict[str, Any]) -> dict[str, Any]:
    sid = criteria.get("segment_id")
    if not sid:
        return {k: v for k, v in criteria.items() if k in ALLOWED_FILTER_KEYS}
    from credit.models_segments import Segment

    try:
        seg = Segment.objects.get(pk=sid)
    except (Segment.DoesNotExist, ValueError, TypeError) as exc:
        raise DomainError(
            "SEGMENT_NOT_FOUND",
            "Saved segment not found.",
            http=404,
        ) from exc
    if seg.status != Segment.Status.ACTIVE:
        raise DomainError(
            "SEGMENT_NOT_ACTIVE",
            "Only ACTIVE segments can be used for targeting.",
            http=409,
        )
    nested = dict(seg.criteria or {})
    nested.pop("segment_id", None)
    return validate_criteria(nested)


def accounts_queryset(criteria: dict[str, Any]) -> QuerySet[Account]:
    filters = _expand_saved_segment(validate_criteria(criteria))
    qs = Account.objects.select_related("owner_user")
    if status := filters.get("status"):
        qs = qs.filter(status=status)
    if kyc := filters.get("kyc_status"):
        qs = qs.filter(kyc_status=kyc)
    if kind := filters.get("kind"):
        qs = qs.filter(kind=kind)
    if coop := filters.get("cooperative_id"):
        qs = qs.filter(cooperative_id=coop)

    today = timezone.now().date()
    if (min_days := filters.get("min_active_days")) is not None:
        cutoff = today - timedelta(days=int(min_days))
        qs = qs.filter(created_at__date__lte=cutoff)
    if (max_days := filters.get("max_active_days")) is not None:
        cutoff = today - timedelta(days=int(max_days))
        qs = qs.filter(created_at__date__gte=cutoff)
    if (min_score := filters.get("min_score")) is not None:
        from django.db.models import OuterRef, Subquery
        from credit.models import CreditScore

        latest_score = (
            CreditScore.objects.filter(account_id=OuterRef("pk"))
            .order_by("-computed_at")
            .values("score")[:1]
        )
        qs = qs.annotate(_latest_score=Subquery(latest_score)).filter(
            _latest_score__gte=int(min_score)
        )
    return qs.order_by("created_at")


def member_row(account: Account) -> dict[str, Any]:
    owner = account.owner_user
    return {
        "id": str(account.id),
        "kura_id": account.kura_id or "",
        "display_name": account.display_name,
        "phone": getattr(owner, "phone", None) if owner else None,
        "status": account.status,
        "kyc_status": account.kyc_status,
    }


def preview_segment(
    *,
    segment_criteria: dict | None,
    limit: int = 500,
) -> dict[str, Any]:
    """Count matches and return a small sample of covered operators."""
    qs = accounts_queryset(segment_criteria or {})
    count = qs.count()
    sample_n = min(25, max(1, limit))
    rows = [member_row(a) for a in qs[:sample_n]]
    return {
        "count": count,
        "sample_account_ids": [r["id"] for r in rows],
        "sample": rows,
        "summary": criteria_summary(segment_criteria),
    }


def resolve_account_ids_for_segment(
    *,
    segment_criteria: dict | None,
    limit: int = 500,
    allow_empty: bool = False,
) -> list[UUID]:
    """
    Resolve account UUIDs for offer assign / targeting.

    Criteria example:
      {"status": "ACTIVE", "kyc_status": "VERIFIED", "min_active_days": 60}
    Or: {"segment_id": "<uuid>"} pointing at an ACTIVE Segment.
    """
    qs = accounts_queryset(segment_criteria or {})
    ids = list(qs.values_list("id", flat=True)[:limit])
    if not ids and not allow_empty:
        raise DomainError(
            "SEGMENT_EMPTY",
            "No accounts match this segment_criteria.",
            http=404,
        )
    return ids
