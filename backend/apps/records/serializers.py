from rest_framework import serializers

from .models import Document, DocumentVersion, LegalHold, RecordCategory, RetentionRule


class RetentionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RetentionRule
        fields = ["id", "code", "name", "description", "retention_years", "permanent", "authority_citation"]


class RecordCategorySerializer(serializers.ModelSerializer):
    document_count = serializers.IntegerField(source="documents.count", read_only=True)

    class Meta:
        model = RecordCategory
        fields = ["id", "name", "slug", "parent", "default_classification", "retention_rule", "document_count"]


class LegalHoldSerializer(serializers.ModelSerializer):
    placed_by_name = serializers.CharField(source="placed_by.get_full_name", read_only=True, default="")
    document_count = serializers.IntegerField(source="documents.count", read_only=True)

    class Meta:
        model = LegalHold
        fields = [
            "id", "name", "description", "matter_reference", "placed_by", "placed_by_name",
            "placed_at", "released_by", "released_at", "is_active", "document_count",
        ]
        read_only_fields = ["placed_by", "placed_at", "released_by", "released_at", "is_active"]


class DocumentVersionSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.get_full_name", read_only=True, default="")

    class Meta:
        model = DocumentVersion
        fields = [
            "id", "version_number", "original_filename", "content_type", "size_bytes",
            "checksum_sha256", "uploaded_by", "uploaded_by_name", "uploaded_at", "note", "is_redacted_version",
        ]


class DocumentSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default="")
    department_name = serializers.CharField(source="department.name", read_only=True, default="")
    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True, default="")
    under_legal_hold = serializers.BooleanField(read_only=True)
    version_count = serializers.IntegerField(source="versions.count", read_only=True)
    latest_version = DocumentVersionSerializer(read_only=True)

    class Meta:
        model = Document
        fields = [
            "id", "title", "description", "category", "category_name", "department", "department_name",
            "owner", "owner_name", "classification", "status", "retention_rule", "retention_review_date",
            "legal_holds", "under_legal_hold", "permanent_archive", "tags", "metadata",
            "related_documents", "version_count", "latest_version", "created_at", "updated_at",
        ]
