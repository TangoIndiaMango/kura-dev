from django.db import models

from core.models import BaseModel


class OtpChallenge(BaseModel):
    class Purpose(models.TextChoices):
        LOGIN = "LOGIN", "Login"
        REGISTER = "REGISTER", "Register"
        PHONE_CHANGE = "PHONE_CHANGE", "Phone change"
        PIN_RESET = "PIN_RESET", "PIN reset"
        AGENT_ACTION = "AGENT_ACTION", "Agent action"

    class Channel(models.TextChoices):
        WEB = "WEB", "Web"
        APP = "APP", "App"
        USSD = "USSD", "USSD"
        HUB = "HUB", "Hub"

    phone = models.CharField(max_length=30, db_index=True)
    purpose = models.CharField(max_length=20, choices=Purpose.choices, default=Purpose.LOGIN)
    channel = models.CharField(
        max_length=10, choices=Channel.choices, default=Channel.WEB, db_index=True
    )
    code_hash = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    consumed_at = models.DateTimeField(null=True, blank=True)
    device_id = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        indexes = [
            models.Index(fields=["phone", "purpose", "consumed_at"]),
            models.Index(fields=["channel", "created_at"]),
        ]

    def __str__(self):
        return f"OTP {self.purpose} {self.phone} @ {self.created_at}"
