from django.conf import settings
from django.db import models


class PublicNotice(models.Model):
    class Category(models.TextChoices):
        MEETING = "meeting", "Meeting Notice"
        ORDINANCE = "ordinance", "Ordinance Publication"
        HEARING = "hearing", "Public Hearing"
        BID = "bid", "Bid/RFP"
        ELECTION = "election", "Election Notice"
        LEGAL_AD = "legal_ad", "Legal Advertisement"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        DRAFT = "draft"
        SUBMITTED = "submitted", "Submitted to Publisher"
        PUBLISHED = "published"
        PROOF_RECEIVED = "proof_received", "Proof of Publication Received"
        ARCHIVED = "archived"
        CANCELLED = "cancelled"

    title = models.CharField(max_length=300)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    body = models.TextField(blank=True)
    newspaper = models.CharField(max_length=160, blank=True, help_text="Newspaper or publication vendor")
    required_publication_date = models.DateField(null=True, blank=True, db_index=True)
    publication_date = models.DateField(null=True, blank=True)
    public_hearing_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    related_meeting = models.ForeignKey("meetings.Meeting", null=True, blank=True, on_delete=models.SET_NULL, related_name="public_notices")
    related_ordinance = models.ForeignKey("legislation.Ordinance", null=True, blank=True, on_delete=models.SET_NULL, related_name="public_notices")
    related_resolution = models.ForeignKey("legislation.Resolution", null=True, blank=True, on_delete=models.SET_NULL, related_name="public_notices")
    proof_document = models.ForeignKey("records.Document", null=True, blank=True, on_delete=models.SET_NULL, related_name="proof_for_notices")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-required_publication_date", "-id"]

    def __str__(self):
        return self.title
