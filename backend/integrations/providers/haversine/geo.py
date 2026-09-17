"""Straight-line distance — always-on GeoPort (swap to OSRM/Google later)."""
from __future__ import annotations

import math

from integrations.ports.geo import (
    DistanceItem,
    DistanceResult,
    DistanceTarget,
    GeoProviderCode,
    LatLng,
)


def haversine_km(a: LatLng, b: LatLng) -> float:
    r = 6371.0
    p1, p2 = math.radians(a.lat), math.radians(b.lat)
    dphi = math.radians(b.lat - a.lat)
    dlmb = math.radians(b.lng - a.lng)
    h = (
        math.sin(dphi / 2) ** 2
        + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    )
    return 2 * r * math.asin(math.sqrt(h))


class HaversineGeo:
    code = GeoProviderCode.HAVERSINE

    def distances(
        self, *, origin: LatLng, destinations: list[DistanceTarget]
    ) -> DistanceResult:
        items: list[DistanceItem] = []
        for dest in destinations:
            km = haversine_km(origin, dest.point)
            # Rough urban ETA: ~4 min per km (same heuristic as client).
            items.append(
                DistanceItem(
                    id=dest.id,
                    distance_km=round(km, 3),
                    duration_s=int(max(60, round(km * 4 * 60))),
                )
            )
        return DistanceResult(provider=self.code, items=tuple(items))


def get_geo_port() -> HaversineGeo:
    """Registry hook — later: settings.DEFAULT_GEO → OSRM / Google."""
    return HaversineGeo()
