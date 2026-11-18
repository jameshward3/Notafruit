from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.models import AuditLog
from apps.audit.services import log_event
from apps.core.api import AuditedModelViewSet
from apps.records.locking import LockableMixin

from .models import Ordinance, Resolution

COMMON_FIELDS = [
    "id", "number", "title", "summary", "sponsor", "co_sponsors", "department", "department_name",
    "status", "introduced_date", "public_hearing_date", "adoption_date", "effective_date",
    "publication_date", "legal_review", "fiscal_impact", "related_meeting", "related_agenda_item",
    "attachments", "amendments", "notes", "created_at", "updated_at",
]


class OrdinanceSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True, default="")

    class Meta:
        model = Ordinance
        fields = COMMON_FIELDS + ["second_reading_date"]


class ResolutionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True, default="")

    class Meta:
        model = Resolution
        fields = COMMON_FIELDS + ["consent_agenda"]


class _LegislativeViewSet(LockableMixin, AuditedModelViewSet):
    audit_module = "legislation"
    filterset_fields = ["status", "department", "legal_review", "sponsor"]
    search_fields = ["number", "title", "summary", "sponsor"]
    ordering_fields = ["number", "introduced_date", "adoption_date", "updated_at"]

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        log_event(AuditLog.Action.CREATE, "legislation", obj=instance, after={"number": instance.number, "status": instance.status})

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        super().perform_update(serializer)
        new_status = serializer.instance.status
        if old_status != new_status:
            log_event(
                AuditLog.Action.UPDATE, "legislation", obj=serializer.instance,
                before={"status": old_status}, after={"status": new_status},
                reason="Status transition", severity=AuditLog.Severity.NOTICE,
            )

    @action(detail=True, methods=["get"])
    def timeline(self, request, pk=None):
        return Response({"lifecycle": self.get_object().lifecycle()})


class OrdinanceViewSet(_LegislativeViewSet):
    queryset = Ordinance.objects.select_related("department", "related_meeting")
    serializer_class = OrdinanceSerializer
    rbac = {
        "view": "records.view", "create": "ordinances.manage", "edit": "ordinances.manage",
        "delete": "ordinances.manage", "timeline": "records.view",
        "lock": "ordinances.manage", "unlock": "ordinances.manage", "lock_status": "records.view",
    }


class ResolutionViewSet(_LegislativeViewSet):
    queryset = Resolution.objects.select_related("department", "related_meeting")
    serializer_class = ResolutionSerializer
    rbac = {
        "view": "records.view", "create": "resolutions.manage", "edit": "resolutions.manage",
        "delete": "resolutions.manage", "timeline": "records.view",
        "lock": "resolutions.manage", "unlock": "resolutions.manage", "lock_status": "records.view",
    }
