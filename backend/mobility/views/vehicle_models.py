"""Vehicle model catalogue ViewSet — list/stats/CRUD."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import HasCapability
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok
from mobility.models import VehicleModel
from mobility.selectors import vehicle_model_stats
from mobility.serializers.vehicles import (
    VehicleModelListSerializer,
    VehicleModelWriteSerializer,
)
from mobility.services.vehicles.models import VehicleModelService


class VehicleModelViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "head", "options"]
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    search_fields = ["make", "model"]
    ordering_fields = ["make", "model", "vehicle_type", "created_at"]
    capability_map = {
        "list": "vehicles:read",
        "retrieve": "vehicles:read",
        "stats": "vehicles:read",
        "create": "vehicles:manage",
        "partial_update": "vehicles:manage",
        "update": "vehicles:manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return VehicleModel.objects.none()
        qs = VehicleModel.objects.select_related("battery_type").order_by(
            "make", "model"
        )
        vt = (self.request.query_params.get("vehicle_type") or "").strip()
        if vt:
            qs = qs.filter(vehicle_type=vt)
        bt = (self.request.query_params.get("battery_type") or "").strip()
        if bt:
            qs = qs.filter(battery_type_id=bt)
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "partial_update", "update"):
            return VehicleModelWriteSerializer
        return VehicleModelListSerializer

    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        row = self.get_object()
        return ok(VehicleModelListSerializer(row).data)

    def create(self, request, *args, **kwargs):
        ser = VehicleModelWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        row = VehicleModelService.create(
            data=ser.validated_data, actor=request.user
        )
        row = (
            VehicleModel.objects.select_related("battery_type").get(pk=row.pk)
        )
        return created(VehicleModelListSerializer(row).data)

    def partial_update(self, request, *args, **kwargs):
        ser = VehicleModelWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        row = VehicleModelService.update(
            vehicle_model=self.get_object(),
            data=ser.validated_data,
            actor=request.user,
        )
        row = (
            VehicleModel.objects.select_related("battery_type").get(pk=row.pk)
        )
        return ok(VehicleModelListSerializer(row).data)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"])
    def stats(self, request):
        return ok(vehicle_model_stats())
