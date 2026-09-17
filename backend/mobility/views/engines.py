"""Path B petrol engine custody ViewSet — ops manage + owner read/request."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import HasCapabilityOrReadOwn, user_has_capability
from core.pagination import KuraPageNumberPagination
from core.responses import ok
from mobility.models import PetrolEngine
from mobility.selectors import _own_account_ids
from mobility.serializers.engines import (
    EngineReleaseRequestSerializer,
    EngineReleaseSerializer,
    PetrolEngineDetailSerializer,
    PetrolEngineListSerializer,
)
from mobility.services.engines import EngineCustodyService


class PetrolEngineViewSet(viewsets.ReadOnlyModelViewSet):
    http_method_names = ["get", "post", "head", "options"]
    permission_classes = [IsAuthenticated, HasCapabilityOrReadOwn]
    pagination_class = KuraPageNumberPagination
    search_fields = [
        "tag",
        "make",
        "model",
        "account__display_name",
        "account__kura_id",
    ]
    ordering_fields = ["created_at", "tag", "status"]
    capability_map = {
        "list": "engines:manage",
        "retrieve": "engines:manage",
        # Owner reclaim (PRD) uses accounts:write_own; staff use engines:manage.
        "release_request": ["engines:manage", "accounts:write_own"],
        "release": "engines:release",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return PetrolEngine.objects.none()
        qs = PetrolEngine.objects.select_related(
            "account",
            "storage_hub",
            "intake_agent",
            "intake_witness",
            "release_by",
            "vehicle",
            "retrofit",
        ).order_by("-created_at")
        user = self.request.user
        if not (
            user_has_capability(user, "engines:manage")
            or user_has_capability(user, "engines:release")
        ):
            own = _own_account_ids(user)
            qs = qs.filter(account_id__in=own) if own else qs.none()
        status = (self.request.query_params.get("status") or "").strip()
        if status:
            qs = qs.filter(status=status)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return PetrolEngineListSerializer
        return PetrolEngineDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        engine = self.get_object()
        return ok(PetrolEngineDetailSerializer(engine).data)

    @extend_schema(
        request=EngineReleaseRequestSerializer,
        responses={200: PetrolEngineDetailSerializer},
    )
    @action(detail=True, methods=["post"], url_path="release-request")
    def release_request(self, request, pk=None):
        ser = EngineReleaseRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        engine = EngineCustodyService.request_release(
            engine=self.get_object(),
            actor=request.user,
            note=ser.validated_data.get("note") or "",
        )
        engine = self.get_queryset().get(pk=engine.pk)
        return ok(PetrolEngineDetailSerializer(engine).data)

    @extend_schema(
        request=EngineReleaseSerializer,
        responses={200: PetrolEngineDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def release(self, request, pk=None):
        ser = EngineReleaseSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        engine = EngineCustodyService.release(
            engine=self.get_object(),
            data=ser.validated_data,
            actor=request.user,
        )
        engine = self.get_queryset().get(pk=engine.pk)
        return ok(PetrolEngineDetailSerializer(engine).data)
