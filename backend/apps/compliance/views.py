from django.db.models import Count, Q
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.models import AuditLog
from apps.audit.services import log_event
from apps.core.api import AuditedModelViewSet

from .models import BackupJob, ComplianceControl, ComplianceEvidence, RiskRegisterItem


class ComplianceControlSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True, default="")
    evidence_count = serializers.IntegerField(source="evidence.count", read_only=True)

    class Meta:
        model = ComplianceControl
        fields = [
            "id", "framework", "control_id", "name", "description", "owner", "owner_name",
            "status", "last_reviewed", "next_review_due", "notes", "evidence_count",
        ]


class ComplianceEvidenceSerializer(serializers.ModelSerializer):
    control_name = serializers.CharField(source="control.name", read_only=True)
    collected_by_name = serializers.CharField(source="collected_by.get_full_name", read_only=True, default="")

    class Meta:
        model = ComplianceEvidence
        fields = [
            "id", "control", "control_name", "title", "description", "document",
            "period_start", "period_end", "collected_by", "collected_by_name", "collected_at",
        ]


class RiskRegisterItemSerializer(serializers.ModelSerializer):
    score = serializers.IntegerField(read_only=True)
    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True, default="")

    class Meta:
        model = RiskRegisterItem
        fields = [
            "id", "title", "description", "category", "likelihood", "impact", "score",
            "treatment", "treatment_plan", "owner", "owner_name", "status", "review_date", "created_at",
        ]


class BackupJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackupJob
        fields = [
            "id", "job_type", "started_at", "completed_at", "status", "size_bytes",
            "location", "checksum_sha256", "verified", "verified_at", "log",
        ]


class ComplianceControlViewSet(AuditedModelViewSet):
    queryset = ComplianceControl.objects.select_related("owner").prefetch_related("evidence")
    serializer_class = ComplianceControlSerializer
    audit_module = "compliance"
    rbac = {"view": "compliance.access", "create": "compliance.access", "edit": "compliance.access",
            "delete": "system.configure", "summary": "compliance.access"}
    filterset_fields = ["framework", "status", "owner"]
    search_fields = ["control_id", "name", "description"]

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Readiness score per framework for the compliance dashboard."""
        data = []
        for framework, label in ComplianceControl.Framework.choices:
            counts = ComplianceControl.objects.filter(framework=framework).aggregate(
                total=Count("id"),
                implemented=Count("id", filter=Q(status=ComplianceControl.Status.IMPLEMENTED)),
                not_applicable=Count("id", filter=Q(status=ComplianceControl.Status.NOT_APPLICABLE)),
            )
            applicable = counts["total"] - counts["not_applicable"]
            score = round(100 * counts["implemented"] / applicable) if applicable else 0
            data.append({"framework": framework, "label": label, **counts, "readiness_pct": score})
        return Response(data)


class ComplianceEvidenceViewSet(AuditedModelViewSet):
    queryset = ComplianceEvidence.objects.select_related("control", "collected_by")
    serializer_class = ComplianceEvidenceSerializer
    audit_module = "compliance"
    rbac = {"view": "compliance.access", "create": "compliance.access", "edit": "compliance.access",
            "delete": "compliance.access", "export_package": "compliance.access"}
    filterset_fields = ["control", "control__framework"]

    def perform_create(self, serializer):
        instance = serializer.save(collected_by=self.request.user)
        log_event(AuditLog.Action.CREATE, "compliance", obj=instance, after={"control": instance.control.control_id})

    @action(detail=False, methods=["get"])
    def export_package(self, request):
        """JSON evidence bundle for an auditor."""
        controls = ComplianceControlSerializer(
            ComplianceControl.objects.all().prefetch_related("evidence"), many=True
        ).data
        evidence = ComplianceEvidenceSerializer(self.get_queryset(), many=True).data
        log_event(AuditLog.Action.EXPORT, "compliance", object_repr="Compliance evidence package",
                  severity=AuditLog.Severity.NOTICE)
        return Response({"controls": controls, "evidence": evidence})


class RiskRegisterItemViewSet(AuditedModelViewSet):
    queryset = RiskRegisterItem.objects.select_related("owner")
    serializer_class = RiskRegisterItemSerializer
    audit_module = "compliance"
    rbac = {"view": "compliance.access", "create": "compliance.access", "edit": "compliance.access", "delete": "compliance.access"}
    filterset_fields = ["status", "treatment", "category"]
    search_fields = ["title", "description"]


class BackupJobViewSet(AuditedModelViewSet):
    queryset = BackupJob.objects.all()
    serializer_class = BackupJobSerializer
    audit_module = "compliance"
    rbac = {"view": "compliance.access", "create": "system.configure", "edit": "system.configure",
            "delete": "system.configure", "mark_verified": "system.configure"}
    filterset_fields = ["job_type", "status", "verified"]

    @action(detail=True, methods=["post"])
    def mark_verified(self, request, pk=None):
        from django.utils import timezone

        job = self.get_object()
        job.verified = True
        job.verified_at = timezone.now()
        job.save(update_fields=["verified", "verified_at"])
        log_event(AuditLog.Action.ADMIN_ACTION, "compliance", obj=job, reason="Backup restore-test verified",
                  severity=AuditLog.Severity.NOTICE)
        return Response({"detail": "Backup marked verified."})
