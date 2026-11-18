import subprocess
from pathlib import Path

from django.conf import settings
from django.http import FileResponse
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.audit.middleware import client_ip, get_current_request
from apps.audit.models import AuditLog
from apps.audit.services import log_event
from apps.core.api import AuditedModelViewSet

from .locking import LockableMixin
from .models import Document, DocumentAccess, DocumentVersion, LegalHold, RecordCategory, RetentionRule
from .serializers import (
    DocumentSerializer,
    DocumentVersionSerializer,
    LegalHoldSerializer,
    RecordCategorySerializer,
    RetentionRuleSerializer,
)


def validate_upload(upload):
    ext = Path(upload.name).suffix.lower()
    if ext not in settings.CLERKOS_ALLOWED_UPLOAD_EXTENSIONS:
        raise ValidationError({"file": f"File type '{ext}' is not permitted."})
    if upload.size > settings.CLERKOS_MAX_UPLOAD_MB * 1024 * 1024:
        raise ValidationError({"file": f"File exceeds the {settings.CLERKOS_MAX_UPLOAD_MB} MB limit."})


def antivirus_scan(path: str):
    """Run the configured AV command hook (e.g. clamdscan). No-op if unset."""
    command = settings.CLERKOS_ANTIVIRUS_COMMAND
    if not command:
        return
    result = subprocess.run(command.format(path=path), shell=True, capture_output=True, timeout=120)
    if result.returncode != 0:
        raise ValidationError({"file": "File failed antivirus scanning and was rejected."})


class DocumentViewSet(LockableMixin, AuditedModelViewSet):
    queryset = (
        Document.objects.select_related("category", "department", "owner", "retention_rule")
        .prefetch_related("legal_holds", "versions")
    )
    serializer_class = DocumentSerializer
    audit_module = "records"
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    rbac = {
        "view": "records.view", "create": "records.create", "edit": "records.edit", "delete": "records.delete",
        "upload": "documents.upload", "download": "documents.download", "versions": "records.view",
        "chain_of_custody": "records.view", "redact": "documents.redact",
        "lock": "records.edit", "unlock": "records.edit", "lock_status": "records.view",
    }
    filterset_fields = ["category", "department", "classification", "status", "owner", "permanent_archive"]
    search_fields = ["title", "description"]
    ordering_fields = ["updated_at", "created_at", "title", "retention_review_date"]

    def perform_destroy(self, instance):
        if instance.under_legal_hold:
            log_event(
                AuditLog.Action.SECURITY, "records", obj=instance, success=False,
                severity=AuditLog.Severity.CRITICAL, reason="Deletion blocked: record under active legal hold",
            )
            raise PermissionDenied("This record is under an active legal hold and cannot be deleted.")
        if instance.permanent_archive:
            raise PermissionDenied("Permanent-archive records cannot be deleted.")
        if not self.request.user.has_permission_code("retention.approve_destruction"):
            raise PermissionDenied("Record destruction requires retention-destruction approval permission.")
        super().perform_destroy(instance)

    @action(detail=True, methods=["post"])
    def upload(self, request, pk=None):
        document = self.get_object()
        upload = request.FILES.get("file")
        if upload is None:
            raise ValidationError({"file": "No file provided."})
        validate_upload(upload)

        latest = document.latest_version
        version = DocumentVersion(
            document=document,
            version_number=(latest.version_number + 1) if latest else 1,
            file=upload,
            original_filename=upload.name[:255],
            content_type=getattr(upload, "content_type", "")[:120],
            size_bytes=upload.size,
            checksum_sha256=DocumentVersion.hash_file(upload),
            uploaded_by=request.user,
            note=request.data.get("note", "")[:300],
            is_redacted_version=str(request.data.get("is_redacted_version", "")).lower() == "true",
        )
        version.save()
        antivirus_scan(version.file.path)

        duplicates = (
            DocumentVersion.objects.filter(checksum_sha256=version.checksum_sha256)
            .exclude(document=document)
            .values_list("document_id", flat=True)
            .distinct()
        )
        DocumentAccess.objects.create(
            document=document, version=version, user=request.user,
            access_type=DocumentAccess.AccessType.UPLOAD, ip_address=client_ip(get_current_request()),
        )
        log_event(
            AuditLog.Action.UPLOAD, "records", obj=document,
            after={"version": version.version_number, "filename": version.original_filename,
                   "sha256": version.checksum_sha256, "size": version.size_bytes},
        )
        return Response(
            {"version": DocumentVersionSerializer(version).data, "duplicate_of_documents": list(duplicates)},
            status=201,
        )

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        document = self.get_object()
        version_number = request.query_params.get("version")
        versions = document.versions
        version = (
            versions.filter(version_number=version_number).first() if version_number else document.latest_version
        )
        if version is None:
            raise ValidationError({"detail": "No file uploaded for this record."})
        DocumentAccess.objects.create(
            document=document, version=version, user=request.user,
            access_type=DocumentAccess.AccessType.DOWNLOAD, ip_address=client_ip(get_current_request()),
        )
        log_event(AuditLog.Action.DOWNLOAD, "records", obj=document,
                  after={"version": version.version_number, "filename": version.original_filename})
        return FileResponse(version.file.open("rb"), as_attachment=True, filename=version.original_filename)

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        return Response(DocumentVersionSerializer(self.get_object().versions.all(), many=True).data)

    @action(detail=True, methods=["get"])
    def chain_of_custody(self, request, pk=None):
        entries = self.get_object().access_log.select_related("user", "version")[:500]
        return Response([
            {
                "at": e.created_at,
                "user": e.user.get_full_name() or e.user.username if e.user else "(deleted user)",
                "access_type": e.access_type,
                "version": e.version.version_number if e.version else None,
                "ip_address": e.ip_address,
            }
            for e in entries
        ])

    @action(detail=True, methods=["post"])
    def redact(self, request, pk=None):
        """Marks the record as having a redaction workflow event; the redacted
        file itself is uploaded as a new version with is_redacted_version."""
        document = self.get_object()
        reason = request.data.get("reason", "")
        DocumentAccess.objects.create(
            document=document, user=request.user,
            access_type=DocumentAccess.AccessType.REDACT, ip_address=client_ip(get_current_request()),
        )
        log_event(AuditLog.Action.REDACT, "records", obj=document, reason=reason, severity=AuditLog.Severity.NOTICE)
        return Response({"detail": "Redaction recorded. Upload the redacted file as a new version."})


