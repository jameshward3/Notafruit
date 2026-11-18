from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.models import AuditLog
from apps.audit.services import log_event
from apps.core.api import AuditedModelViewSet
from apps.records.locking import LockableMixin

from .models import OPRAAssignment, OPRARequest, OPRAResponse


class OPRAAssignmentSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True, default="")
    request_number = serializers.CharField(source="request.request_number", read_only=True)

    class Meta:
        model = OPRAAssignment
        fields = [
            "id", "request", "request_number", "department", "department_name", "assigned_to",
            "assigned_to_name", "assigned_at", "internal_due_date", "status", "notes",
        ]


class OPRAResponseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True, default="")

    class Meta:
        model = OPRAResponse
        fields = ["id", "request", "response_type", "public_notes", "internal_notes", "documents", "created_by", "created_by_name", "created_at"]


class OPRARequestSerializer(serializers.ModelSerializer):
    custodian_name = serializers.CharField(source="custodian.get_full_name", read_only=True, default="")
    days_remaining = serializers.IntegerField(read_only=True)
    effective_due_date = serializers.DateField(read_only=True)
    is_open = serializers.BooleanField(read_only=True)
    assignments = OPRAAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = OPRARequest
        fields = [
            "id", "request_number", "requestor_name", "requestor_email", "requestor_phone",
            "requestor_address", "is_anonymous", "description", "received_date", "due_date",
            "extended_due_date", "extension_reason", "effective_due_date", "days_remaining", "is_open",
            "status", "custodian", "custodian_name", "denial_basis", "internal_notes", "fee_charged",
            "closed_date", "assignments", "created_at", "updated_at",
        ]
        extra_kwargs = {"due_date": {"required": False}}


class OPRARequestViewSet(LockableMixin, AuditedModelViewSet):
    queryset = OPRARequest.objects.select_related("custodian").prefetch_related("assignments__department")
    serializer_class = OPRARequestSerializer
    audit_module = "opra"
    rbac = {
        "view": "records.view", "create": "opra.manage", "edit": "opra.manage", "delete": "opra.manage",
        "assign": "opra.manage", "extend": "opra.manage", "close": "opra.manage", "export_file": "opra.manage",
        "deadline_board": "records.view", "lock": "opra.manage", "unlock": "opra.manage", "lock_status": "records.view",
    }
    filterset_fields = ["status", "custodian", "received_date"]
    search_fields = ["request_number", "requestor_name", "description"]
    ordering_fields = ["received_date", "due_date", "request_number"]

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        opra = self.get_object()
        assignment, created = OPRAAssignment.objects.get_or_create(
            request=opra,
            department_id=request.data["department"],
            defaults={
                "assigned_to_id": request.data.get("assigned_to"),
                "internal_due_date": request.data.get("internal_due_date"),
                "notes": request.data.get("notes", ""),
            },
        )
        if opra.status == OPRARequest.Status.RECEIVED:
            opra.status = OPRARequest.Status.ASSIGNED
            opra.save(update_fields=["status"])
        log_event(AuditLog.Action.UPDATE, "opra", obj=opra, reason="Department assigned",
                  after={"department": assignment.department.name})
        return Response(OPRAAssignmentSerializer(assignment).data, status=201 if created else 200)

    @action(detail=True, methods=["post"])
    def extend(self, request, pk=None):
        opra = self.get_object()
        before = {"due": str(opra.effective_due_date)}
        opra.extended_due_date = request.data["extended_due_date"]
        opra.extension_reason = request.data.get("reason", "")
        opra.status = OPRARequest.Status.EXTENSION
        opra.save(update_fields=["extended_due_date", "extension_reason", "status"])
        OPRAResponse.objects.create(
            request=opra, response_type=OPRAResponse.ResponseType.EXTENSION,
            public_notes=request.data.get("reason", ""), created_by=request.user,
        )
        log_event(AuditLog.Action.UPDATE, "opra", obj=opra, before=before,
                  after={"due": str(opra.extended_due_date)}, reason="Deadline extension", severity=AuditLog.Severity.NOTICE)
        return Response(OPRARequestSerializer(opra).data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        opra = self.get_object()
        final_status = request.data.get("status", OPRARequest.Status.CLOSED)
        opra.status = final_status
        opra.closed_date = timezone.localdate()
        if request.data.get("denial_basis"):
            opra.denial_basis = request.data["denial_basis"]
        opra.save(update_fields=["status", "closed_date", "denial_basis"])
        OPRAResponse.objects.create(
            request=opra, response_type=OPRAResponse.ResponseType.CLOSING,
            public_notes=request.data.get("closing_letter", ""), created_by=request.user,
        )
        log_event(AuditLog.Action.UPDATE, "opra", obj=opra, reason="Request closed",
                  after={"status": final_status}, severity=AuditLog.Severity.NOTICE)
        return Response(OPRARequestSerializer(opra).data)

    @action(detail=True, methods=["get"])
    def export_file(self, request, pk=None):
        """Complete request file as JSON (for records or GRC litigation)."""
        opra = self.get_object()
        payload = {
            "request": OPRARequestSerializer(opra).data,
            "responses": OPRAResponseSerializer(opra.responses.all(), many=True).data,
        }
        log_event(AuditLog.Action.EXPORT, "opra", obj=opra, reason="Request file exported")
        return Response(payload)

    @action(detail=False, methods=["get"])
    def deadline_board(self, request):
        """Open requests grouped for the deadline timeline view."""
        today = timezone.localdate()
        open_requests = self.get_queryset().filter(status__in=OPRARequest.OPEN_STATUSES)
        overdue, due_soon, on_track = [], [], []
        for r in open_requests:
            row = {
                "id": r.pk, "request_number": r.request_number, "requestor_name": r.requestor_name,
                "status": r.status, "due_date": r.effective_due_date, "days_remaining": r.days_remaining,
                "departments": [a.department.name for a in r.assignments.all()],
            }
            if r.effective_due_date < today:
                overdue.append(row)
            elif (r.effective_due_date - today).days <= 2:
                due_soon.append(row)
            else:
                on_track.append(row)
        return Response({"overdue": overdue, "due_soon": due_soon, "on_track": on_track})


class OPRAAssignmentViewSet(AuditedModelViewSet):
    queryset = OPRAAssignment.objects.select_related("request", "department", "assigned_to")
    serializer_class = OPRAAssignmentSerializer
    audit_module = "opra"
    rbac = {"view": "records.view", "create": "opra.manage", "edit": "opra.manage", "delete": "opra.manage"}
    filterset_fields = ["request", "department", "status", "assigned_to"]


class OPRAResponseViewSet(AuditedModelViewSet):
    queryset = OPRAResponse.objects.select_related("request", "created_by").prefetch_related("documents")
    serializer_class = OPRAResponseSerializer
    audit_module = "opra"
    rbac = {"view": "records.view", "create": "opra.manage", "edit": "opra.manage", "delete": "opra.manage"}
    filterset_fields = ["request", "response_type"]

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        log_event(AuditLog.Action.CREATE, "opra", obj=instance, after={"type": instance.response_type})
