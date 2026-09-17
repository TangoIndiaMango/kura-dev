"""Impact story CMS mutations with audit."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from analytics.models import ImpactStory
from core.exceptions import DomainError
from core.services.events import emit_event


class ImpactStoryService:
    @staticmethod
    @transaction.atomic
    def create(*, data: dict, actor=None) -> ImpactStory:
        title = (data.get("title") or "").strip()[:160]
        if not title:
            raise DomainError("VALIDATION", "Title is required.", http=400)
        story = ImpactStory.objects.create(
            title=title,
            region=(data.get("region") or "").strip()[:80],
            metric_highlight=(data.get("metric_highlight") or "").strip()[:120],
            partners=(data.get("partners") or "").strip()[:200],
            summary=(data.get("summary") or "").strip(),
            status=data.get("status") or ImpactStory.Status.DRAFT,
            created_by=actor,
            raw=dict(data.get("raw") or {}),
        )
        emit_event(
            action="impact_story.created",
            subject_type="impact_story",
            subject_id=str(story.id),
            subject_label=story.title,
            actor=actor,
            after={"status": story.status, "title": story.title},
        )
        return story

    @staticmethod
    @transaction.atomic
    def update(*, story: ImpactStory, data: dict, actor=None) -> ImpactStory:
        locked = ImpactStory.objects.select_for_update().get(pk=story.pk)
        before = {"status": locked.status, "title": locked.title}
        for field in (
            "title",
            "region",
            "metric_highlight",
            "partners",
            "summary",
            "status",
        ):
            if field in data and data[field] is not None:
                setattr(locked, field, data[field])
        if "raw" in data and data["raw"] is not None:
            locked.raw = dict(data["raw"])
        locked.save()
        emit_event(
            action="impact_story.updated",
            subject_type="impact_story",
            subject_id=str(locked.id),
            subject_label=locked.title,
            actor=actor,
            before=before,
            after={"status": locked.status, "title": locked.title},
        )
        return locked

    @staticmethod
    @transaction.atomic
    def publish(*, story: ImpactStory, actor=None) -> ImpactStory:
        locked = ImpactStory.objects.select_for_update().get(pk=story.pk)
        before = locked.status
        locked.status = ImpactStory.Status.PUBLISHED
        locked.published_at = timezone.now()
        locked.save(update_fields=["status", "published_at", "updated_at"])
        emit_event(
            action="impact_story.published",
            subject_type="impact_story",
            subject_id=str(locked.id),
            subject_label=locked.title,
            actor=actor,
            before={"status": before},
            after={"status": locked.status},
        )
        return locked
