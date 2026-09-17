"""Credit eligibility + applications + loans + scores."""
from __future__ import annotations

from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from accounts.permissions import HasCapability, HasCapabilityOrReadOwn, user_has_capability
from core.pagination import KuraCursorPagination
from core.responses import created, ok
from credit.models import CreditApplication, CreditScore, Loan
from credit.selectors import account_for_user
from credit.services import ApplicationService, EligibilityService, LoanService, ScoreService


class ApplySerializer(serializers.Serializer):
    amount_kobo = serializers.IntegerField(min_value=1)
    tenor_days = serializers.IntegerField()
    idempotency_key = serializers.CharField(max_length=64)
    pin_grant = serializers.CharField()


class DeclineSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class RepaySerializer(serializers.Serializer):
    amount_kobo = serializers.IntegerField(min_value=1)
    idempotency_key = serializers.CharField(max_length=64)
    pin_grant = serializers.CharField()


class OverrideSerializer(serializers.Serializer):
    score = serializers.IntegerField(min_value=0, max_value=100)
    recommended_limit_kobo = serializers.IntegerField(min_value=0)
    reason = serializers.CharField(max_length=255)


class CreditApplicationListSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditApplication
        fields = [
            "id",
            "amount_kobo",
            "tenor_days",
            "status",
            "disbursement",
            "created_at",
        ]


class CreditEligibilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        account = account_for_user(request.user)
        device_id = (request.headers.get("X-Kura-Device-Id") or "").strip()
        return ok(
            EligibilityService.evaluate(account=account, device_id=device_id).payload
        )


class CreditApplicationViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated, HasCapabilityOrReadOwn]
    pagination_class = KuraCursorPagination
    serializer_class = CreditApplicationListSerializer
    http_method_names = ["get", "post", "head", "options"]
    capability_map = {
        "list": "credit:approve",
        "retrieve": "credit:approve",
        "create": None,
        "approve": "credit:approve",
        "decline": "credit:approve",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return CreditApplication.objects.none()
        user = self.request.user
        qs = CreditApplication.objects.select_related("account", "loan")
        if user_has_capability(user, "credit:approve"):
            return qs.all()
        account = account_for_user(user)
        return qs.filter(account=account)

    def create(self, request, *args, **kwargs):
        ser = ApplySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        account = account_for_user(request.user)
        data = ApplicationService.apply(
            account=account,
            actor=request.user,
            **ser.validated_data,
        )
        return created(data)

    @extend_schema(request=DeclineSerializer, responses={200: dict})
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        app = self.get_object()
        reason = request.data.get("reason") or ""
        return ok(ApplicationService.approve(application=app, actor=request.user, reason=reason))

    @extend_schema(request=DeclineSerializer, responses={200: dict})
    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        app = self.get_object()
        ser = DeclineSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return ok(
            ApplicationService.decline(
                application=app,
                actor=request.user,
                reason=ser.validated_data.get("reason") or "",
            )
        )


class LoanViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasCapabilityOrReadOwn]
    pagination_class = KuraCursorPagination
    capability_map = {
        "list": "credit:approve",
        "retrieve": "credit:approve",
        "repay": None,
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Loan.objects.none()
        user = self.request.user
        qs = Loan.objects.select_related("account", "application")
        if user_has_capability(user, "credit:approve"):
            return qs.all()
        return qs.filter(account=account_for_user(user))

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        data = [LoanService.loan_list_payload(x) for x in (page or qs)]
        if page is not None:
            return self.get_paginated_response(data)
        return ok(data)

    def retrieve(self, request, *args, **kwargs):
        return ok(LoanService.loan_payload(self.get_object()))

    @extend_schema(request=RepaySerializer, responses={200: dict})
    @action(detail=True, methods=["post"])
    def repay(self, request, pk=None):
        ser = RepaySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        loan = self.get_object()
        if not user_has_capability(request.user, "credit:approve"):
            account = account_for_user(request.user)
            if loan.account_id != account.id:
                return Response(status=status.HTTP_404_NOT_FOUND)
        return ok(
            LoanService.repay(
                loan=loan,
                actor=request.user,
                **ser.validated_data,
            )
        )


class CreditScoreViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    pagination_class = KuraCursorPagination
    required_capability = "credit:approve"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return CreditScore.objects.none()
        qs = CreditScore.objects.select_related("account", "override_by")
        account_id = self.request.query_params.get("account")
        if account_id:
            qs = qs.filter(account_id=account_id)
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        rows = page if page is not None else qs
        data = [
            {
                "id": str(r.id),
                "account_id": str(r.account_id),
                "score": r.score,
                "recommended_limit_kobo": r.recommended_limit_kobo,
                "computed_by": r.computed_by,
                "computed_at": r.computed_at.isoformat(),
                "override_reason": r.override_reason,
            }
            for r in rows
        ]
        if page is not None:
            return self.get_paginated_response(data)
        return ok(data)

    @extend_schema(request=OverrideSerializer, responses={201: dict})
    @action(detail=False, methods=["post"], url_path=r"(?P<account_id>[^/.]+)/override")
    def override(self, request, account_id=None):
        from accounts.models import Account

        ser = OverrideSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        account = Account.objects.get(pk=account_id)
        row = ScoreService.override(account=account, actor=request.user, **ser.validated_data)
        return created(
            {
                "id": str(row.id),
                "account_id": str(row.account_id),
                "score": row.score,
                "recommended_limit_kobo": row.recommended_limit_kobo,
            }
        )
