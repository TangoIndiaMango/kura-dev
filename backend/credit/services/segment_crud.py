"""Segment CRM create / update / refresh (audit on mutations)."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.services.events import emit_event
from credit.models_segments import Segment
from credit.services.segments import (
    ALLOWED_FILTER_KEYS,
    criteria_summary,
    preview_segment,
    validate_criteria,
)


def _persistable_criteria(criteria: dict | None) -> dict:
    raw = {k: v for k, v in (criteria or {}).items() if k in ALLOWED_FILTER_KEYS}
    return validate_criteria(raw)


class SegmentService:
    @classmethod
    @transaction.atomic
    def create(
        cls,
        *,
        name: str,
        criteria: dict | None = None,
        status: str = Segment.Status.DRAFT,
        actor=None,
    ) -> Segment:
        validated = _persistable_criteria(criteria)
        preview = preview_segment(segment_criteria=validated)
        row = Segment.objects.create(
            name=name.strip(),
            criteria=validated,
            status=status,
            last_count=preview["count"],
            last_evaluated_at=timezone.now(),
        )
        emit_event(
            action="segment.created",
            subject_type="segment",
            subject_id=str(row.id),
            actor=actor,
            after={
                "name": row.name,
                "status": row.status,
                "summary": criteria_summary(row.criteria),
                "last_count": row.last_count,
            },
        )
        return row

    @classmethod
    @transaction.atomic
    def update(
        cls,
        *,
        segment: Segment,
        actor=None,
        name: str | None = None,
        criteria: dict | None = None,
        status: str | None = None,
    ) -> Segment:
        before = {
            "name": segment.name,
            "status": segment.status,
            "last_count": segment.last_count,
        }
        if name is not None:
            segment.name = name.strip()
        if criteria is not None:
            validated = _persistable_criteria(criteria)
            segment.criteria = validated
            preview = preview_segment(segment_criteria=validated)
            segment.last_count = preview["count"]
            segment.last_evaluated_at = timezone.now()
        if status is not None:
            if status not in Segment.Status.values:
                raise DomainError(
                    "VALIDATION_ERROR",
                    f"Invalid status: {status}",
                    http=400,
                )
            segment.status = status
        segment.save()
        emit_event(
            action="segment.updated",
            subject_type="segment",
            subject_id=str(segment.id),
            actor=actor,
            before=before,
            after={
                "name": segment.name,
                "status": segment.status,
                "summary": criteria_summary(segment.criteria),
                "last_count": segment.last_count,
            },
        )
        return segment

    @classmethod
    @transaction.atomic
    def refresh_count(cls, *, segment: Segment, actor=None) -> Segment:
        preview = preview_segment(segment_criteria=segment.criteria)
        before = {"last_count": segment.last_count}
        segment.last_count = preview["count"]
        segment.last_evaluated_at = timezone.now()
        segment.save(update_fields=["last_count", "last_evaluated_at", "updated_at"])
        emit_event(
            action="segment.refreshed",
            subject_type="segment",
            subject_id=str(segment.id),
            actor=actor,
            before=before,
            after={"last_count": segment.last_count},
        )
        return segment
