from django.db import models

class VehicleType(models.TextChoices):
    MOTORCYCLE = 'MOTORCYCLE', 'Commercial Motorcycle (Okada)'
    TRICYCLE = 'TRICYCLE', 'Commercial Tricycle (Keke)'
    BOAT = 'BOAT', 'Passenger Canoe / Boat'

