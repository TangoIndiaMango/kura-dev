"""Discount quote + consume for reservation booking (swap period)."""
from __future__ import annotations

from mobility.models import Reservation, Vehicle
from mobility.services.plans.discounts import DiscountQuote, DiscountService

_CHANNELS = {"APP": "App", "USSD": "USSD"}


def channel_for_source(source: str) -> str:
    return _CHANNELS.get((source or Reservation.Source.APP).upper(), "Hub")


def quote_reservation_discount(
    *,
    code: str,
    list_price_kobo: int,
    source: str,
    account,
) -> DiscountQuote:
    return DiscountService.quote(
        code=code,
        list_price_kobo=list_price_kobo,
        period="swap",
        channel=channel_for_source(source),
        vehicle_count=Vehicle.objects.filter(account=account).count(),
    )


def consume_reservation_discount(
    *,
    quote: DiscountQuote,
    reservation: Reservation,
    list_price_kobo: int,
    source: str,
    account,
) -> None:
    DiscountService.consume(
        code=quote.code,
        list_price_kobo=list_price_kobo,
        period="swap",
        channel=channel_for_source(source),
        account=account,
        vehicle_count=Vehicle.objects.filter(account=account).count(),
        idempotency_key=f"reservation:{reservation.id}",
    )
    reservation.list_price_kobo = list_price_kobo
    reservation.discount_code = quote.code
    reservation.discount_kobo = quote.discount_kobo
    reservation.save(
        update_fields=[
            "list_price_kobo",
            "discount_code",
            "discount_kobo",
            "updated_at",
        ]
    )
