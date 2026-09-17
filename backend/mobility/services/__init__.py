"""Public service facades — lazy so submodule imports (e.g. plans.jobs) stay light."""
from __future__ import annotations

from typing import Any

__all__ = [
    "BatteryService",
    "DiscountService",
    "HubService",
    "PricingService",
    "ReservationService",
    "SubscriptionService",
    "SwapService",
    "VehicleService",
]

_EXPORTS = {
    "BatteryService": "mobility.services.batteries.service",
    "DiscountService": "mobility.services.plans.discounts",
    "HubService": "mobility.services.hubs.service",
    "PricingService": "mobility.services.plans.pricing",
    "ReservationService": "mobility.services.reservations.service",
    "SubscriptionService": "mobility.services.plans.subscriptions",
    "SwapService": "mobility.services.swap.service",
    "VehicleService": "mobility.services.vehicles.service",
}


def __getattr__(name: str) -> Any:
    mod_path = _EXPORTS.get(name)
    if mod_path is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    from importlib import import_module

    return getattr(import_module(mod_path), name)
