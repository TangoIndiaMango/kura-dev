"""Hub / account money statement rows for CSV/PDF export (manual reconciliation)."""
from __future__ import annotations

from collections import defaultdict
from zoneinfo import ZoneInfo

from django.conf import settings

from finance.models import Payment
from finance.services.receipts import CHANNEL_LABELS

STATEMENT_HEADERS = [
    "Time (WAT)",
    "Receipt",
    "Hub",
    "Account (KURA ID)",
    "Account name",
    "Paid by",
    "Purpose",
    "Amount (NGN)",
    "VAT (NGN)",
    "Net (NGN)",
    "Vehicle",
    "Agent",
    "Status",
]


def _naira(kobo: int) -> str:
    return f"{kobo / 100:.2f}"


def statement_rows(qs):
    """One row per payment, then totals by channel and by account (successful only)."""
    tz = ZoneInfo(getattr(settings, "DISPLAY_TIME_ZONE", "Africa/Lagos"))
    qs = qs.select_related("account", "hub").prefetch_related(
        "swaps__vehicle", "swaps__agent"
    ).order_by("created_at")
    by_channel: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    by_account: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])
    total = [0, 0]
    for p in qs:
        swap = next(iter(p.swaps.all()), None)
        agent = getattr(swap, "agent", None) if swap else None
        vat = int(p.vat_kobo or 0)
        yield [
            p.created_at.astimezone(tz).strftime("%Y-%m-%d %H:%M"),
            p.receipt_code,
            p.hub.code if p.hub_id else "",
            p.account.kura_id,
            p.account.display_name,
            CHANNEL_LABELS.get(p.channel, p.channel),
            p.purpose,
            _naira(p.amount_kobo),
            _naira(vat),
            _naira(p.amount_kobo - vat),
            swap.vehicle.registration_plate if swap else "",
            f"{agent.first_name} {agent.last_name}".strip() if agent else "",
            p.status,
        ]
        if p.status != Payment.Status.SUCCESS:
            continue
        label = CHANNEL_LABELS.get(p.channel, p.channel)
        by_channel[label][0] += 1
        by_channel[label][1] += p.amount_kobo
        key = (p.account.kura_id, p.account.display_name)
        by_account[key][0] += 1
        by_account[key][1] += p.amount_kobo
        total[0] += 1
        total[1] += p.amount_kobo

    blank = [""] * len(STATEMENT_HEADERS)
    yield blank
    yield ["TOTALS (successful)", "", "", "", "", "Payments", "", _naira(total[1])] + [""] * 5
    yield ["", "", "", "", "", str(total[0]), "", ""] + [""] * 5
    yield blank
    yield ["BY CHANNEL", "", "", "", "", "Paid by", "Count", "Amount (NGN)"] + [""] * 5
    for label, (n, kobo) in sorted(by_channel.items()):
        yield ["", "", "", "", "", label, str(n), _naira(kobo)] + [""] * 5
    yield blank
    yield ["BY ACCOUNT", "", "", "KURA ID", "Account name", "", "Count", "Amount (NGN)"] + [""] * 5
    for (kura_id, name), (n, kobo) in sorted(by_account.items(), key=lambda kv: -kv[1][1]):
        yield ["", "", "", kura_id, name, "", str(n), _naira(kobo)] + [""] * 5
