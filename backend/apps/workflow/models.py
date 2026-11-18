from django.conf import settings
from django.db import models


class Task(models.Model):
    class Priority(models.TextChoices):
        LOW = "low"
        MEDIUM = "medium"
        HIGH = "high"
        URGENT = "urgent"

    class Status(models.TextChoices):
        OPEN = "open"
        IN_PROGRESS = "in_progress"
        BLOCKED = "blocked"
        DONE = "done"
        CANCELLED = "cancelled"

    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    module = models.CharField(max_length=40, blank=True, help_text="Originating module, e.g. opra, meetings")
    record_reference = models.CharField(max_length=120, blank=True, help_text='e.g. "OPRARequest:12"')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="tasks")
    department = models.ForeignKey("accounts.Department", null=True, blank=True, on_delete=models.SET_NULL, related_name="tasks")
    due_date = models.DateField(null=True, blank=True, db_index=True)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM, db_index=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="tasks_created")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date", "-priority"]

    def __str__(self):
        return self.title


class Notification(models.Model):
    class Category(models.TextChoices):
        OPRA_DEADLINE = "opra_deadline", "OPRA Deadline"
        AGENDA_DEADLINE = "agenda_deadline", "Agenda Deadline"
        NOTICE_DEADLINE = "notice_deadline", "Public Notice Deadline"
        LICENSE_RENEWAL = "license_renewal", "License Renewal"
        BOARD_VACANCY = "board_vacancy", "Board Vacancy"
        SECURITY = "security", "Security Alert"
        BACKUP = "backup", "Backup Alert"
        COMPLIANCE = "compliance", "Compliance Task"
        TASK = "task", "Task Assignment"
        SYSTEM = "system", "System"

    class Severity(models.TextChoices):
        INFO = "info"
        WARNING = "warning"
        CRITICAL = "critical"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.SYSTEM)
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.INFO)
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    link = models.CharField(max_length=300, blank=True, help_text="Frontend route, e.g. /opra/12")
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


class Correspondence(models.Model):
    class Direction(models.TextChoices):
        INCOMING = "incoming"
        OUTGOING = "outgoing"

    class Status(models.TextChoices):
        RECEIVED = "received"
        ASSIGNED = "assigned"
        IN_PROGRESS = "in_progress"
        RESPONDED = "responded"
        FILED = "filed"

    subject = models.CharField(max_length=300)
    direction = models.CharField(max_length=10, choices=Direction.choices, default=Direction.INCOMING)
    sender = models.CharField(max_length=200, blank=True)
    recipient = models.CharField(max_length=200, blank=True)
    date = models.DateField()
    department = models.ForeignKey("accounts.Department", null=True, blank=True, on_delete=models.SET_NULL)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.RECEIVED)
    summary = models.TextField(blank=True)
    documents = models.ManyToManyField("records.Document", blank=True, related_name="correspondence")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        verbose_name_plural = "correspondence"

    def __str__(self):
        return self.subject
