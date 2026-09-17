"""E-boarder fleet ViewSet."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import HasCapability
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok
from mobility.models import EBoarder
from mobility.selectors import eboarder_stats
from mobility.serializers.eboarders import (
    EBoarderDetailSerializer,
    EBoarderListSerializer,
    EBoarderWriteSerializer,
)
from mobility.services.engines.eboarders import EBoarderService


class EBoarderViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "head", "options"]
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    search_fields = ["serial", "make", "model"]
    ordering_fields = ["serial", "status", "created_at"]
    capability_map = {
        "list": "engines:manage",
        "retrieve": "engines:manage",
        "stats": "engines:manage",
        "create": "engines:manage",
        "partial_update": "engines:manage",
        "update": "engines:manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return EBoarder.objects.none()
        qs = EBoarder.objects.select_related(
            "battery_type",
            "current_hub",
            "vehicle",
            "account",
        ).order_by("-created_at")
        status = (self.request.query_params.get("status") or "").strip()
        if status:
            qs = qs.filter(status=status)
        hub = (self.request.query_params.get("hub") or "").strip()
        if hub:
            qs = qs.filter(current_hub_id=hub)
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "partial_update", "update"):
            return EBoarderWriteSerializer
        if self.action == "retrieve":
            return EBoarderDetailSerializer
        return EBoarderListSerializer

    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        return ok(EBoarderDetailSerializer(self.get_object()).data)

    def create(self, request, *args, **kwargs):
        ser = EBoarderWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        row = EBoarderService.create(data=ser.validated_data, actor=request.user)
        row = EBoarder.objects.select_related(
            "battery_type", "current_hub", "vehicle", "account"
        ).get(pk=row.pk)
        return created(EBoarderDetailSerializer(row).data)

    def partial_update(self, request, *args, **kwargs):
        ser = EBoarderWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        row = EBoarderService.update(
            eboarder=self.get_object(),
            data=ser.validated_data,
            actor=request.user,
        )
        row = EBoarder.objects.select_related(
            "battery_type", "current_hub", "vehicle", "account"
        ).get(pk=row.pk)
        return ok(EBoarderDetailSerializer(row).data)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"])
    def stats(self, request):
        return ok(eboarder_stats())
