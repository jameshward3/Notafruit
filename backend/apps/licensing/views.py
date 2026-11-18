from rest_framework import serializers

from apps.core.api import AuditedModelViewSet
from apps.records.locking import LockableMixin

from .models import License, LicenseApplication


class LicenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = License
        fields = "__all__"


class LicenseApplicationSerializer(serializers.ModelSerializer):
    reviewed_by_name = serializers.CharField(source="reviewed_by.get_full_name", read_only=True, default="")

    class Meta:
        model = LicenseApplication
        fields = "__all__"


class LicenseViewSet(LockableMixin, AuditedModelViewSet):
    queryset = License.objects.all()
    serializer_class = LicenseSerializer
    audit_module = "licensing"
    rbac = {
        "view": "records.view", "create": "licenses.manage", "edit": "licenses.manage", "delete": "licenses.manage",
        "lock": "licenses.manage", "unlock": "licenses.manage", "lock_status": "records.view",
    }
    filterset_fields = ["status", "license_type", "fee_paid"]
    search_fields = ["license_number", "holder_name", "business_name"]
    ordering_fields = ["expiration_date", "issued_date", "license_number"]


class LicenseApplicationViewSet(AuditedModelViewSet):
    queryset = LicenseApplication.objects.select_related("license", "reviewed_by")
    serializer_class = LicenseApplicationSerializer
    audit_module = "licensing"
    rbac = {"view": "records.view", "create": "licenses.manage", "edit": "licenses.manage", "delete": "licenses.manage"}
    filterset_fields = ["status", "license_type", "license"]
    search_fields = ["applicant_name", "license_type"]