class RecordCategoryViewSet(AuditedModelViewSet):
    queryset = RecordCategory.objects.select_related("parent", "retention_rule")
    serializer_class = RecordCategorySerializer
    audit_module = "records"
    rbac = {"view": "records.view", "create": "system.configure", "edit": "system.configure", "delete": "system.configure"}
    pagination_class = None


class RetentionRuleViewSet(AuditedModelViewSet):
    queryset = RetentionRule.objects.all()
    serializer_class = RetentionRuleSerializer
    audit_module = "records"
    rbac = {"view": "records.view", "create": "system.configure", "edit": "system.configure", "delete": "system.configure"}
    pagination_class = None


class LegalHoldViewSet(AuditedModelViewSet):
    queryset = LegalHold.objects.prefetch_related("documents")
    serializer_class = LegalHoldSerializer
    audit_module = "records"
    rbac = {
        "view": "records.view", "create": "legalhold.place", "edit": "legalhold.place",
        "delete": "legalhold.remove", "release": "legalhold.remove", "attach": "legalhold.place",
    }

    def perform_create(self, serializer):
        instance = serializer.save(placed_by=self.request.user)
        log_event(AuditLog.Action.CREATE, "records", obj=instance, severity=AuditLog.Severity.NOTICE,
                  reason="Legal hold placed", after={"name": instance.name})

    @action(detail=True, methods=["post"])
    def release(self, request, pk=None):
        hold = self.get_object()
        hold.is_active = False
        hold.released_by = request.user
        hold.released_at = timezone.now()
        hold.save(update_fields=["is_active", "released_by", "released_at"])
        log_event(AuditLog.Action.ADMIN_ACTION, "records", obj=hold, severity=AuditLog.Severity.NOTICE, reason="Legal hold released")
        return Response({"detail": "Legal hold released."})

    @action(detail=True, methods=["post"])
    def attach(self, request, pk=None):
        hold = self.get_object()
        ids = request.data.get("document_ids", [])
        documents = Document.objects.filter(pk__in=ids)
        hold.documents.add(*documents)
        log_event(AuditLog.Action.ADMIN_ACTION, "records", obj=hold, severity=AuditLog.Severity.NOTICE,
                  reason="Documents attached to legal hold", after={"document_ids": ids})
        return Response({"detail": f"{documents.count()} document(s) attached."})
