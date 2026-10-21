from django.db import models

from accounts.models.account import Account
from accounts.models.user import User
from core.models import BaseModel


class Driver(BaseModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="driver_profile")
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="drivers")
    license_number = models.CharField(max_length=50, blank=True, default="")
    status = models.CharField(max_length=20, default="ACTIVE")
    daily_swap_limit = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Null = unlimited. Soft fleet cap on completed swaps per calendar day.",
    )
    daily_spend_kobo_limit = models.BigIntegerField(
        null=True,
        blank=True,
        help_text="Null = unlimited. Soft fleet cap on swap spend (kobo) per calendar day.",
    )
    photo = models.ForeignKey(
        "core.MediaAsset",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="driver_profiles",
    )

    def __str__(self):
        return f"Driver {self.user.first_name} {self.user.last_name} ({self.account.kura_id})"
