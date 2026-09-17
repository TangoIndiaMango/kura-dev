from django.db import models

from accounts.models.user import User
from core.models import BaseModel


class Cooperative(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    name = models.CharField(max_length=200)
    region = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    chairman_user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="chaired_cooperatives",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
