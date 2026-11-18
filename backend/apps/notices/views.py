from rest_framework import serializers

from apps.audit.models import AuditLog
from apps.audit.services import log_event
from apps.core.api import AuditedModelViewSet
from apps.records.locking import LockableMixin

from .models import PublicNotice


class PublicNoticeSerializer(serializers.ModelSerializer):
    meeting_title = serializers.CharField(source="related_meeting.title", read_only=True, default="")
    ordinance_number = serializers.CharField(source="related_ordinance.number", read_only=True, default="")
    resolution_number = serializers.CharField(source="related_resolution.number", read_only=True, default="")

    class Meta:
        model = PublicNotice
        fields = [
            "id", "title", "category", "body", "newspaper", "required_publication_date",
            "publication_date", "public_hearing_date", "status", "related_meeting", "meeting_title",
            "related_ordinance", "ordinance_number", "related_resolution", "resolution_number",
            "proof_document", "created_at", "updated_at",
        ]


class PublicNoticeViewSet(LockableMixin, AuditedModelViewSet):
    queryset = PublicNotice.objects.select_related("related_meeting", "related_ordinance", "related_resolution")
    serializer_class = PublicNoticeSerializer
    audit_module = "notices"
    rbac = {
        "view": "records.view", "create": "notices.manage", "edit": "notices.manage", "delete": "notices.manage",
        "lock": "notices.manage", "unlock": "notices.manage", "lock_status": "records.view",
    }
    filterset_fields = ["category", "status", "newspaper", "related_meeting", "related_ordinance"]
    search_fields = ["title", "body", "newspaper"]
    ordering_fields = ["required_publication_date", "publication_date", "created_at"]

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        log_event(AuditLog.Action.CREATE, "notices", obj=instance, after={"title": instance.title})
