from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

# NJ OPRA: 7 business days is the statutory default. We store the computed
# calendar due date and let the intake flow adjust for holidays.
STATUTORY_BUSINESS_DAYS = 7


def add_business_days(start, days: int):
    current, added = start, 0
    while added < days:
        current += timedelta(days=1)
        if current.weekday() < 5:
            added += 1
    return current


class OPRARequest(models.Model):
    class Status(models.TextChoices):
        RECEIVED = "received"
        ASSIGNED = "assigned"
        IN_PROGRESS = "in_progress"
        EXTENSION = "extension", "Extension Granted"
        CLARIFICATION = "clarification", "Awaiting Clarification"
        FULFILLED = "fulfilled"
        PARTIALLY_FULFILLED = "partially_fulfilled", "Partially Fulfilled"
        DENIED = "denied"
        CLOSED = "closed"
        WITHDRAWN = "withdrawn"

    request_number = models.CharField(max_length=30, unique=True)
    requestor_name = models.CharField(max_length=160)
    requestor_email = models.EmailField(blank=True)
    requestor_phone = models.CharField(max_length=40, blank=True)
    requestor_address = models.TextField(blank=True)
    is_anonymous = models.BooleanField(default=False)
    description = models.TextField()
    received_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField(db_index=True)
    extended_due_date = models.DateField(null=True, blank=True)
    extension_reason = models.TextField(blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.RECEIVED, db_index=True)
    custodian = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="opra_requests")
    denial_basis = models.TextField(blank=True, help_text="Statutory exemption(s) cited for denial/partial denial")
    internal_notes = models.TextField(blank=True)
    fee_charged = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    closed_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-received_date", "-id"]
        verbose_name = "OPRA request"

    def __str__(self):
        return f"{self.request_number} — {self.requestor_name}"

    def save(self, *args, **kwargs):
        if not self.due_date:
            self.due_date = add_business_days(self.received_date, STATUTORY_BUSINESS_DAYS)
        super().save(*args, **kwargs)

    @property
    def effective_due_date(self):
        return self.extended_due_date or self.due_date

    OPEN_STATUSES = ("received", "assigned", "in_progress", "extension", "clarification")

    @property
    def is_open(self) -> bool:
        return self.status in self.OPEN_STATUSES

    @property
    def days_remaining(self) -> int | None:
        if not self.is_open:
            return None
        return (self.effective_due_date - timezone.localdate()).days


class OPRAAssignment(models.Model):
    class Status(models.TextChoices):
        ASSIGNED = "assigned"
        IN_PROGRESS = "in_progress"
        DOCUMENTS_PROVIDED = "documents_provided", "Documents Provided"
        NO_RECORDS = "no_records", "No Responsive Records"
        COMPLETE = "complete"

    request = models.ForeignKey(OPRARequest, on_delete=models.CASCADE, related_name="assignments")
    department = models.ForeignKey("accounts.Department", on_delete=models.CASCADE, related_name="opra_assignments")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    assigned_at = models.DateTimeField(auto_now_add=True)
    internal_due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.ASSIGNED)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-assigned_at"]
        unique_together = [("request", "department")]


class OPRAResponse(models.Model):
    class ResponseType(models.TextChoices):
        DOCUMENTS = "documents", "Responsive Documents"
        EXTENSION = "extension", "Extension Notice"
        CLARIFICATION = "clarification", "Clarification Request"
        DENIAL = "denial", "Denial"
        PARTIAL_DENIAL = "partial_denial", "Partial Denial"
        CLOSING = "closing", "Closing Letter"

    request = models.ForeignKey(OPRARequest, on_delete=models.CASCADE, related_name="responses")
    response_type = models.CharField(max_length=20, choices=ResponseType.choices)
    public_notes = models.TextField(blank=True, help_text="Sent to the requestor")
    internal_notes = models.TextField(blank=True)
    documents = models.ManyToManyField("records.Document", blank=True, related_name="opra_responses")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
