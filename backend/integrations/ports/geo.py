"""Provider-agnostic geo contracts — discover/maps only see these shapes."""
from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol
from uuid import UUID


class GeoProviderCode(StrEnum):
    HAVERSINE = "HAVERSINE"
    OSRM = "OSRM"
    GOOGLE = "GOOGLE"


@dataclass(frozen=True, slots=True)
class LatLng:
    lat: float
    lng: float


@dataclass(frozen=True, slots=True)
class DistanceTarget:
    id: UUID
    point: LatLng


@dataclass(frozen=True, slots=True)
class DistanceItem:
    id: UUID
    distance_km: float
    duration_s: float | None = None


@dataclass(frozen=True, slots=True)
class DistanceResult:
    provider: GeoProviderCode
    items: tuple[DistanceItem, ...]


class GeoPort(Protocol):
    code: GeoProviderCode

    def distances(
        self, *, origin: LatLng, destinations: list[DistanceTarget]
    ) -> DistanceResult: ...
