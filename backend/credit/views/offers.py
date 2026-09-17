"""Product offers ViewSet."""
from __future__ import annotations

from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from accounts.permissions import HasCapability, HasCapabilityOrReadOwn, user_has_capability
from core.pagination import KuraPageNumberPagination
from core.responses import created, ok
from credit.models import OfferAssignment, ProductOffer
from credit.selectors import account_for_user
from credit.services import OfferService


class OfferListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductOffer
        fields = [
            "id",
            "name",
            "offer_type",
            "summary",
            "status",
            "created_at",
        ]


class OfferDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductOffer
        fields = [
            "id",
            "name",
            "offer_type",
            "summary",
            "terms",
            "segment_criteria",
            "status",
            "created_at",
            "updated_at",
        ]


class OfferWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    offer_type = serializers.ChoiceField(choices=ProductOffer.Type.choices)
    summary = serializers.CharField(required=False, allow_blank=True, default="")
    terms = serializers.DictField(required=False, default=dict)
    segment_criteria = serializers.DictField(required=False, default=dict)
    status = serializers.ChoiceField(
        choices=ProductOffer.Status.choices, required=False, default=ProductOffer.Status.DRAFT
    )


class OfferPatchSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    summary = serializers.CharField(required=False, allow_blank=True)
    terms = serializers.DictField(required=False)
    segment_criteria = serializers.DictField(required=False)
    status = serializers.ChoiceField(choices=ProductOffer.Status.choices, required=False)


class AssignSerializer(serializers.Serializer):
    account_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        max_length=500,
    )
    segment_criteria = serializers.DictField(required=False)
    channel = serializers.ChoiceField(
        choices=OfferAssignment.Channel.choices, required=False, default="APP"
    )

    def validate(self, attrs):
        ids = attrs.get("account_ids") or []
        criteria = attrs.get("segment_criteria")
        if not ids and not criteria:
            raise serializers.ValidationError(
                "Provide account_ids or segment_criteria."
            )
        return attrs


class AcceptSerializer(serializers.Serializer):
    pin_grant = serializers.CharField()
    amount_kobo = serializers.IntegerField(required=False, min_value=1)


class ProductOfferViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraPageNumberPagination
    http_method_names = ["get", "post", "patch", "head", "options"]
    capability_map = {
        "list": "offers:manage",
        "retrieve": "offers:manage",
        "create": "offers:manage",
        "partial_update": "offers:manage",
        "assign": "offers:manage",
        "mine": None,
        "accept": None,
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ProductOffer.objects.none()
        return ProductOffer.objects.all()

    def get_serializer_class(self):
        if self.action == "list":
            return OfferListSerializer
        if self.action in {"create", "partial_update"}:
            return OfferWriteSerializer if self.action == "create" else OfferPatchSerializer
        return OfferDetailSerializer

    def get_permissions(self):
        if self.action in {"mine", "accept"}:
            return [IsAuthenticated()]
        return [IsAuthenticated(), HasCapability()]

    def create(self, request, *args, **kwargs):
        ser = OfferWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        offer = OfferService.create_offer(actor=request.user, **ser.validated_data)
        return created(OfferDetailSerializer(offer).data)

    def partial_update(self, request, *args, **kwargs):
        offer = self.get_object()
        ser = OfferPatchSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        offer = OfferService.update_offer(offer=offer, actor=request.user, **ser.validated_data)
        return ok(OfferDetailSerializer(offer).data)

    @extend_schema(request=AssignSerializer, responses={200: dict})
    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        ser = AssignSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        rows = OfferService.assign(
            offer=self.get_object(),
            account_ids=ser.validated_data.get("account_ids") or [],
            segment_criteria=ser.validated_data.get("segment_criteria"),
            channel=ser.validated_data.get("channel") or "APP",
            actor=request.user,
        )
        return ok({"assigned": len(rows), "assignment_ids": [str(r.id) for r in rows]})

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"])
    def mine(self, request):
        account = account_for_user(request.user)
        rows = (
            OfferAssignment.objects.filter(account=account)
            .select_related("offer")
            .order_by("-updated_at")
        )
        return ok(
            [
                {
                    "id": str(r.id),
                    "status": r.status,
                    "amount_kobo": r.amount_kobo,
                    "channel": r.channel,
                    "offer_id": str(r.offer_id),
                    "offer_name": r.offer.name,
                    "offer_type": r.offer.offer_type,
                    "summary": r.offer.summary,
                }
                for r in rows
            ]
        )


class OfferAssignmentViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    queryset = OfferAssignment.objects.select_related("offer", "account")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return OfferAssignment.objects.none()
        user = self.request.user
        qs = OfferAssignment.objects.select_related("offer", "account")
        if user_has_capability(user, "offers:manage"):
            return qs
        return qs.filter(account=account_for_user(user))

    @extend_schema(request=AcceptSerializer, responses={200: dict})
    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        ser = AcceptSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        assignment = self.get_object()
        row = OfferService.accept(
            assignment=assignment,
            actor=request.user,
            pin_grant=ser.validated_data["pin_grant"],
            amount_kobo=ser.validated_data.get("amount_kobo"),
        )
        return ok(
            {
                "id": str(row.id),
                "status": row.status,
                "amount_kobo": row.amount_kobo,
                "offer_id": str(row.offer_id),
            }
        )
