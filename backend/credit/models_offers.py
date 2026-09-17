from django.db import models

from accounts.models import Account
from core.models import BaseModel


class ProductOffer(BaseModel):
    class Type(models.TextChoices):
        CREDIT = "CREDIT", "Credit"
        INSURANCE = "INSURANCE", "Insurance"
        FINANCING = "FINANCING", "Financing"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACTIVE = "ACTIVE", "Active"
        PAUSED = "PAUSED", "Paused"
        ENDED = "ENDED", "Ended"

    name = models.CharField(max_length=120)
    offer_type = models.CharField(max_length=20, choices=Type.choices)
    summary = models.CharField(max_length=255, blank=True, default="")
    terms = models.JSONField(default=dict, blank=True)
    segment_criteria = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True
    )

    class Meta:
        ordering = ["-created_at"]


class OfferAssignment(BaseModel):
    class Status(models.TextChoices):
        OFFERED = "OFFERED", "Offered"
        ACCEPTED = "ACCEPTED", "Accepted"
        ACTIVE = "ACTIVE", "Active"
        COMPLETED = "COMPLETED", "Completed"
        DEFAULTED = "DEFAULTED", "Defaulted"

    class Channel(models.TextChoices):
        APP = "APP", "App"
        USSD = "USSD", "USSD"

    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="offer_assignments"
    )
    offer = models.ForeignKey(
        ProductOffer, on_delete=models.CASCADE, related_name="assignments"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OFFERED, db_index=True
    )
    amount_kobo = models.BigIntegerField(null=True, blank=True)
    channel = models.CharField(
        max_length=10, choices=Channel.choices, default=Channel.APP
    )

    class Meta:
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["account", "status"])]
        constraints = [
            models.UniqueConstraint(
                fields=["account", "offer"],
                name="uniq_offer_assignment_account_offer",
            ),
        ]
