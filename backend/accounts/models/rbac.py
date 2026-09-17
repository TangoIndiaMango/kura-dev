from django.db import models

from core.models import BaseModel


class Permission(BaseModel):
    code = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    module = models.CharField(max_length=80, db_index=True)
    description = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["module", "code"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Role(BaseModel):
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    is_system = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, db_index=True)
    permissions = models.ManyToManyField(Permission, blank=True, related_name="roles")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"
