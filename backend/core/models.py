import uuid
import uuid6
from django.db import models

class BaseModel(models.Model):
    """
    Abstract base model that uses UUIDv7 for time-ordered primary keys,
    with auto-managed timestamps.
    """
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']

class AuditEvent(BaseModel):
    """
    Append-only audit trail logging sensitive administrative and operational actions.
    """
    actor_email = models.CharField(max_length=255, blank=True, default='')
    action = models.CharField(max_length=100) # e.g. "swap.completed", "battery.assigned", "wallet.hold"
    target_model = models.CharField(max_length=100)
    target_id = models.CharField(max_length=100)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.created_at}] {self.actor_email}: {self.action} on {self.target_model}:{self.target_id}"
