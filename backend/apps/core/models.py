from django.conf import settings
from django.db import models


class SystemSetting(models.Model):
    """Admin-editable configuration (login policy, notification toggles, etc.)."""

    key = models.CharField(max_length=80, unique=True)
    value = models.JSONField()
    description = models.CharField(max_length=300, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["key"]

    def __str__(self):
        return self.key
