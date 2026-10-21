from __future__ import annotations

from datetime import date, datetime, time, timedelta

from django.db import models
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from finance.models import Payment
from mobility.models import Subscription


def _day_bounds(start: date, end: date) -> tuple[datetime, datetime]:
    """Inclusive local-day window as aware datetimes (uses created_at index)."""
    tz = timezone.get_current_timezone()
    start_dt = timezone.make_aware(datetime.combine(start, time.min), tz)
    end_dt = timezone.make_aware(datetime.combine(end, time.max), tz)
    return start_dt, end_dt


def revenue_overview(*, start_date: date | None, end_date: date | None) -> dict:
    today = timezone.localdate()
    start = start_date or today - timedelta(days=29)
    end = end_date or today
    if start > end:
        start, end = end, start

    start_dt, end_dt = _day_bounds(start, end)
    payments = Payment.objects.filter(
        created_at__gte=start_dt,
        created_at__lte=end_dt,
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


def revenue_streams(*, start_date: date | None, end_date: date | None) -> dict:
    """Purpose/channel breakdown — live ledger streams (not modelled MRR)."""
    overview = revenue_overview(start_date=start_date, end_date=end_date)
    streams = [
        {
            "code": row["purpose"] or "OTHER",
            "label": row["purpose"] or "Other",
            "amount_kobo": int(row["amount_kobo"] or 0),
            "transactions": int(row["transactions"] or 0),
        }
        for row in overview["purposes"]
    ]
    return {
        "range": overview["range"],
        "gross_kobo": overview["gross_kobo"],
        "streams": streams,
        "channels": overview["channels"],
    }
