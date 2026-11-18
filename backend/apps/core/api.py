"""
Shared API plumbing: RBAC enforcement and automatic audit logging for every
ViewSet in the system.
"""
from rest_framework import permissions, viewsets

from apps.audit.models import AuditLog
from apps.audit.services import log_event

# Default mapping from DRF action to the kind of RBAC permission needed.
ACTION_KIND = {
    "list": "view",
    "retrieve": "view",
    "create": "create",
    "update": "edit",
    "partial_update": "edit",
    "destroy": "delete",
}


class HasRBACPermission(permissions.BasePermission):
    """
    Reads the viewset's `rbac` map: {"view": code, "create": code, "edit":
    code, "delete": code, "<custom_action>": code}. Missing keys fall back to
    the "view" code; a value of None means authenticated-only.
    """

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        rbac = getattr(view, "rbac", {})
        kind = ACTION_KIND.get(view.action, view.action)
        code = rbac.get(kind, rbac.get("view"))
        if code is None:
            return True
        return user.has_permission_code(code)


class AuditedModelViewSet(viewsets.ModelViewSet):
    """
    ModelViewSet that enforces RBAC and writes create/update/delete events to
    the audit trail with before/after snapshots.
    """

    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    audit_module = "core"
    rbac: dict = {}

    def _snapshot(self, instance):
        try:
            return self.get_serializer(instance).data
        except Exception:
            return {"repr": str(instance)}

    def perform_create(self, serializer):
        instance = serializer.save()
        log_event(AuditLog.Action.CREATE, self.audit_module, obj=instance, after=self._snapshot(instance))

    def perform_update(self, serializer):
        before = self._snapshot(serializer.instance)
        instance = serializer.save()
        after = self._snapshot(instance)
        changed_before = {k: v for k, v in before.items() if after.get(k) != v}
        changed_after = {k: v for k, v in after.items() if before.get(k) != v}
        log_event(AuditLog.Action.UPDATE, self.audit_module, obj=instance, before=changed_before, after=changed_after)

    def perform_destroy(self, instance):
        before = self._snapshot(instance)
        obj_type, obj_id, obj_repr = type(instance).__name__, str(instance.pk), str(instance)[:300]
        instance.delete()
        log_event(
            AuditLog.Action.DELETE,
            self.audit_module,
            object_type=obj_type,
            object_id=obj_id,
            object_repr=obj_repr,
            before=before,
            severity=AuditLog.Severity.NOTICE,
        )


class ReadOnlyAuditedViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    audit_module = "core"
    rbac: dict = {}
