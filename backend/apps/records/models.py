import hashlib
import uuid
from pathlib import Path

from django.conf import settings
from django.db import models
from django.utils import timezone


def document_upload_path(instance, filename):
    # Content-addressed-ish layout keeps directories small and names unguessable.
    ext = Path(filename).suffix.lower()
    return f"{timezone.now():%Y/%m}/{uuid.uuid4().hex}{ext}"


class RetentionRule(models.Model):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    retention_years = models.PositiveIntegerField(null=True, blank=True)
    permanent = models.BooleanField(default=False)
    authority_citation = models.CharField(max_length=200, blank=True, help_text="e.g. NJ Records Retention Schedule M100000")

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class RecordCategory(models.Model):
    class Classification(models.TextChoices):
        PUBLIC = "public"
        INTERNAL = "internal"
        CONFIDENTIAL = "confidential"
        RESTRICTED = "restricted"

    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="children")
    default_classification = models.CharField(max_length=20, choices=Classification.choices, default=Classification.INTERNAL)
    retention_rule = models.ForeignKey(RetentionRule, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "record categories"

    def __str__(self):
        return self.name


class LegalHold(models.Model):
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    matter_reference = models.CharField(max_length=120, blank=True)
    placed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="legal_holds_placed")
    placed_at = models.DateTimeField(auto_now_add=True)
    released_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="legal_holds_released")
    released_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-placed_at"]

    def __str__(self):
        return self.name


class Document(models.Model):
    """A vault record. Binary content lives in DocumentVersion rows."""

    class Classification(models.TextChoices):
        PUBLIC = "public"
        INTERNAL = "internal"
        CONFIDENTIAL = "confidential"
        RESTRICTED = "restricted"

    class Status(models.TextChoices):
        DRAFT = "draft"
        ACTIVE = "active"
        UNDER_REVIEW = "under_review"
        RETENTION_REVIEW = "retention_review"
        ARCHIVED = "archived"
        DESTROYED = "destroyed"

    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    category = models.ForeignKey(RecordCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name="documents")
    department = models.ForeignKey("accounts.Department", null=True, blank=True, on_delete=models.SET_NULL, related_name="documents")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="documents_owned")
    classification = models.CharField(max_length=20, choices=Classification.choices, default=Classification.INTERNAL, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    retention_rule = models.ForeignKey(RetentionRule, null=True, blank=True, on_delete=models.SET_NULL)
    retention_review_date = models.DateField(null=True, blank=True)
    legal_holds = models.ManyToManyField(LegalHold, blank=True, related_name="documents")
    permanent_archive = models.BooleanField(default=False)
    tags = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    related_documents = models.ManyToManyField("self", blank=True, symmetrical=False, related_name="referenced_by")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title

    @property
    def under_legal_hold(self) -> bool:
        return self.legal_holds.filter(is_active=True).exists()

    @property
    def latest_version(self):
        return self.versions.order_by("-version_number").first()


class DocumentVersion(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="versions")
    version_number = models.PositiveIntegerField()
    file = models.FileField(upload_to=document_upload_path)
    original_filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=120, blank=True)
    size_bytes = models.BigIntegerField(default=0)
    checksum_sha256 = models.CharField(max_length=64, db_index=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    note = models.CharField(max_length=300, blank=True)
    is_redacted_version = models.BooleanField(default=False)

    class Meta:
        ordering = ["-version_number"]
        unique_together = [("document", "version_number")]

    @staticmethod
    def hash_file(django_file) -> str:
        sha = hashlib.sha256()
        for chunk in django_file.chunks():
            sha.update(chunk)
        return sha.hexdigest()


class DocumentAccess(models.Model):
    """Chain-of-custody entries: every view/download/upload/redaction."""

    class AccessType(models.TextChoices):
        VIEW = "view"
        DOWNLOAD = "download"
        UPLOAD = "upload"
        REDACT = "redact"

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="access_log")
    version = models.ForeignKey(DocumentVersion, null=True, blank=True, on_delete=models.SET_NULL)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    access_type = models.CharField(max_length=16, choices=AccessType.choices)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


class RecordLock(models.Model):
    """
    Pessimistic edit lock shown as "currently editing by [user]". One active
    lock per record; other users get read-only access until release,
    expiry, or an authorized override.
    """

    record_type = models.CharField(max_length=80, db_index=True)
    record_id = models.CharField(max_length=64, db_index=True)
    locked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="record_locks")
    locked_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    released_at = models.DateTimeField(null=True, blank=True)
    overridden_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="locks_overridden"
    )

    class Meta:
        ordering = ["-locked_at"]

    @property
    def is_active(self) -> bool:
        return self.released_at is None and self.expires_at > timezone.now()

    @classmethod
    def active_for(cls, record_type: str, record_id) -> "RecordLock | None":
        return (
            cls.objects.filter(record_type=record_type, record_id=str(record_id), released_at=None, expires_at__gt=timezone.now())
            .select_related("locked_by")
            .first()
        )
