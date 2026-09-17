"""Path B retrofit wizard ViewSet."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import HasCapability
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok
from mobility.models import Retrofit
from mobility.serializers.engines import (
    EngineIntakeSerializer,
    RetrofitChecklistSerializer,
    RetrofitCreateSerializer,
    RetrofitDetailSerializer,
    RetrofitInstallSerializer,
    RetrofitListSerializer,
)
from mobility.services.engines import RetrofitService


class RetrofitViewSet(viewsets.GenericViewSet):
    http_method_names = ["get", "post", "head", "options"]
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    search_fields = [
        "eboarder_serial",
        "vehicle__registration_plate",
        "account__display_name",
        "petrol_engine__tag",
    ]
    ordering_fields = ["created_at", "status"]
    capability_map = {
        "list": "engines:manage",
        "retrieve": "engines:manage",
        "create": "engines:manage",
        "engine_intake": "engines:manage",
        "install": "engines:manage",
        "checklist": "engines:manage",
        "activate": "engines:manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Retrofit.objects.none()
        qs = Retrofit.objects.select_related(
            "account",
            "vehicle",
            "petrol_engine",
            "petrol_engine__storage_hub",
            "agent",
        ).order_by("-created_at")
        status = (self.request.query_params.get("status") or "").strip()
        if status:
            qs = qs.filter(status=status)
        awaiting = (self.request.query_params.get("awaiting_intake") or "").strip()
        if awaiting in {"1", "true", "yes"}:
            qs = qs.filter(petrol_engine__isnull=True, status=Retrofit.Status.INTAKE)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return RetrofitListSerializer
        if self.action == "create":
            return RetrofitCreateSerializer
        return RetrofitDetailSerializer

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(
                RetrofitListSerializer(page, many=True).data
            )
        return ok(RetrofitListSerializer(qs, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        return ok(RetrofitDetailSerializer(self.get_object()).data)

    @extend_schema(
        request=RetrofitCreateSerializer, responses={201: RetrofitDetailSerializer}
    )
    def create(self, request, *args, **kwargs):
        ser = RetrofitCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        retrofit = RetrofitService.create(
            data=ser.validated_data, actor=request.user
        )
        row = self.get_queryset().get(pk=retrofit.pk)
        return created(RetrofitDetailSerializer(row).data)

    @extend_schema(
        request=EngineIntakeSerializer, responses={200: RetrofitDetailSerializer}
    )
    @action(detail=True, methods=["post"], url_path="engine-intake")
    def engine_intake(self, request, pk=None):
        ser = EngineIntakeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        retrofit = RetrofitService.engine_intake(
            retrofit=self.get_object(),
            data=ser.validated_data,
            actor=request.user,
        )
        row = self.get_queryset().get(pk=retrofit.pk)
        return ok(RetrofitDetailSerializer(row).data)

    @extend_schema(
        request=RetrofitInstallSerializer, responses={200: RetrofitDetailSerializer}
    )
    @action(detail=True, methods=["post"])
    def install(self, request, pk=None):
        ser = RetrofitInstallSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        retrofit = RetrofitService.install(
            retrofit=self.get_object(),
            data=ser.validated_data,
            actor=request.user,
        )
        row = self.get_queryset().get(pk=retrofit.pk)
        return ok(RetrofitDetailSerializer(row).data)

    @extend_schema(
        request=RetrofitChecklistSerializer, responses={200: RetrofitDetailSerializer}
    )
    @action(detail=True, methods=["post"])
    def checklist(self, request, pk=None):
        ser = RetrofitChecklistSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        retrofit = RetrofitService.checklist(
            retrofit=self.get_object(),
            data=ser.validated_data,
            actor=request.user,
        )
        row = self.get_queryset().get(pk=retrofit.pk)
        return ok(RetrofitDetailSerializer(row).data)

    @extend_schema(responses={200: RetrofitDetailSerializer})
    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        retrofit = RetrofitService.activate(
            retrofit=self.get_object(), actor=request.user
        )
        row = self.get_queryset().get(pk=retrofit.pk)
        return ok(RetrofitDetailSerializer(row).data)
