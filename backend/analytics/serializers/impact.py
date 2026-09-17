"""Impact serializers — list columns; detail for CMS; stats envelope."""
from __future__ import annotations

from rest_framework import serializers

from analytics.models import ImpactStory


class ImpactStoryListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImpactStory
        fields = [
            "id",
            "title",
            "region",
            "metric_highlight",
            "partners",
            "status",
            "published_at",
            "created_at",
        ]


class ImpactStoryDetailSerializer(ImpactStoryListSerializer):
    created_by_id = serializers.UUIDField(
        source="created_by.id", read_only=True, allow_null=True
    )

    class Meta(ImpactStoryListSerializer.Meta):
        fields = [
            *ImpactStoryListSerializer.Meta.fields,
            "summary",
            "created_by_id",
            "raw",
            "updated_at",
        ]


class ImpactStoryWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=160, required=False)
    region = serializers.CharField(max_length=80, required=False, allow_blank=True)
    metric_highlight = serializers.CharField(
        max_length=120, required=False, allow_blank=True
    )
    partners = serializers.CharField(max_length=200, required=False, allow_blank=True)
    summary = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=ImpactStory.Status.choices, required=False
    )
    raw = serializers.DictField(required=False)

    def validate(self, attrs):
        if self.partial:
            return attrs
        if not (attrs.get("title") or "").strip():
            raise serializers.ValidationError({"title": "This field is required."})
        return attrs
