"""Battery type catalogue — propose + activate (maker-checker)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import HasCapability
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok
from mobility.models import BatteryType
from mobility.serializers import BatteryTypeSerializer
from mobility.services.batteries.types import BatteryTypeService


class BatteryTypeViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "head", "options"]
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    serializer_class = BatteryTypeSerializer
    search_fields = ["name", "manufacturer"]
    capability_map = {
        "list": "batteries:read",
        "retrieve": "batteries:read",
        "create": "batteries:manage",
        "activate": "battery-types:approve",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return BatteryType.objects.none()
        qs = BatteryType.objects.order_by("name")
        status = (self.request.query_params.get("status") or "").strip()
        if status:
            qs = qs.filter(status=status)
        vt = (self.request.query_params.get("vehicle_type") or "").strip()
        if vt:
            qs = qs.filter(vehicle_type=vt)
        return qs

    def retrieve(self, request, *args, **kwargs):
        return ok(BatteryTypeSerializer(self.get_object()).data)

    def create(self, request, *args, **kwargs):
        ser = BatteryTypeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        row = BatteryTypeService.create(
            data=ser.validated_data, actor=request.user
        )
        return created(BatteryTypeSerializer(row).data)

    @extend_schema(responses={200: BatteryTypeSerializer})
    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        row = BatteryTypeService.activate(
            battery_type=self.get_object(), actor=request.user
        )
        return ok(BatteryTypeSerializer(row).data)
