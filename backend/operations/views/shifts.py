"""Shift + Override ViewSets."""
from __future__ import annotations

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from accounts.permissions import HasCapability
from accounts.selectors.scope import hub_ids_for
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok
from mobility.models import Hub
from operations.filters.shifts import ShiftFilter
from operations.models import Override, Shift
from operations.serializers import OverrideCreateSerializer, OverrideSerializer
from operations.serializers_cash import (
    ShiftCloseSerializer,
    ShiftDetailSerializer,
    ShiftListSerializer,
    ShiftLodgeSerializer,
    ShiftOpenSerializer,
)
from operations.services.cash.settlement import CashSettlementService
from operations.services.overrides import OverrideService
from operations.services.shifts import ShiftService


class ShiftViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    http_method_names = ["get", "post", "head", "options"]
    filterset_class = ShiftFilter
    ordering_fields = ["opened_at", "closed_at"]
    capability_map = {
        "list": "shifts:manage",
        "retrieve": "shifts:manage",
        "create": "shifts:manage",
        "open": "shifts:manage",
        "close": "shifts:manage",
        "lodge": "shifts:manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Shift.objects.none()
        qs = (
            Shift.objects.select_related("agent", "hub")
            .all()
            .order_by("-opened_at")
        )
        scope = hub_ids_for(self.request.user)
        if scope is None:
            return qs
        if not scope:
            return qs.none()
        return qs.filter(hub_id__in=scope)

    def get_serializer_class(self):
        if self.action == "list":
            return ShiftListSerializer
        if self.action in {"create", "open"}:
            return ShiftOpenSerializer
        if self.action == "close":
            return ShiftCloseSerializer
        if self.action == "lodge":
            return ShiftLodgeSerializer
        return ShiftDetailSerializer

    @extend_schema(request=ShiftOpenSerializer, responses={201: ShiftDetailSerializer})
    def create(self, request, *args, **kwargs):
        return self.open(request)

    @extend_schema(request=ShiftOpenSerializer, responses={201: ShiftDetailSerializer})
    @action(detail=False, methods=["post"], url_path="open")
    def open(self, request):
        ser = ShiftOpenSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        hub = Hub.objects.filter(pk=ser.validated_data["hub_id"]).first()
        if hub is None:
            from core.exceptions import DomainError

            raise DomainError(
                "VALIDATION_ERROR",
                "Unknown hub.",
                details={"hub_id": ["invalid"]},
            )
        shift = ShiftService.open_shift(
            agent=request.user,
            hub=hub,
            opening_cash_kobo=ser.validated_data.get("opening_cash_kobo", 0),
            actor=request.user,
        )
        row = self.get_queryset().get(pk=shift.pk)
        return created(ShiftDetailSerializer(row).data)

    @extend_schema(request=ShiftCloseSerializer, responses={200: ShiftDetailSerializer})
    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, pk=None):
        ser = ShiftCloseSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        shift = ShiftService.close_shift(
            shift=self.get_object(),
            closing_cash_kobo=ser.validated_data["closing_cash_kobo"],
            actor=request.user,
        )
        row = self.get_queryset().get(pk=shift.pk)
        return ok(ShiftDetailSerializer(row).data)

    @extend_schema(request=ShiftLodgeSerializer, responses={200: ShiftDetailSerializer})
    @action(detail=True, methods=["post"], url_path="lodge")
    def lodge(self, request, pk=None):
        """Confirm bank/PSP lodge — clears cash_float into psp_clearing."""
        ser = ShiftLodgeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        shift = CashSettlementService.confirm_lodge(
            shift=self.get_object(),
            lodge_ref=ser.validated_data["lodge_ref"],
            amount_kobo=ser.validated_data.get("amount_kobo"),
            actor=request.user,
        )
        row = self.get_queryset().get(pk=shift.pk)
        return ok(ShiftDetailSerializer(row).data)


class OverrideViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    serializer_class = OverrideSerializer
    pagination_class = KuraPageNumberPagination
    filterset_fields = ["agent"]
    queryset = (
        Override.objects.select_related("agent", "swap").all().order_by("-created_at")
    )
    capability_map = {
        "list": "shifts:manage",
        "retrieve": "shifts:manage",
        "create": "swaps:complete",
        "partial_update": "shifts:manage",
    }
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return OverrideCreateSerializer
        return OverrideSerializer

    @extend_schema(request=OverrideCreateSerializer, responses={201: OverrideSerializer})
    def create(self, request, *args, **kwargs):
        ser = OverrideCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        swap = None
        if data.get("swap_id"):
            from mobility.models import Swap

            swap = Swap.objects.filter(pk=data["swap_id"]).first()
            if swap is None:
                from core.exceptions import DomainError

                raise DomainError("NOT_FOUND", "Swap not found.", http=404)
        row = OverrideService.record(
            agent=request.user,
            reason=data["reason"],
            note=data["note"],
            pin_grant=data["pin_grant"],
            swap=swap,
            hub=getattr(swap, "hub", None),
        )
        return created(OverrideSerializer(row).data)
