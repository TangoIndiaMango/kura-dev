"""Role read queries — list annotations stay here, not in views."""
from __future__ import annotations

from django.db.models import Count, IntegerField, OuterRef, Q, Subquery, Value
from django.db.models.functions import Coalesce
from django.db.models.query import QuerySet

from accounts.models import Role, User


def _assigned_user_count_subquery() -> Coalesce:
    """
    Users who effectively hold this role:
    - assigned_role FK points here (gets this role's permission set), or
    - legacy rows with role=code and no assigned_role yet.
    """
    return Coalesce(
        Subquery(
            User.objects.filter(
                Q(assigned_role_id=OuterRef("pk"))
                | Q(assigned_role_id__isnull=True, role=OuterRef("code"))
            )
            .order_by()
            .annotate(_g=Value(1))
            .values("_g")
            .annotate(c=Count("id"))
            .values("c")[:1],
            output_field=IntegerField(),
        ),
        Value(0),
        output_field=IntegerField(),
    )


def roles_qs(*, with_permissions: bool = False) -> QuerySet[Role]:
    qs = Role.objects.all().annotate(
        user_count=_assigned_user_count_subquery(),
        permission_count=Count("permissions", distinct=True),
    )
    if with_permissions:
        qs = qs.prefetch_related("permissions")
    return qs.order_by("name")
