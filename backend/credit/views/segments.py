"""Saved Segments CRM ViewSet."""
from __future__ import annotations

from django.db.models import Q
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from accounts.permissions import HasCapability
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok
from credit.models_segments import Segment
from credit.services.segment_crud import SegmentService
from credit.services.segments import (
    ALLOWED_FILTER_KEYS,
    accounts_queryset,
    criteria_summary,
    member_row,
    preview_segment,
)


class SegmentListSerializer(serializers.ModelSerializer):
    criteria_summary = serializers.SerializerMethodField()

    class Meta:
        model = Segment
        fields = [
            "id",
            "name",
            "status",
            "criteria_summary",
            "last_count",
            "updated_at",
            "created_at",
        ]

    def get_criteria_summary(self, obj: Segment) -> str:
        return criteria_summary(obj.criteria)


class SegmentDetailSerializer(serializers.ModelSerializer):
    criteria_summary = serializers.SerializerMethodField()

    class Meta:
        model = Segment
        fields = [
            "id",
            "name",
            "status",
            "criteria",
            "criteria_summary",
            "last_count",
            "last_evaluated_at",
            "created_at",
            "updated_at",
        ]

    def get_criteria_summary(self, obj: Segment) -> str:
        return criteria_summary(obj.criteria)


class SegmentWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    criteria = serializers.DictField()
    status = serializers.ChoiceField(
        choices=Segment.Status.choices, required=False, default=Segment.Status.DRAFT
    )


class SegmentPatchSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    criteria = serializers.DictField(required=False)
    status = serializers.ChoiceField(choices=Segment.Status.choices, required=False)


class PreviewSerializer(serializers.Serializer):
    criteria = serializers.DictField()


class SegmentMemberSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    kura_id = serializers.CharField(allow_blank=True)
    display_name = serializers.CharField()
    phone = serializers.CharField(allow_null=True, required=False)
    status = serializers.CharField()
    kyc_status = serializers.CharField()


class SegmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    http_method_names = ["get", "post", "patch", "head", "options"]
    required_capability = "segments:manage"
    search_fields = ["name"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Segment.objects.none()
        qs = Segment.objects.all()
        status = self.request.query_params.get("status")
        if status and status != "all":
            qs = qs.filter(status=status)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search))
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return SegmentListSerializer
        if self.action == "create":
            return SegmentWriteSerializer
        if self.action == "partial_update":
            return SegmentPatchSerializer
        if self.action == "preview":
            return PreviewSerializer
        if self.action == "members":
            return SegmentMemberSerializer
        return SegmentDetailSerializer

    def create(self, request, *args, **kwargs):
        ser = SegmentWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        row = SegmentService.create(actor=request.user, **ser.validated_data)
        return created(SegmentDetailSerializer(row).data)

    def partial_update(self, request, *args, **kwargs):
        segment = self.get_object()
        ser = SegmentPatchSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        row = SegmentService.update(
            segment=segment, actor=request.user, **ser.validated_data
        )
        return ok(SegmentDetailSerializer(row).data)

    @extend_schema(request=PreviewSerializer, responses={200: dict})
    @action(detail=False, methods=["post"])
    def preview(self, request):
        ser = PreviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = preview_segment(segment_criteria=ser.validated_data["criteria"])
        data["allowed_keys"] = sorted(ALLOWED_FILTER_KEYS)
        return ok(data)

    @extend_schema(responses={200: SegmentDetailSerializer})
    @action(detail=True, methods=["post"])
    def refresh(self, request, pk=None):
        row = SegmentService.refresh_count(
            segment=self.get_object(), actor=request.user
        )
        return ok(SegmentDetailSerializer(row).data)

    @extend_schema(responses={200: SegmentMemberSerializer(many=True)})
    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        segment = self.get_object()
        qs = accounts_queryset(segment.criteria or {})
        page = self.paginate_queryset(qs)
        rows = [member_row(a) for a in (page if page is not None else qs[:100])]
        if page is not None:
            return self.get_paginated_response(rows)
        return ok(rows)
