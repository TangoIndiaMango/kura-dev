"""Catalogue range estimate — plug BMS range later via same vehicle DTO."""
from __future__ import annotations

from mobility.models import Battery


def estimate_range_km(*, battery: Battery | None) -> int | None:
    """
    Est. km from SoC × usable Wh / Wh-per-km × SoH.
    Returns None when catalogue energy fields are unset.
    """
    if battery is None:
        return None
    btype = battery.battery_type
    usable = getattr(btype, "usable_energy_wh", None)
    wh_km = getattr(btype, "wh_per_km", None)
    if not usable or not wh_km or int(wh_km) <= 0:
        return None
    soc = max(0, min(100, int(battery.charge_pct))) / 100.0
    soh = max(50, min(100, int(battery.health_pct or 100))) / 100.0
    km = (soc * int(usable) * soh) / float(wh_km)
    return max(0, int(km))
