"""
Record-locking mixin for any AuditedModelViewSet.

Adds POST /{id}/lock/, /{id}/unlock/, GET /{id}/lock_status/, and blocks
update/destroy with 423 Locked while another user holds the lock. Users
holding "locks.override" may pass override=true to take a lock over.
"""
from datetime import timedelta

from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.models import AuditLog
from apps.audit.services import log_event

from .models import RecordLock

LOCK_MINUTES = 30
HTTP_423_LOCKED = 423


def _lock_payload(lock: RecordLock | None):
    if lock is None:
        return {"locked": False}
    return {
        "locked": True,
        "locked_by": lock.locked_by.get_full_name() or lock.locked_by.username,
        "locked_by_id": lock.locked_by_id,
        "locked_at": lock.locked_at,
        "expires_at": lock.expires_at,
    }


class LockableMixin:
    def _record_type(self) -> str:
        return self.get_queryset().model.__name__

    def _active_lock(self, obj) -> RecordLock | None:
        return RecordLock.active_for(self._record_type(), obj.pk)

    def _check_lock(self, request, obj):
        lock = self._active_lock(obj)
        if lock and lock.locked_by_id != request.user.pk:
            log_event(
                AuditLog.Action.SECURITY, self.audit_module, obj=obj, success=False,
                severity=AuditLog.Severity.WARNING,
                reason=f"Edit blocked: record locked by {lock.locked_by.username}",
            )
            return Response(
                {"detail": f"Record is being edited by {lock.locked_by.get_full_name() or lock.locked_by.username}.",
                 "lock": _lock_payload(lock)},
                status=HTTP_423_LOCKED,
            )
        return None

    def update(self, request, *args, **kwargs):
        blocked = self._check_lock(request, self.get_object())
        return blocked if blocked is not None else super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        blocked = self._check_lock(request, self.get_object())
        return blocked if blocked is not None else super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["get"])
    def lock_status(self, request, pk=None):
        return Response(_lock_payload(self._active_lock(self.get_object())))

    @action(detail=True, methods=["post"])
    def lock(self, request, pk=None):
        obj = self.get_object()
        existing = self._active_lock(obj)
        if existing and existing.locked_by_id == request.user.pk:
            existing.expires_at = timezone.now() + timedelta(minutes=LOCK_MINUTES)
            existing.save(update_fields=["expires_at"])
            return Response(_lock_payload(existing))
        if existing:
            if request.data.get("override") and request.user.has_permission_code("locks.override"):
                existing.released_at = timezone.now()
                existing.overridden_by = request.user
                existing.save(update_fields=["released_at", "overridden_by"])
                log_event(
                    AuditLog.Action.LOCK_OVERRIDE, self.audit_module, obj=obj,
                    severity=AuditLog.Severity.WARNING,
                    reason=f"Lock held by {existing.locked_by.username} overridden",
                )
            else:
                return Response(
                    {"detail": "Record already locked.", "lock": _lock_payload(existing)}, status=HTTP_423_LOCKED
                )
        lock = RecordLock.objects.create(
            record_type=self._record_type(), record_id=str(obj.pk), locked_by=request.user,
            expires_at=timezone.now() + timedelta(minutes=LOCK_MINUTES),
        )
        log_event(AuditLog.Action.LOCK, self.audit_module, obj=obj)
        return Response(_lock_payload(lock))

    @action(detail=True, methods=["post"])
    def unlock(self, request, pk=None):
        obj = self.get_object()
        lock = self._active_lock(obj)
        if lock is None:
            return Response({"locked": False})
        if lock.locked_by_id != request.user.pk and not request.user.has_permission_code("locks.override"):
            return Response({"detail": "Only the lock holder or an authorized admin may unlock."}, status=403)
        lock.released_at = timezone.now()
        if lock.locked_by_id != request.user.pk:
            lock.overridden_by = request.user
        lock.save(update_fields=["released_at", "overridden_by"])
        log_event(AuditLog.Action.UNLOCK, self.audit_module, obj=obj)
        return Response({"locked": False})
