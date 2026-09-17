"""Cooperative catalogue ViewSet (CRM select data only)."""
from __future__ import annotations

from django.db.models import Count
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.models import Cooperative
from accounts.permissions import HasCapability, user_has_capability
from accounts.serializers import (
    CooperativeDetailSerializer,
    CooperativeListSerializer,
    CooperativeWriteSerializer,
)
from accounts.services.cooperatives import CooperativeService
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok


class CooperativeViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "head", "options"]
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    search_fields = ["name", "region"]
    ordering_fields = ["name", "created_at"]
    capability_map = {
        "list": "cooperatives:read",
        "retrieve": "cooperatives:read",
        "create": "cooperatives:manage",
        "partial_update": "cooperatives:manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Cooperative.objects.none()
        qs = Cooperative.objects.select_related("chairman_user").annotate(
            member_count=Count("accounts")
        )
        user = self.request.user
        if user_has_capability(user, "cooperatives:manage") or user_has_capability(
            user, "accounts:read"
        ):
            return qs.order_by("name")
        return qs.filter(chairman_user_id=user.id).order_by("name")

    def get_serializer_class(self):
        if self.action == "list":
            return CooperativeListSerializer
        if self.action in ("create", "partial_update"):
            return CooperativeWriteSerializer
        return CooperativeDetailSerializer

    def create(self, request, *args, **kwargs):
        ser = CooperativeWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        coop = CooperativeService.create(
            name=ser.validated_data["name"],
            region=ser.validated_data.get("region", ""),
            actor=request.user,
        )
        row = self.get_queryset().get(pk=coop.pk)
        return created(CooperativeDetailSerializer(row).data)

    def partial_update(self, request, *args, **kwargs):
        ser = CooperativeWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        coop = CooperativeService.update(
            cooperative=self.get_object(),
            data=ser.validated_data,
            actor=request.user,
        )
        row = self.get_queryset().get(pk=coop.pk)
        return ok(CooperativeDetailSerializer(row).data)
