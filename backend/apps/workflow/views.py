from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.api import AuditedModelViewSet

from .models import Correspondence, Notification, Task


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True, default="")
    department_name = serializers.CharField(source="department.name", read_only=True, default="")

    class Meta:
        model = Task
        fields = [
            "id", "title", "description", "module", "record_reference", "assigned_to", "assigned_to_name",
            "department", "department_name", "due_date", "priority", "status", "created_by", "created_at", "updated_at",
        ]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "category", "severity", "title", "message", "link", "is_read", "created_at"]


class CorrespondenceSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True, default="")
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True, default="")

    class Meta:
        model = Correspondence
        fields = [
            "id", "subject", "direction", "sender", "recipient", "date", "department", "department_name",
            "assigned_to", "assigned_to_name", "status", "summary", "documents", "created_at",
        ]


class TaskViewSet(AuditedModelViewSet):
    queryset = Task.objects.select_related("assigned_to", "department")
    serializer_class = TaskSerializer
    audit_module = "workflow"
    rbac = {"view": None, "create": None, "edit": None, "delete": None}  # any authenticated staff member
    filterset_fields = ["status", "priority", "assigned_to", "department", "module"]
    search_fields = ["title", "description", "record_reference"]
    ordering_fields = ["due_date", "priority", "created_at"]

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        if instance.assigned_to and instance.assigned_to != self.request.user:
            Notification.objects.create(
                user=instance.assigned_to, category=Notification.Category.TASK,
                title=f"Task assigned: {instance.title}", link=f"/tasks/{instance.pk}",
            )


class NotificationViewSet(AuditedModelViewSet):
    serializer_class = NotificationSerializer
    audit_module = "workflow"
    rbac = {"view": None, "create": None, "edit": None, "delete": None, "mark_all_read": None, "unread_count": None}
    filterset_fields = ["category", "severity", "is_read"]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        count = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"marked_read": count})

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        return Response({"unread": self.get_queryset().filter(is_read=False).count()})


class CorrespondenceViewSet(AuditedModelViewSet):
    queryset = Correspondence.objects.select_related("department", "assigned_to")
    serializer_class = CorrespondenceSerializer
    audit_module = "workflow"
    rbac = {"view": "records.view", "create": "records.create", "edit": "records.edit", "delete": "records.delete"}
    filterset_fields = ["direction", "status", "department", "assigned_to"]
    search_fields = ["subject", "sender", "recipient", "summary"]
