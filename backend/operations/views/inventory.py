"""Inventory count API — end-of-day hub physical vs system."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import HasCapability
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok
from mobility.models import Hub
from operations.models import InventoryCount, Shift
from operations.services.inventory import submit_inventory_count


class InventoryCountSerializer(serializers.ModelSerializer):
    hub_code = serializers.CharField(source="hub.code", read_only=True)

    class Meta:
        model = InventoryCount
        fields = [
            "id",
            "hub",
            "hub_code",
            "shift",
            "counted",
            "expected",
            "variance",
            "signed_by",
            "note",
            "created_at",
        ]
        read_only_fields = fields


class InventoryCountWriteSerializer(serializers.Serializer):
    hub_id = serializers.UUIDField()
    counted = serializers.DictField(child=serializers.CharField())
    shift_id = serializers.UUIDField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True, default="")


class InventoryCountViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    serializer_class = InventoryCountSerializer
    capability_map = {
        "list": "hubs:read",
        "create": "shifts:manage",
    }

    def get_queryset(self):
        qs = InventoryCount.objects.select_related("hub", "signed_by").all()
        hub = self.request.query_params.get("hub")
        if hub:
            qs = qs.filter(hub_id=hub)
        return qs.order_by("-created_at")

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        return self.get_paginated_response(
            InventoryCountSerializer(page, many=True).data
        )

    @extend_schema(
        request=InventoryCountWriteSerializer,
        responses={201: InventoryCountSerializer},
    )
    def create(self, request, *args, **kwargs):
        ser = InventoryCountWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        try:
            hub = Hub.objects.get(pk=data["hub_id"])
        except Hub.DoesNotExist:
            from core.exceptions import DomainError

            raise DomainError("NOT_FOUND", "Hub not found.", http=404)
        shift = None
        if data.get("shift_id"):
            shift = Shift.objects.filter(pk=data["shift_id"]).first()
        row = submit_inventory_count(
            hub=hub,
            counted=data["counted"],
            actor=request.user,
            shift=shift,
            note=data.get("note") or "",
        )
        return created(InventoryCountSerializer(row).data)
