from django.conf import settings
from django.db import models


class License(models.Model):
    class Status(models.TextChoices):
        APPLICATION = "application", "Application Pending"
        ACTIVE = "active"
        RENEWAL_PENDING = "renewal_pending", "Renewal Pending"
        EXPIRED = "expired"
        SUSPENDED = "suspended"
        REVOKED = "revoked"

    license_number = models.CharField(max_length=40, unique=True)
    license_type = models.CharField(max_length=100, help_text="e.g. Raffle, Bingo, Peddler, Liquor, Taxi, Dog")
    holder_name = models.CharField(max_length=160)
    business_name = models.CharField(max_length=200, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=40, blank=True)
    address = models.TextField(blank=True)
    issued_date = models.DateField(null=True, blank=True)
    expiration_date = models.DateField(null=True, blank=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APPLICATION, db_index=True)
    fee_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fee_paid = models.BooleanField(default=False)
    compliance_notes = models.TextField(blank=True)
    history = models.JSONField(default=list, blank=True, help_text="Suspension/revocation/renewal history entries")
    certificate_document = models.ForeignKey("records.Document", null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.license_number} — {self.holder_name}"


class LicenseApplication(models.Model):
    class Status(models.TextChoices):
        RECEIVED = "received"
        UNDER_REVIEW = "under_review", "Under Review"
        APPROVED = "approved"
        DENIED = "denied"
        WITHDRAWN = "withdrawn"

    license = models.ForeignKey(License, null=True, blank=True, on_delete=models.SET_NULL, related_name="applications")
    applicant_name = models.CharField(max_length=160)
    license_type = models.CharField(max_length=100)
    submitted_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RECEIVED)
    documents = models.ManyToManyField("records.Document", blank=True, related_name="license_applications")
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    decision_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-submitted_date"]
