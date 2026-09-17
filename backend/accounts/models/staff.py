from django.db import models

from accounts.models.user import User
from core.models import BaseModel


class StaffMembership(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=50)
    hub_id = models.CharField(max_length=100, blank=True, default="*")

    def __str__(self):
        return f"{self.user.email} - {self.role} (Hub: {self.hub_id})"


class PasswordSetupToken(BaseModel):
    """One-time staff invite / password-reset token (raw token only in email)."""

    class Purpose(models.TextChoices):
        INVITE = "INVITE", "Staff invite"
        RESET = "RESET", "Password reset"

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="password_setup_tokens"
    )
    purpose = models.CharField(
        max_length=20, choices=Purpose.choices, default=Purpose.INVITE, db_index=True
    )
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "purpose", "consumed_at"]),
        ]

    def __str__(self):
        return f"{self.purpose} for {self.user_id}"
