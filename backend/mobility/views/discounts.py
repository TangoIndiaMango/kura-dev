"""Discount campaigns + operator redeem quote."""
from __future__ import annotations

from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from accounts.permissions import HasCapability
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok
from mobility.models import Plan, Vehicle
from mobility.models import DiscountCampaign
from mobility.services.plans.discounts import DiscountService
from mobility.services.plans.pricing import PricingService

_PERIOD_MATRIX = {
    "daily": "day",
    "day": "day",
    "weekly": "week",
    "week": "week",
    "monthly": "month",
    "month": "month",
    "swap": "swap",
    "pps": "swap",
}


class DiscountCampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountCampaign
        fields = [
            "id",
            "name",
            "code",
            "value_type",
            "value",
            "status",
            "applies_to_all_plans",
            "plan_option_ids",
            "periods",
            "audience",
            "fleet_min_vehicles",
            "segment_id",
            "channels",
            "summary",
            "max_redemptions",
            "redemptions_count",
            "max_per_account",
            "starts_at",
            "ends_at",
            "created_at",
        ]
        read_only_fields = ["redemptions_count", "created_at"]


class DiscountWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountCampaign
        fields = [
            "name",
            "code",
            "value_type",
            "value",
            "status",
            "applies_to_all_plans",
            "plan_option_ids",
            "periods",
            "audience",
            "fleet_min_vehicles",
            "segment_id",
            "channels",
            "summary",
            "max_redemptions",
            "max_per_account",
            "starts_at",
            "ends_at",
        ]


class DiscountRedeemSerializer(serializers.Serializer):
    code = serializers.CharField()
    list_price_kobo = serializers.IntegerField(min_value=1, required=False)
    period = serializers.CharField()
    channel = serializers.ChoiceField(
        choices=["App", "USSD", "Hub"], default="App", required=False
    )
    plan = serializers.UUIDField(required=False)
    vehicle_type = serializers.CharField(required=False, allow_blank=True)


class DiscountViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    serializer_class = DiscountCampaignSerializer
    pagination_class = KuraPageNumberPagination
    http_method_names = ["get", "post", "patch", "head", "options"]
    queryset = DiscountCampaign.objects.all().order_by("-created_at")
    filterset_fields = ["status", "audience"]
    lookup_value_regex = r"[0-9a-f-]{36}"
    capability_map = {
        "list": "tariffs:manage",
        "retrieve": "tariffs:manage",
        "create": "tariffs:manage",
        "partial_update": "tariffs:manage",
        "activate": "price:approve",
        "redeem": None,
        "redemptions": "tariffs:manage",
    }

    def get_permissions(self):
        if self.action == "redeem":
            return [IsAuthenticated()]
        return [IsAuthenticated(), HasCapability()]

    def get_serializer_class(self):
        if self.action in {"create", "partial_update"}:
            return DiscountWriteSerializer
        return DiscountCampaignSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return created(DiscountCampaignSerializer(serializer.instance).data)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(DiscountCampaignSerializer(serializer.instance).data)

    def get_queryset(self):
        qs = DiscountCampaign.objects.all().order_by("-created_at")
        search = self.request.query_params.get("search")
        if search:
            from django.db.models import Q

            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))
        return qs

    def perform_create(self, serializer):
        code = str(serializer.validated_data["code"]).strip().upper()
        discount = serializer.save(created_by=self.request.user, code=code)
        from core.services.events import emit_event

        emit_event(
            action="discount.created",
            subject_type="discount_campaign",
            subject_id=str(discount.id),
            actor=self.request.user,
            after={
                "code": discount.code,
                "status": discount.status,
                "value_type": discount.value_type,
                "value": discount.value,
            },
        )

    def perform_update(self, serializer):
        before = {
            "status": serializer.instance.status,
            "code": serializer.instance.code,
        }
        discount = serializer.save()
        from core.services.events import emit_event

        emit_event(
            action="discount.updated",
            subject_type="discount_campaign",
            subject_id=str(discount.id),
            actor=self.request.user,
            before=before,
            after={"status": discount.status, "code": discount.code},
        )

    @extend_schema(request=None, responses={200: DiscountCampaignSerializer})
    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        discount = DiscountService.activate(
            discount=self.get_object(), actor=request.user
        )
        return ok(DiscountCampaignSerializer(discount).data)

    @extend_schema(request=DiscountRedeemSerializer, responses={200: dict})
    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def redeem(self, request):
        """Quote only — purchase/renew consume atomically server-side."""
        ser = DiscountRedeemSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        plan = None
        if data.get("plan"):
            plan = Plan.objects.filter(pk=data["plan"]).first()
        list_price = data.get("list_price_kobo")
        if list_price is None:
            vtype = data.get("vehicle_type") or (
                plan.vehicle_type if plan else "MOTORCYCLE"
            )
            period = plan.period if plan else _PERIOD_MATRIX.get(
                str(data["period"]).lower(), data["period"]
            )
            list_price = PricingService.resolve_plan_list_kobo(
                vehicle_type=vtype,
                period=period,
            )
        driver = getattr(request.user, "driver_profile", None)
        account = driver.account if driver else request.user.accounts.first()
        vehicle_count = (
            Vehicle.objects.filter(account=account).count() if account else 1
        )
        quote = DiscountService.quote(
            code=data["code"],
            list_price_kobo=int(list_price),
            period=data["period"],
            channel=data.get("channel") or "App",
            plan=plan,
            vehicle_count=vehicle_count,
        )
        return ok(
            {
                "code": quote.code,
                "list_price_kobo": quote.list_price_kobo,
                "discount_kobo": quote.discount_kobo,
                "due_kobo": quote.due_kobo,
                "value_label": quote.value_label,
                "discount_id": str(quote.discount.id),
            }
        )

    @extend_schema(responses={200: dict})
    @action(detail=True, methods=["get"])
    def redemptions(self, request, pk=None):
        """Who-redeemed ledger for this campaign (list columns only)."""
        from mobility.models import DiscountRedemption
        from core.pagination import KuraCursorPagination

        discount = self.get_object()
        qs = (
            DiscountRedemption.objects.filter(discount=discount)
            .select_related("account")
            .order_by("-created_at", "-id")
        )
        account_id = request.query_params.get("account")
        if account_id:
            qs = qs.filter(account_id=account_id)
        paginator = KuraCursorPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        rows = [
            {
                "id": str(r.id),
                "account_id": str(r.account_id),
                "account_display_name": r.account.display_name,
                "kura_id": r.account.kura_id,
                "list_price_kobo": r.list_price_kobo,
                "discount_kobo": r.discount_kobo,
                "due_kobo": r.due_kobo,
                "channel": r.channel,
                "period": r.period,
                "created_at": r.created_at.isoformat(),
            }
            for r in (page or [])
        ]
        return paginator.get_paginated_response(rows)
