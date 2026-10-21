"""Plan catalogue ViewSet — operator read; admin create/update/activate/deactivate."""
from __future__ import annotations

from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import HasCapability
from core.pagination import KuraPageNumberPagination
from mobility.models import Plan, Subscription, VehicleType
from mobility.serializers.catalogue import PlanSerializer
from mobility.services.plans.catalogue import PlanCatalogueService


class PlanWriteSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50, required=False, allow_blank=False)
    name = serializers.CharField(max_length=100)
    vehicle_type = serializers.CharField(max_length=50, required=False)
    period = serializers.ChoiceField(choices=Plan.Period.choices, required=False)
    duration_days = serializers.IntegerField(
        required=False, allow_null=True, min_value=1
    )
    swap_allowance = serializers.IntegerField(
        required=False, allow_null=True, min_value=1
    )
    price_kobo = serializers.IntegerField(min_value=0, required=False)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    auto_renew_default = serializers.BooleanField(required=False, default=False)


class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PlanSerializer
    pagination_class = KuraPageNumberPagination
    filterset_fields = ["vehicle_type", "status", "is_active", "period"]
    ordering_fields = ["price_kobo", "vehicle_type", "name", "created_at"]
    http_method_names = ["get", "post", "patch", "head", "options"]
    capability_map = {
        "create": "tariffs:manage",
        "partial_update": "tariffs:manage",
        "activate": "price:approve",
        "deactivate": "tariffs:manage",
    }

    def get_permissions(self):
        if self.action in self.capability_map:
            return [IsAuthenticated(), HasCapability()]
        return [IsAuthenticated()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Plan.objects.none()
        qs = Plan.objects.all().annotate(
            active_subscriber_count=Count(
                "subscriptions",
                filter=Q(subscriptions__status=Subscription.Status.ACTIVE),
            )
        )
        if self.action in (
            "retrieve",
            "partial_update",
            "activate",
            "deactivate",
        ):
            return qs
        raw_active = self.request.query_params.get("is_active")
        if raw_active is None:
            qs = qs.filter(is_active=True)
        elif str(raw_active).lower() not in {"", "all", "*"}:
            qs = qs.filter(
                is_active=str(raw_active).lower() in {"1", "true", "yes"}
            )
        return qs.order_by("vehicle_type", "price_kobo")

    def _annotated(self, plan_id):
        return (
            Plan.objects.filter(pk=plan_id)
            .annotate(
                active_subscriber_count=Count(
                    "subscriptions",
                    filter=Q(subscriptions__status=Subscription.Status.ACTIVE),
                )
            )
            .get()
        )

    def create(self, request, *args, **kwargs):
        ser = PlanWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        if not data.get("code"):
            raise serializers.ValidationError({"code": "This field is required."})
        if not data.get("vehicle_type"):
            raise serializers.ValidationError(
                {"vehicle_type": "This field is required."}
            )
        if not data.get("period"):
            raise serializers.ValidationError({"period": "This field is required."})
        if "price_kobo" not in data:
            raise serializers.ValidationError(
                {"price_kobo": "This field is required."}
            )
        plan = PlanCatalogueService.create(
            code=data["code"],
            name=data["name"],
            vehicle_type=data["vehicle_type"],
            period=data["period"],
            duration_days=data.get("duration_days"),
            swap_allowance=data.get("swap_allowance"),
            price_kobo=data["price_kobo"],
            description=data.get("description") or "",
            auto_renew_default=bool(data.get("auto_renew_default")),
            actor=request.user,
        )
        return Response(
            PlanSerializer(self._annotated(plan.pk)).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        plan = self.get_object()
        ser = PlanWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        plan = PlanCatalogueService.update(
            plan=plan,
            name=data.get("name"),
            description=data.get("description"),
            duration_days=data.get("duration_days"),
            swap_allowance=data.get("swap_allowance"),
            price_kobo=data.get("price_kobo"),
            auto_renew_default=data.get("auto_renew_default"),
            actor=request.user,
        )
        return Response(PlanSerializer(self._annotated(plan.pk)).data)

    @extend_schema(request=None, responses={200: PlanSerializer})
    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        plan = PlanCatalogueService.activate(
            plan=self.get_object(), actor=request.user
        )
        return Response(PlanSerializer(self._annotated(plan.pk)).data)

    @extend_schema(request=None, responses={200: PlanSerializer})
    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        plan = PlanCatalogueService.deactivate(
            plan=self.get_object(), actor=request.user
        )
        return Response(PlanSerializer(self._annotated(plan.pk)).data)
