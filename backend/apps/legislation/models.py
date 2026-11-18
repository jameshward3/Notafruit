from django.conf import settings
from django.db import models


class LegislativeItem(models.Model):
    """Shared lifecycle for ordinances and resolutions."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        UNDER_REVIEW = "under_review", "Under Review"
        READY_FOR_AGENDA = "ready_for_agenda", "Ready for Agenda"
        INTRODUCED = "introduced", "Introduced"
        PUBLIC_HEARING = "public_hearing", "Public Hearing Scheduled"
        ADOPTED = "adopted", "Adopted"
        FAILED = "failed", "Failed"
        TABLED = "tabled", "Tabled"
        WITHDRAWN = "withdrawn", "Withdrawn"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    class LegalReview(models.TextChoices):
        NOT_REQUIRED = "not_required", "Not Required"
        PENDING = "pending", "Pending"
        IN_REVIEW = "in_review", "In Review"
        APPROVED = "approved", "Approved"
        CHANGES_REQUESTED = "changes_requested", "Changes Requested"

    number = models.CharField(max_length=40, unique=True)
    title = models.CharField(max_length=400)
    summary = models.TextField(blank=True)
    sponsor = models.CharField(max_length=120, blank=True)
    co_sponsors = models.JSONField(default=list, blank=True)
    department = models.ForeignKey("accounts.Department", null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.DRAFT, db_index=True)

    introduced_date = models.DateField(null=True, blank=True)
    public_hearing_date = models.DateField(null=True, blank=True)
    adoption_date = models.DateField(null=True, blank=True)
    effective_date = models.DateField(null=True, blank=True)
    publication_date = models.DateField(null=True, blank=True)

    legal_review = models.CharField(max_length=20, choices=LegalReview.choices, default=LegalReview.NOT_REQUIRED)
    fiscal_impact = models.TextField(blank=True)

    related_meeting = models.ForeignKey("meetings.Meeting", null=True, blank=True, on_delete=models.SET_NULL, related_name="%(class)ss")
    related_agenda_item = models.ForeignKey("meetings.AgendaItem", null=True, blank=True, on_delete=models.SET_NULL, related_name="%(class)ss")
    attachments = models.ManyToManyField("records.Document", blank=True, related_name="%(class)ss")

    amendments = models.JSONField(default=list, blank=True, help_text='[{"date": ..., "description": ...}]')
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="%(class)ss_created")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.number}: {self.title[:60]}"

    def lifecycle(self) -> list[dict]:
        """Milestones for the visual lifecycle timeline."""
        return [
            {"milestone": "Draft", "date": self.created_at.date() if self.created_at else None, "done": True},
            {"milestone": "Introduced", "date": self.introduced_date, "done": self.introduced_date is not None},
            {"milestone": "Public Hearing", "date": self.public_hearing_date, "done": self.public_hearing_date is not None},
            {"milestone": "Adopted", "date": self.adoption_date, "done": self.adoption_date is not None},
            {"milestone": "Published", "date": self.publication_date, "done": self.publication_date is not None},
            {"milestone": "Effective", "date": self.effective_date, "done": self.effective_date is not None},
        ]


class Ordinance(LegislativeItem):
    second_reading_date = models.DateField(null=True, blank=True)


class Resolution(LegislativeItem):
    consent_agenda = models.BooleanField(default=False)
