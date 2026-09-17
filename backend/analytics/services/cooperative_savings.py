"""Estimated cooperative savings vs petrol (design 03.10 — not a guarantee)."""
from __future__ import annotations

from django.conf import settings
from django.db.models import Count

from mobility.models import Swap


def estimate_savings_kobo(*, account_ids: list) -> tuple[int, str]:
    """
    litres_per_swap × petrol_price_kobo × completed swaps for member accounts.
    Tunable via COOP_PETROL_LITRES_PER_SWAP and COOP_PETROL_PRICE_KOBO_PER_LITRE.
    """
    if not account_ids:
        return 0, "No member swaps yet."
    litres = float(getattr(settings, "COOP_PETROL_LITRES_PER_SWAP", 1.2) or 1.2)
    price = int(
        getattr(settings, "COOP_PETROL_PRICE_KOBO_PER_LITRE", 85_000) or 85_000
    )
    swaps = (
        Swap.objects.filter(
            account_id__in=account_ids,
            status=Swap.Status.COMPLETED,
        ).aggregate(n=Count("id"))["n"]
        or 0
    )
    # Integer kobo: litres × price, scaled by 1000 to avoid float drift on 1.2
    savings = int(swaps * int(round(litres * 1000)) * price // 1000)
    note = (
        f"Estimate vs petrol · {swaps} swaps · "
        f"{litres:g} L × ₦{price // 100}/L · not a guarantee"
    )
    return savings, note
