"""Role + Permission ViewSets — list is lean; retrieve/mutations return detail."""
from __future__ import annotations

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from accounts.helpers.export import role_export_rows
from core.helpers.csv_export import table_export_response
from accounts.models import Permission
from accounts.permissions import HasCapability
from accounts.selectors import role_stats
from accounts.selectors.roles import roles_qs
from accounts.serializers import (
    PermissionSerializer,
    RoleDetailSerializer,
    RoleListSerializer,
)
from accounts.services import RoleService
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    serializer_class = PermissionSerializer
    pagination_class = KuraPageNumberPagination
    queryset = Permission.objects.all().order_by("module", "code")
    filterset_fields = ["module"]
    search_fields = ["code", "name", "module", "description"]
    capability_map = {
        "list": "users:read",
        "retrieve": "users:read",
    }


class RoleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    filterset_fields = ["is_system", "is_active"]
    search_fields = ["code", "name", "description"]
    http_method_names = ["get", "post", "patch", "head", "options"]
    capability_map = {
        "list": "users:read",
        "retrieve": "users:read",
        "stats": "users:read",
        "export": "users:read",
        "create": "roles:manage",
        "partial_update": "roles:manage",
        "activate": "roles:manage",
        "deactivate": "roles:manage",
    }

    def get_serializer_class(self):
        if self.action == "list":
            return RoleListSerializer
        return RoleDetailSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return roles_qs().none()
        detail = self.action in {
            "retrieve",
            "partial_update",
            "create",
            "activate",
            "deactivate",
        }
        return roles_qs(with_permissions=detail)

    def _detail(self, role):
        role = roles_qs(with_permissions=True).get(pk=role.pk)
        return RoleDetailSerializer(role).data

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        return ok(role_stats())

    @extend_schema(responses={200: bytes})
    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        qs = self.filter_queryset(self.get_queryset())
        return table_export_response(
            format=request.query_params.get("export") or "csv",
            filename_stem="roles",
            title="Kura roles",
            headers=[
                "id",
                "code",
                "name",
                "description",
                "users",
                "type",
                "status",
                "created_at",
            ],
            rows=role_export_rows(qs),
        )

    def create(self, request, *args, **kwargs):
        ser = RoleDetailSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        role = RoleService.create_role(
            code=data["code"],
            name=data["name"],
            description=data.get("description", ""),
            permission_ids=data.get("permission_ids"),
            actor=request.user,
        )
        return created(self._detail(role))

    def partial_update(self, request, *args, **kwargs):
        role = self.get_object()
        ser = RoleDetailSerializer(role, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        role = RoleService.update_role(
            role,
            name=data.get("name"),
            description=data.get("description"),
            permission_ids=data.get("permission_ids"),
            is_active=data.get("is_active"),
            actor=request.user,
        )
        return ok(self._detail(role))

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        role = RoleService.set_active(
            role=self.get_object(),
            actor=request.user,
            is_active=True,
        )
        return ok(self._detail(role))

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        role = RoleService.set_active(
            role=self.get_object(),
            actor=request.user,
            is_active=False,
        )
        return ok(self._detail(role))
