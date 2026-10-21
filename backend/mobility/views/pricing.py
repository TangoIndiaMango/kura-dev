"""Admin Pricing APIs — tariff matrix + bay hold limits (matches /pricing UI)."""
from __future__ import annotations

from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from accounts.permissions import HasCapability
from core.pagination import KuraPageNumberPagination
from core.responses import ok
from mobility.models import PriceMatrix, VehicleType
from mobility.services.plans.matrix_actions import MatrixLifecycleService
from mobility.services.plans.pricing import PricingService


class PriceMatrixListSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceMatrix
        fields = [
            "id",
            "vehicle_type",
            "daily_kobo",
            "weekly_kobo",
            "monthly_kobo",
            "pay_per_swap_kobo",
            "effective_from",
            "status",
            "created_at",
        ]


class PriceMatrixDetailSerializer(PriceMatrixListSerializer):
    class Meta(PriceMatrixListSerializer.Meta):
        fields = PriceMatrixListSerializer.Meta.fields + [
            "created_by_id",
            "approved_by_id",
            "updated_at",
        ]


class PriceMatrixCreateSerializer(serializers.Serializer):
    vehicle_type = serializers.CharField(max_length=50)
    daily_kobo = serializers.IntegerField(min_value=1)
    weekly_kobo = serializers.IntegerField(min_value=1)
    monthly_kobo = serializers.IntegerField(min_value=1)
    pay_per_swap_kobo = serializers.IntegerField(min_value=1)
    effective_from = serializers.DateField()


class PriceMatrixScheduleSerializer(serializers.Serializer):
    effective_from = serializers.DateField(required=False)
    send_customer_notice = serializers.BooleanField(default=False)


class PriceMatrixRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


class HoldPolicySerializer(serializers.Serializer):
    default_hold_minutes = serializers.IntegerField(min_value=5, max_value=60)
    max_extend_minutes = serializers.IntegerField(min_value=5, max_value=60)


class PriceMatrixViewSet(
    mixins.CreateModelMixin,
    viewsets.ReadOnlyModelViewSet,
):
    """Admin · Pricing matrix tabs (Current / Scheduled / History via status filter)."""

    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    filterset_fields = ["status", "vehicle_type"]
    ordering_fields = ["effective_from", "created_at", "vehicle_type"]
    capability_map = {
        "list": "tariffs:manage",
        "retrieve": "tariffs:manage",
        "create": "tariffs:manage",
        "activate": "price:approve",
        "schedule": "price:approve",
        "reject": "price:approve",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return PriceMatrix.objects.none()
        PricingService.ensure_defaults()
        return PriceMatrix.objects.select_related("created_by", "approved_by").all()

    def get_serializer_class(self):
        if self.action == "create":
            return PriceMatrixCreateSerializer
        if self.action == "retrieve":
            return PriceMatrixDetailSerializer
        return PriceMatrixListSerializer

    def create(self, request, *args, **kwargs):
        ser = PriceMatrixCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        matrix = PricingService.queue_matrix(
            vehicle_type=data["vehicle_type"],
            daily_kobo=data["daily_kobo"],
            weekly_kobo=data["weekly_kobo"],
            monthly_kobo=data["monthly_kobo"],
            pay_per_swap_kobo=data["pay_per_swap_kobo"],
            effective_from=data["effective_from"],
            actor=request.user,
        )
        return Response(
            PriceMatrixDetailSerializer(matrix).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(request=None, responses={200: PriceMatrixDetailSerializer})
    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        matrix = self.get_object()
        matrix = PricingService.activate_matrix(matrix=matrix, actor=request.user)
        return Response(PriceMatrixDetailSerializer(matrix).data)

    @extend_schema(
        request=PriceMatrixScheduleSerializer,
        responses={200: PriceMatrixDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def schedule(self, request, pk=None):
        ser = PriceMatrixScheduleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        matrix = MatrixLifecycleService.schedule_matrix(
            matrix=self.get_object(),
            actor=request.user,
            effective_from=data.get("effective_from"),
            send_customer_notice=bool(data.get("send_customer_notice")),
        )
        return Response(PriceMatrixDetailSerializer(matrix).data)

    @extend_schema(
        request=PriceMatrixRejectSerializer,
        responses={200: PriceMatrixDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        ser = PriceMatrixRejectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        matrix = MatrixLifecycleService.reject_matrix(
            matrix=self.get_object(),
            actor=request.user,
            reason=ser.validated_data.get("reason") or "",
        )
        return Response(PriceMatrixDetailSerializer(matrix).data)


class HoldPolicyView(APIView):
    """Bay hold limits — operators read; tariffs:manage writes."""

    def get_permissions(self):
        if self.request.method == "PUT":
            self.required_capability = "tariffs:manage"
            return [IsAuthenticated(), HasCapability()]
        return [IsAuthenticated()]

    def get(self, request):
        policy = PricingService.get_hold_policy()
        return ok(
            {
                "default_hold_minutes": policy.default_hold_minutes,
                "max_extend_minutes": policy.max_extend_minutes,
            }
        )

    def put(self, request):
        ser = HoldPolicySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        policy = PricingService.update_hold_policy(
            default_hold_minutes=data["default_hold_minutes"],
            max_extend_minutes=data["max_extend_minutes"],
            actor=request.user,
        )
        return ok(
            {
                "default_hold_minutes": policy.default_hold_minutes,
                "max_extend_minutes": policy.max_extend_minutes,
            }
        )
