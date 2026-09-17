"""Config namespace + version approval APIs."""
from __future__ import annotations

from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from accounts.permissions import HasCapability, user_has_capability
from core.models import ConfigVersion
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok
from core.services.config import ConfigService, DEFAULTS


class ConfigProposeSerializer(serializers.Serializer):
    value = serializers.DictField(child=serializers.JSONField(), allow_empty=False)
    note = serializers.CharField(
        required=False, allow_blank=True, max_length=255, default=""
    )


class ConfigVersionSerializer(serializers.ModelSerializer):
    created_by_id = serializers.UUIDField(read_only=True, allow_null=True)
    approved_by_id = serializers.UUIDField(read_only=True, allow_null=True)
    created_by_label = serializers.SerializerMethodField()
    approved_by_label = serializers.SerializerMethodField()

    class Meta:
        model = ConfigVersion
        fields = [
            "id",
            "namespace",
            "key",
            "value",
            "status",
            "effective_from",
            "created_by_id",
            "approved_by_id",
            "created_by_label",
            "approved_by_label",
            "note",
            "created_at",
            "updated_at",
        ]

    def get_created_by_label(self, obj: ConfigVersion) -> str:
        return _user_label(obj.created_by)

    def get_approved_by_label(self, obj: ConfigVersion) -> str:
        return _user_label(obj.approved_by)


def _user_label(user) -> str:
    if user is None:
        return ""
    name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
    return name or getattr(user, "email", "") or getattr(user, "phone", "") or ""


def _can_read_namespace(user, namespace: str) -> bool:
    cap = ConfigService.capability_for(namespace)
    return user_has_capability(user, cap) or user_has_capability(user, "finance:read")


def _can_write_namespace(user, namespace: str) -> bool:
    return user_has_capability(user, ConfigService.capability_for(namespace))


class ConfigNamespaceView(APIView):
    """GET/POST /config/{namespace}/ — effective snapshot or propose draft."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: dict})
    def get(self, request, namespace: str):
        if namespace not in DEFAULTS:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if not _can_read_namespace(request.user, namespace):
            raise PermissionDenied()
        return ok(ConfigService.namespace_snapshot(namespace))

    @extend_schema(request=ConfigProposeSerializer, responses={201: ConfigVersionSerializer})
    def post(self, request, namespace: str):
        if namespace not in DEFAULTS:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if not _can_write_namespace(request.user, namespace):
            raise PermissionDenied()
        ser = ConfigProposeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        row = ConfigService.propose(
            namespace=namespace,
            value=ser.validated_data["value"],
            note=ser.validated_data.get("note") or "",
            actor=request.user,
        )
        return created(ConfigVersionSerializer(row).data)


class ConfigVersionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    serializer_class = ConfigVersionSerializer
    filterset_fields = ["namespace", "key", "status"]
    capability_map = {
        "list": ["credit:approve", "offers:manage", "finance:read"],
        "retrieve": ["credit:approve", "offers:manage", "finance:read"],
        "approve": ["credit:approve", "offers:manage"],
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ConfigVersion.objects.none()
        return ConfigVersion.objects.select_related("created_by", "approved_by").all()

    @extend_schema(request=None, responses={200: ConfigVersionSerializer})
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        version = self.get_object()
        if not _can_write_namespace(request.user, version.namespace):
            raise PermissionDenied()
        version = ConfigService.approve(version=version, actor=request.user)
        return ok(ConfigVersionSerializer(version).data)
