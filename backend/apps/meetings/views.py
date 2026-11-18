from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.models import AuditLog
from apps.audit.services import log_event
from apps.core.api import AuditedModelViewSet
from apps.records.locking import LockableMixin

from .models import AgendaItem, Meeting, Minutes, Vote


class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ["id", "agenda_item", "member_name", "value", "recorded_at"]


class AgendaItemSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True, default="")
    submitted_by_name = serializers.CharField(source="submitted_by.get_full_name", read_only=True, default="")
    meeting_title = serializers.CharField(source="meeting.title", read_only=True)
    meeting_date = serializers.DateField(source="meeting.date", read_only=True)
    votes = VoteSerializer(many=True, read_only=True)

    class Meta:
        model = AgendaItem
        fields = [
            "id", "meeting", "meeting_title", "meeting_date", "order", "item_type", "title", "description",
            "department", "department_name", "submitted_by", "submitted_by_name", "status",
            "legal_review_required", "legal_review_completed", "attachments",
            "motion_text", "moved_by", "seconded_by", "result", "votes", "created_at", "updated_at",
        ]


class MeetingSerializer(serializers.ModelSerializer):
    agenda_item_count = serializers.IntegerField(source="agenda_items.count", read_only=True)
    body_name = serializers.CharField(source="body.name", read_only=True, default="")
    minutes_status = serializers.CharField(source="minutes.status", read_only=True, default="")

    class Meta:
        model = Meeting
        fields = [
            "id", "title", "meeting_type", "body", "body_name", "date", "start_time", "location",
            "status", "agenda_deadline", "video_url", "notes", "packet_document", "attendance",
            "agenda_item_count", "minutes_status", "created_at", "updated_at",
        ]


class MinutesSerializer(serializers.ModelSerializer):
    meeting_title = serializers.CharField(source="meeting.title", read_only=True)
    meeting_date = serializers.DateField(source="meeting.date", read_only=True)

    class Meta:
        model = Minutes
        fields = [
            "id", "meeting", "meeting_title", "meeting_date", "content", "status",
            "prepared_by", "approved_by", "approved_at", "document", "updated_at",
        ]
        read_only_fields = ["approved_by", "approved_at"]


class MeetingViewSet(LockableMixin, AuditedModelViewSet):
    queryset = Meeting.objects.select_related("body").prefetch_related("agenda_items")
    serializer_class = MeetingSerializer
    audit_module = "meetings"
    rbac = {
        "view": "records.view", "create": "meetings.manage", "edit": "meetings.manage", "delete": "meetings.manage",
        "generate_packet": "agendas.manage", "lock": "meetings.manage", "unlock": "meetings.manage",
        "lock_status": "records.view",
    }
    filterset_fields = ["meeting_type", "status", "body", "date"]
    search_fields = ["title", "location", "notes"]
    ordering_fields = ["date", "created_at"]

    @action(detail=True, methods=["post"])
    def generate_packet(self, request, pk=None):
        """Assemble the packet manifest (agenda + attachments) and mark ready."""
        meeting = self.get_object()
        items = meeting.agenda_items.prefetch_related("attachments").order_by("order")
        manifest = [
            {
                "order": item.order,
                "title": item.title,
                "type": item.item_type,
                "attachments": [{"id": d.pk, "title": d.title} for d in item.attachments.all()],
            }
            for item in items
        ]
        meeting.status = Meeting.Status.PACKET_READY
        meeting.save(update_fields=["status"])
        log_event(AuditLog.Action.ADMIN_ACTION, "meetings", obj=meeting, reason="Packet generated",
                  after={"items": len(manifest)})
        return Response({"detail": "Packet manifest generated.", "manifest": manifest})


class AgendaItemViewSet(LockableMixin, AuditedModelViewSet):
    queryset = AgendaItem.objects.select_related("meeting", "department", "submitted_by").prefetch_related("votes")
    serializer_class = AgendaItemSerializer
    audit_module = "meetings"
    rbac = {
        "view": "records.view", "create": "records.create", "edit": "agendas.manage", "delete": "agendas.manage",
        "record_votes": "meetings.manage", "lock": "agendas.manage", "unlock": "agendas.manage",
        "lock_status": "records.view",
    }
    filterset_fields = ["meeting", "status", "item_type", "department", "legal_review_required"]
    search_fields = ["title", "description"]

    def perform_create(self, serializer):
        instance = serializer.save(submitted_by=self.request.user)
        log_event(AuditLog.Action.CREATE, "meetings", obj=instance, after={"title": instance.title})

    @action(detail=True, methods=["post"])
    def record_votes(self, request, pk=None):
        """Record roll-call votes: {"votes": [{"member_name": ..., "value": ...}], "result": "carried"}"""
        item = self.get_object()
        for entry in request.data.get("votes", []):
            Vote.objects.update_or_create(
                agenda_item=item, member_name=entry["member_name"], defaults={"value": entry["value"]}
            )
        for field in ("motion_text", "moved_by", "seconded_by", "result"):
            if field in request.data:
                setattr(item, field, request.data[field])
        item.save()
        log_event(AuditLog.Action.UPDATE, "meetings", obj=item, reason="Roll call recorded",
                  after={"result": item.result, "votes": request.data.get("votes", [])})
        return Response(AgendaItemSerializer(item).data)


class VoteViewSet(AuditedModelViewSet):
    queryset = Vote.objects.select_related("agenda_item")
    serializer_class = VoteSerializer
    audit_module = "meetings"
    rbac = {"view": "records.view", "create": "meetings.manage", "edit": "meetings.manage", "delete": "meetings.manage"}
    filterset_fields = ["agenda_item", "value"]


class MinutesViewSet(LockableMixin, AuditedModelViewSet):
    queryset = Minutes.objects.select_related("meeting")
    serializer_class = MinutesSerializer
    audit_module = "meetings"
    rbac = {
        "view": "records.view", "create": "meetings.manage", "edit": "meetings.manage", "delete": "meetings.manage",
        "approve": "records.approve", "lock": "meetings.manage", "unlock": "meetings.manage",
        "lock_status": "records.view",
    }
    filterset_fields = ["status", "meeting"]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        minutes = self.get_object()
        minutes.status = Minutes.Status.APPROVED
        minutes.approved_by = request.user
        minutes.approved_at = timezone.now()
        minutes.save(update_fields=["status", "approved_by", "approved_at"])
        log_event(AuditLog.Action.APPROVE, "meetings", obj=minutes, severity=AuditLog.Severity.NOTICE)
        return Response({"detail": "Minutes approved."})
