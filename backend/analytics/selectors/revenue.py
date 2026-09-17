from __future__ import annotations

from datetime import date, timedelta

from django.db import models
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from finance.models import Payment
from mobility.models import Subscription


def revenue_overview(*, start_date: date | None, end_date: date | None) -> dict:
    today = timezone.localdate()
    start = start_date or today - timedelta(days=29)
    end = end_date or today
    if start > end:
        start, end = end, start

    payments = Payment.objects.filter(
        created_at__date__gte=start,
        created_at__date__lte=end,
    )
    successful = payments.filter(status=Payment.Status.SUCCESS)
    totals = successful.aggregate(
        gross_kobo=Sum("amount_kobo"),
        vat_kobo=Sum("vat_kobo"),
        transactions=Count("id"),
    )
    outstanding = payments.filter(status=Payment.Status.PENDING).aggregate(
        amount_kobo=Sum("amount_kobo"),
        transactions=Count("id"),
    )
    channels = list(
        successful.values("channel")
        .annotate(amount_kobo=Sum("amount_kobo"), transactions=Count("id"))
        .order_by("-amount_kobo")
    )
    purposes = list(
        successful.values("purpose")
        .annotate(amount_kobo=Sum("amount_kobo"), transactions=Count("id"))
        .order_by("-amount_kobo")
    )
    daily = list(
        successful.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(amount_kobo=Sum("amount_kobo"), transactions=Count("id"))
        .order_by("day")
    )
    subscriptions = Subscription.objects.aggregate(
        active=Count("id", filter=models.Q(status=Subscription.Status.ACTIVE)),
        pending=Count(
            "id",
            filter=models.Q(status=Subscription.Status.PENDING_PAYMENT),
        ),
        lapsed=Count(
            "id",
            filter=models.Q(status=Subscription.Status.LAPSED_TO_PPS),
        ),
    )
    return {
        "range": {"start_date": start.isoformat(), "end_date": end.isoformat()},
        "gross_kobo": totals["gross_kobo"] or 0,
        "vat_kobo": totals["vat_kobo"] or 0,
        "transactions": totals["transactions"] or 0,
        "outstanding_kobo": outstanding["amount_kobo"] or 0,
        "outstanding_transactions": outstanding["transactions"] or 0,
        "channels": channels,
        "purposes": purposes,
        "daily": [
            {**row, "day": row["day"].isoformat()}
            for row in daily
        ],
        "subscriptions": subscriptions,
    }
