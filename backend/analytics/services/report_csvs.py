"""CSV builders for ReportJob kinds OPS / FLEET / REVENUE."""
from __future__ import annotations

import csv
import io
from calendar import monthrange
from datetime import date, datetime, timedelta
from typing import Sequence

from django.db.models import Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date

from analytics.models import DailyHubMetric
from core.helpers.csv_export import EXPORT_ROW_CAP
from core.money import split_vat_inclusive
from finance.models import LedgerTransaction
from mobility.models import Battery

# SOW 6.3 — Latila 60 / Emicraft 40 on net fee revenue.
LATILA_BPS = 6_000

REVENUE_KINDS = (
    LedgerTransaction.Kind.SWAP_FEE,
    LedgerTransaction.Kind.PLAN_FEE,
    LedgerTransaction.Kind.LOAN_REPAY,
)


def _csv_bytes(headers: Sequence[str], rows: Sequence[Sequence[object]]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(list(headers))
    for row in rows[:EXPORT_ROW_CAP]:
        writer.writerow(["" if c is None else str(c) for c in row])
    return buf.getvalue().encode("utf-8")


def _parse_day(raw: object, fallback: date) -> date:
    if raw is None or raw == "":
        return fallback
    if isinstance(raw, date) and not isinstance(raw, datetime):
        return raw
    parsed = parse_date(str(raw)[:10])
    return parsed or fallback


def _month_window(period: str | None) -> tuple[datetime, datetime, str]:
    now = timezone.now()
    label = (period or "").strip() or now.strftime("%Y-%m")
    try:
        year_s, month_s = label.split("-", 1)
        year, month = int(year_s), int(month_s)
        if month < 1 or month > 12:
            raise ValueError
    except ValueError:
        year, month = now.year, now.month
        label = f"{year:04d}-{month:02d}"
    start = timezone.make_aware(datetime(year, month, 1, 0, 0, 0))
    last = monthrange(year, month)[1]
    end = timezone.make_aware(datetime(year, month, last, 23, 59, 59))
    return start, end, label


def render_ops_csv(*, params: dict | None = None) -> tuple[bytes, str]:
    p = dict(params or {})
    today = timezone.localdate()
    date_to = _parse_day(p.get("date_to") or p.get("period"), today)
    period = p.get("period")
    if p.get("date_from"):
        date_from = _parse_day(p.get("date_from"), date_to - timedelta(days=30))
    elif isinstance(period, str) and len(period) == 7:
        start, end, _ = _month_window(period)
        date_from, date_to = start.date(), end.date()
    else:
        date_from = date_to - timedelta(days=30)

    qs = (
        DailyHubMetric.objects.filter(date__gte=date_from, date__lte=date_to)
        .select_related("hub")
        .order_by("date", "hub__code")
    )
    hub_id = str(p.get("hub_id") or p.get("hub") or "").strip()
    if hub_id:
        qs = qs.filter(hub_id=hub_id)

    headers = [
        "date",
        "hub_id",
        "hub_code",
        "hub_name",
        "swaps",
        "revenue_wallet_kobo",
        "revenue_cash_kobo",
        "revenue_other_kobo",
        "revenue_total_kobo",
        "batteries_ready_avg",
        "no_shows",
        "overrides",
    ]
    rows: list[list[object]] = []
    for m in qs.iterator(chunk_size=200):
        ch = m.revenue_kobo_by_channel or {}
        wallet = int(ch.get("WALLET") or ch.get("wallet") or 0)
        cash = int(ch.get("CASH") or ch.get("cash") or 0)
        total = sum(int(v or 0) for v in ch.values()) if ch else 0
        other = max(0, total - wallet - cash)
        rows.append(
            [
                m.date.isoformat(),
                str(m.hub_id),
                m.hub.code,
                m.hub.name,
                m.swaps,
                wallet,
                cash,
                other,
                total,
                m.batteries_ready_avg,
                m.no_shows,
                m.overrides,
            ]
        )
    stem = f"kura-ops-{date_from.isoformat()}_{date_to.isoformat()}"
    return _csv_bytes(headers, rows), f"{stem}.csv"


def render_fleet_csv(*, params: dict | None = None) -> tuple[bytes, str]:
    p = dict(params or {})
    qs = Battery.objects.select_related("battery_type", "current_hub").order_by(
        "serial"
    )
    status = str(p.get("status") or "").strip().upper()
    if status:
        qs = qs.filter(status=status)
    hub_id = str(p.get("hub_id") or p.get("hub") or "").strip()
    if hub_id:
        qs = qs.filter(current_hub_id=hub_id)

    headers = [
        "battery_id",
        "serial",
        "battery_type",
        "status",
        "charge_pct",
        "health_pct",
        "cycle_count",
        "health_band",
        "hub_code",
        "hub_name",
        "created_at",
    ]
    rows: list[list[object]] = []
    for bat in qs.iterator(chunk_size=200):
        health = int(bat.health_pct or 0)
        if health >= 90:
            band = "GOOD"
        elif health >= 70:
            band = "WATCH"
        else:
            band = "DEGRADED"
        rows.append(
            [
                str(bat.id),
                bat.serial,
                bat.battery_type.name if bat.battery_type_id else "",
                bat.status,
                bat.charge_pct,
                bat.health_pct,
                bat.cycle_count,
                band,
                bat.current_hub.code if bat.current_hub_id else "",
                bat.current_hub.name if bat.current_hub_id else "",
                bat.created_at.isoformat() if bat.created_at else "",
            ]
        )
    label = timezone.localdate().isoformat()
    return _csv_bytes(headers, rows), f"kura-fleet-{label}.csv"


def render_revenue_csv(*, params: dict | None = None) -> tuple[bytes, str]:
    """
    Monthly fee revenue from SWAP_FEE + PLAN_FEE + LOAN_REPAY interest lines.
    Latila 60 / Emicraft 40 on net. No account ids (consent-safe).
    Principal-only LOAN_REPAY rows (no revenue: credit) are skipped.
    """
    p = dict(params or {})
    start, end, label = _month_window(p.get("period"))
    txs = (
        LedgerTransaction.objects.filter(
            kind__in=REVENUE_KINDS,
            posted_at__gte=start,
            posted_at__lte=end,
        )
        .annotate(
            revenue_credit=Sum(
                "entries__credit_kobo",
                filter=Q(entries__ledger_account__code__startswith="revenue:"),
            ),
            vat_credit=Sum(
                "entries__credit_kobo",
                filter=Q(entries__ledger_account__code="vat_payable"),
            ),
        )
        .order_by("posted_at")
    )

    headers = [
        "period",
        "posted_at",
        "kind",
        "reference",
        "gross_kobo",
        "net_kobo",
        "vat_kobo",
        "latila_share_kobo",
        "emicraft_share_kobo",
    ]
    rows: list[list[object]] = []
    for tx in txs:
        net = int(tx.revenue_credit or 0)
        vat = int(tx.vat_credit or 0)
        if net == 0 and vat == 0:
            continue
        gross = net + vat
        if vat == 0 and gross > 0:
            net, vat = split_vat_inclusive(gross)
        latila = round(net * LATILA_BPS / 10_000)
        emicraft = net - latila
        rows.append(
            [
                label,
                tx.posted_at.isoformat() if tx.posted_at else "",
                tx.kind,
                tx.reference,
                gross,
                net,
                vat,
                latila,
                emicraft,
            ]
        )
    return _csv_bytes(headers, rows), f"kura-revenue-{label}.csv"
