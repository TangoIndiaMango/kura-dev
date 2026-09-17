"""Cooperative analytics for chairman / ops."""
from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from accounts.models import Account, Cooperative
from accounts.permissions import HasCapability, user_has_capability
from analytics.services.cooperative_savings import estimate_savings_kobo
from core.exceptions import DomainError
from core.responses import ok
from mobility.models import Battery, Vehicle


def cooperative_analytics_payload(*, coop: Cooperative) -> dict:
    accounts = Account.objects.filter(cooperative=coop).select_related("owner_user")
    account_ids = list(accounts.values_list("id", flat=True))
    members = [
        {
            "account_id": str(a.id),
            "kura_id": a.kura_id,
            "display_name": a.display_name,
            "status": a.status,
            "phone": a.owner_user.phone if a.owner_user_id else None,
        }
        for a in accounts.order_by("display_name")[:200]
    ]
    active_vehicles = Vehicle.objects.filter(
        account_id__in=account_ids, status=Vehicle.Status.ACTIVE
    ).count()
    unreturned = Battery.objects.filter(
        status=Battery.Status.ISSUED,
        mounted_vehicle__account_id__in=account_ids,
    ).count()
    savings_kobo, savings_note = estimate_savings_kobo(account_ids=account_ids)
    return {
        "id": str(coop.id),
        "name": coop.name,
        "region": coop.region,
        "status": coop.status,
        "chairman_user_id": str(coop.chairman_user_id)
        if coop.chairman_user_id
        else None,
        "aggregates": {
            "members": accounts.count(),
            "active_vehicles": active_vehicles,
            "unreturned_batteries": unreturned,
            "savings_kobo": savings_kobo,
            "savings_note": savings_note,
        },
        "members": members,
    }


def assert_can_view_cooperative(*, user, coop: Cooperative) -> None:
    is_ops = user_has_capability(user, "cooperatives:manage") or user_has_capability(
        user, "accounts:manage"
    )
    if not is_ops and coop.chairman_user_id != user.id:
        raise DomainError(
            "FORBIDDEN",
            "You can only view your own cooperative.",
            http=403,
        )


class CooperativeAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, HasCapability]
    required_capability = "analytics:cooperative"

    @extend_schema(responses={200: dict})
    def get(self, request, cooperative_id=None):
        coop = (
            Cooperative.objects.select_related("chairman_user")
            .filter(pk=cooperative_id)
            .first()
        )
        if coop is None:
            raise DomainError("NOT_FOUND", "Cooperative not found.", http=404)
        assert_can_view_cooperative(user=request.user, coop=coop)
        return ok(cooperative_analytics_payload(coop=coop))


class MyCooperativeView(APIView):
    permission_classes = [IsAuthenticated, HasCapability]
    required_capability = "analytics:cooperative"

    @extend_schema(responses={200: dict})
    def get(self, request):
        coop = (
            Cooperative.objects.filter(chairman_user_id=request.user.id)
            .order_by("name")
            .first()
        )
        if coop is None and (
            user_has_capability(request.user, "cooperatives:manage")
            or user_has_capability(request.user, "accounts:manage")
        ):
            coop = Cooperative.objects.order_by("name").first()
        if coop is None:
            raise DomainError(
                "NOT_FOUND",
                "No cooperative linked to this user.",
                http=404,
            )
        assert_can_view_cooperative(user=request.user, coop=coop)
        return ok(cooperative_analytics_payload(coop=coop))
