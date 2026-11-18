import csv

from django.http import HttpResponse
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.api import ReadOnlyAuditedViewSet

from .models import AuditLog
from .services import log_event


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id", "event_id", "created_at", "actor", "actor_username", "actor_role", "department",
            "ip_address", "user_agent", "action", "module", "object_type", "object_id", "object_repr",
            "before", "after", "success", "severity", "reason", "retention_category", "entry_hash",
        ]


class AuditLogViewSet(ReadOnlyAuditedViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    audit_module = "audit"
    rbac = {"view": "logs.view", "export": "logs.export", "verify": "logs.view"}
    filterset_fields = ["action", "module", "severity", "success", "actor_username", "department", "object_type", "ip_address"]
    search_fields = ["actor_username", "object_repr", "reason", "object_id"]
    ordering_fields = ["created_at", "severity"]

    def get_queryset(self):
        qs = super().get_queryset()
        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        if start:
            qs = qs.filter(created_at__date__gte=start)
        if end:
            qs = qs.filter(created_at__date__lte=end)
        return qs

    @action(detail=False, methods=["get"])
    def export(self, request):
        """CSV export of the current filter set (audited itself)."""
        qs = self.filter_queryset(self.get_queryset())[:50000]
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="clerkos-audit-log.csv"'
        writer = csv.writer(response)
        writer.writerow([
            "event_id", "created_at", "actor", "role", "department", "ip", "action", "module",
            "object_type", "object_id", "object", "success", "severity", "reason", "entry_hash",
        ])
        for e in qs.iterator():
            writer.writerow([
                e.event_id, e.created_at.isoformat(), e.actor_username, e.actor_role, e.department,
                e.ip_address, e.action, e.module, e.object_type, e.object_id, e.object_repr,
                e.success, e.severity, e.reason, e.entry_hash,
            ])
        log_event(AuditLog.Action.EXPORT, "audit", object_repr="Audit log CSV export", severity=AuditLog.Severity.NOTICE)
        return response

    @action(detail=False, methods=["get"])
    def verify(self, request):
        """On-demand chain verification for the compliance center."""
        prev = "genesis"
        for entry in AuditLog.objects.order_by("id").iterator():
            if entry.prev_hash != prev or entry.compute_hash() != entry.entry_hash:
                return Response({"intact": False, "first_broken_entry": str(entry.event_id)})
            prev = entry.entry_hash
        return Response({"intact": True, "entries": AuditLog.objects.count()})
