import hashlib
import json
import uuid

from django.conf import settings
from django.db import models, transaction


class AuditLog(models.Model):
    """
    Tamper-evident audit trail. Entries form a hash chain: each entry_hash
    covers the entry's canonical content plus the previous entry's hash, so
    any edit or deletion in the middle of the log breaks verification
    (`manage.py verify_audit_chain`). Rows are never updated or deleted by
    application code.
    """

    class Action(models.TextChoices):
        CREATE = "create"
        UPDATE = "update"
        DELETE = "delete"
        VIEW = "view"
        UPLOAD = "upload"
        DOWNLOAD = "download"
        REDACT = "redact"
        APPROVE = "approve"
        PUBLISH = "publish"
        EXPORT = "export"
        LOGIN = "login"
        LOGOUT = "logout"
        LOGIN_FAILED = "login_failed"
        LOCK = "lock"
        UNLOCK = "unlock"
        LOCK_OVERRIDE = "lock_override"
        PERMISSION_CHANGE = "permission_change"
        ADMIN_ACTION = "admin_action"
        BACKUP = "backup"
        RESTORE = "restore"
        SECURITY = "security"
        SYSTEM = "system"

    class Severity(models.TextChoices):
        INFO = "info"
        NOTICE = "notice"
        WARNING = "warning"
        CRITICAL = "critical"

    event_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_events"
    )
    actor_username = models.CharField(max_length=150, blank=True, db_index=True)
    actor_role = models.CharField(max_length=200, blank=True)
    department = models.CharField(max_length=120, blank=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)

    action = models.CharField(max_length=32, choices=Action.choices, db_index=True)
    module = models.CharField(max_length=40, db_index=True)
    object_type = models.CharField(max_length=80, blank=True, db_index=True)
    object_id = models.CharField(max_length=64, blank=True, db_index=True)
    object_repr = models.CharField(max_length=300, blank=True)

    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)

    success = models.BooleanField(default=True)
    severity = models.CharField(max_length=16, choices=Severity.choices, default=Severity.INFO, db_index=True)
    reason = models.TextField(blank=True)
    retention_category = models.CharField(max_length=60, default="audit-standard")

    prev_hash = models.CharField(max_length=64, blank=True)
    entry_hash = models.CharField(max_length=64, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def canonical_payload(self) -> str:
        payload = {
            "event_id": str(self.event_id),
            "created_at": self.created_at.isoformat() if self.created_at else "",
            "actor": self.actor_username,
            "action": self.action,
            "module": self.module,
            "object_type": self.object_type,
            "object_id": self.object_id,
            "before": self.before,
            "after": self.after,
            "success": self.success,
            "severity": self.severity,
            "prev_hash": self.prev_hash,
        }
        return json.dumps(payload, sort_keys=True, default=str)

    def compute_hash(self) -> str:
        return hashlib.sha256(self.canonical_payload().encode()).hexdigest()

    @classmethod
    def append(cls, **kwargs) -> "AuditLog":
        """Append an entry, chaining it to the latest hash atomically."""
        with transaction.atomic():
            last = cls.objects.select_for_update().order_by("-id").first() if _supports_locking() else cls.objects.order_by("-id").first()
            entry = cls(**kwargs)
            entry.prev_hash = last.entry_hash if last else "genesis"
            entry.save()
            entry.entry_hash = entry.compute_hash()
            cls.objects.filter(pk=entry.pk).update(entry_hash=entry.entry_hash)
            return entry


def _supports_locking() -> bool:
    from django.db import connection

    return connection.vendor != "sqlite"
