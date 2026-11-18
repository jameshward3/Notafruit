from django.conf import settings
from django.db import models


class ComplianceControl(models.Model):
    class Framework(models.TextChoices):
        SOC2_SECURITY = "soc2_security", "SOC 2 — Security"
        SOC2_AVAILABILITY = "soc2_availability", "SOC 2 — Availability"
        SOC2_CONFIDENTIALITY = "soc2_confidentiality", "SOC 2 — Confidentiality"
        ISO27001 = "iso27001", "ISO 27001"

    class Status(models.TextChoices):
        NOT_STARTED = "not_started", "Not Started"
        IN_PROGRESS = "in_progress", "In Progress"
        IMPLEMENTED = "implemented", "Implemented"
        NEEDS_REVIEW = "needs_review", "Needs Review"
        NOT_APPLICABLE = "not_applicable", "Not Applicable"

    framework = models.CharField(max_length=30, choices=Framework.choices, db_index=True)
    control_id = models.CharField(max_length=30, help_text="e.g. CC6.1, A.9.2.3")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="controls_owned")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NOT_STARTED, db_index=True)
    last_reviewed = models.DateField(null=True, blank=True)
    next_review_due = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["framework", "control_id"]
        unique_together = [("framework", "control_id")]

    def __str__(self):
        return f"{self.control_id} — {self.name}"


class ComplianceEvidence(models.Model):
    control = models.ForeignKey(ComplianceControl, on_delete=models.CASCADE, related_name="evidence")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    document = models.ForeignKey("records.Document", null=True, blank=True, on_delete=models.SET_NULL)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    collected_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    collected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-collected_at"]
        verbose_name_plural = "compliance evidence"


class RiskRegisterItem(models.Model):
    class Treatment(models.TextChoices):
        ACCEPT = "accept"
        MITIGATE = "mitigate"
        TRANSFER = "transfer"
        AVOID = "avoid"

    class Status(models.TextChoices):
        OPEN = "open"
        IN_TREATMENT = "in_treatment", "In Treatment"
        MONITORING = "monitoring"
        CLOSED = "closed"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=60, blank=True, help_text="e.g. availability, data loss, insider")
    likelihood = models.PositiveSmallIntegerField(default=3, help_text="1 (rare) – 5 (almost certain)")
    impact = models.PositiveSmallIntegerField(default=3, help_text="1 (negligible) – 5 (severe)")
    treatment = models.CharField(max_length=15, choices=Treatment.choices, default=Treatment.MITIGATE)
    treatment_plan = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)
    review_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def score(self) -> int:
        return self.likelihood * self.impact


class BackupJob(models.Model):
    class JobType(models.TextChoices):
        DATABASE = "database"
        DOCUMENTS = "documents"
        FULL = "full"

    class Status(models.TextChoices):
        RUNNING = "running"
        SUCCESS = "success"
        FAILED = "failed"

    job_type = models.CharField(max_length=15, choices=JobType.choices, default=JobType.FULL)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.RUNNING, db_index=True)
    size_bytes = models.BigIntegerField(default=0)
    location = models.CharField(max_length=300, blank=True)
    checksum_sha256 = models.CharField(max_length=64, blank=True)
    verified = models.BooleanField(default=False, help_text="Restore-tested")
    verified_at = models.DateTimeField(null=True, blank=True)
    log = models.TextField(blank=True)

    class Meta:
        ordering = ["-started_at"]
