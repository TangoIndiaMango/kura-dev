from django.db import models


class VehicleType(models.TextChoices):
    MOTORCYCLE = 'MOTORCYCLE', 'Commercial Motorcycle (Okada)'
    TRICYCLE = 'TRICYCLE', 'Commercial Tricycle (Keke)'
    BOAT = 'BOAT', 'Passenger Canoe / Boat'


def normalize_vehicle_type(raw: str | None) -> str:
    """Catalogue vehicle types: canonical codes plus admin-added custom codes."""
    import re

    code = re.sub(r"[^A-Z0-9]+", "_", (raw or "").strip().upper()).strip("_")
    return code[:50] or VehicleType.MOTORCYCLE
