from django.db import models

from core.models import BaseModel


class PspWebhookEvent(BaseModel):
    class Provider(models.TextChoices):
        PAYSTACK = "PAYSTACK", "Paystack"
        NOMBA = "NOMBA", "Nomba"

    class Status(models.TextChoices):
        RECEIVED = "RECEIVED", "Received"
        PROCESSED = "PROCESSED", "Processed"
        IGNORED = "IGNORED", "Ignored"
        FAILED = "FAILED", "Failed"

    psp = models.CharField(max_length=20, choices=Provider.choices, db_index=True)
    psp_event_id = models.CharField(max_length=120, db_index=True)
    event_kind = models.CharField(max_length=40, blank=True, default="")
    payload = models.JSONField(default=dict)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.RECEIVED, db_index=True
    )
    error = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["psp", "psp_event_id"],
                name="uniq_psp_webhook_event",
            )
        ]
        indexes = [
            models.Index(fields=["psp", "status", "created_at"]),
        ]

    def __str__(self):
        return f"{self.psp}:{self.psp_event_id} ({self.status})"
