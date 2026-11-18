from django.conf import settings
from django.db import models


class Meeting(models.Model):
    class MeetingType(models.TextChoices):
        COUNCIL = "council", "Council Meeting"
        SPECIAL = "special", "Special Meeting"
        BOARD = "board", "Board Meeting"
        COMMISSION = "commission", "Commission Meeting"
        COMMITTEE = "committee", "Committee Meeting"
        WORK_SESSION = "work_session", "Work Session"

    class Status(models.TextChoices):
        SCHEDULED = "scheduled"
        AGENDA_OPEN = "agenda_open", "Agenda Open"
        AGENDA_CLOSED = "agenda_closed", "Agenda Closed"
        PACKET_READY = "packet_ready", "Packet Ready"
        IN_PROGRESS = "in_progress"
        COMPLETED = "completed"
        MINUTES_PENDING = "minutes_pending", "Minutes Pending"
        ARCHIVED = "archived"
        CANCELLED = "cancelled"

    title = models.CharField(max_length=200)
    meeting_type = models.CharField(max_length=20, choices=MeetingType.choices, default=MeetingType.COUNCIL)
    body = models.ForeignKey("boards.Board", null=True, blank=True, on_delete=models.SET_NULL, related_name="meetings")
    date = models.DateField(db_index=True)
    start_time = models.TimeField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    agenda_deadline = models.DateField(null=True, blank=True, help_text="Deadline for agenda item submissions")
    video_url = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    packet_document = models.ForeignKey(
        "records.Document", null=True, blank=True, on_delete=models.SET_NULL, related_name="packet_for_meetings"
    )
    attendance = models.JSONField(default=list, blank=True, help_text='[{"name": ..., "present": true, "arrived": ...}]')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-start_time"]

    def __str__(self):
        return f"{self.title} ({self.date})"


class AgendaItem(models.Model):
    class Status(models.TextChoices):
        SUBMITTED = "submitted"
        DEPARTMENT_REVIEW = "department_review", "Department Review"
        LEGAL_REVIEW = "legal_review", "Legal Review"
        APPROVED = "approved"
        ON_AGENDA = "on_agenda", "On Agenda"
        DEFERRED = "deferred"
        WITHDRAWN = "withdrawn"

    class ItemType(models.TextChoices):
        ORDINANCE = "ordinance"
        RESOLUTION = "resolution"
        PROCLAMATION = "proclamation"
        PRESENTATION = "presentation"
        PUBLIC_HEARING = "public_hearing", "Public Hearing"
        CONSENT = "consent", "Consent Agenda"
        DISCUSSION = "discussion"
        OTHER = "other"

    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="agenda_items")
    order = models.PositiveIntegerField(default=0)
    item_type = models.CharField(max_length=20, choices=ItemType.choices, default=ItemType.DISCUSSION)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    department = models.ForeignKey("accounts.Department", null=True, blank=True, on_delete=models.SET_NULL)
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED, db_index=True)
    legal_review_required = models.BooleanField(default=False)
    legal_review_completed = models.BooleanField(default=False)
    attachments = models.ManyToManyField("records.Document", blank=True, related_name="agenda_items")
    # Motion outcome recorded during the meeting
    motion_text = models.TextField(blank=True)
    moved_by = models.CharField(max_length=120, blank=True)
    seconded_by = models.CharField(max_length=120, blank=True)
    result = models.CharField(max_length=20, blank=True, help_text="carried / failed / tabled")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["meeting", "order"]

    def __str__(self):
        return self.title


class Vote(models.Model):
    class Value(models.TextChoices):
        YES = "yes"
        NO = "no"
        ABSTAIN = "abstain"
        RECUSE = "recuse"
        ABSENT = "absent"

    agenda_item = models.ForeignKey(AgendaItem, on_delete=models.CASCADE, related_name="votes")
    member_name = models.CharField(max_length=120)
    value = models.CharField(max_length=10, choices=Value.choices)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["agenda_item", "member_name"]
        unique_together = [("agenda_item", "member_name")]


class Minutes(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft"
        PENDING_APPROVAL = "pending_approval", "Pending Approval"
        APPROVED = "approved"
        PUBLISHED = "published"

    meeting = models.OneToOneField(Meeting, on_delete=models.CASCADE, related_name="minutes")
    content = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    prepared_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="minutes_prepared")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="minutes_approved")
    approved_at = models.DateTimeField(null=True, blank=True)
    document = models.ForeignKey("records.Document", null=True, blank=True, on_delete=models.SET_NULL)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "minutes"

    def __str__(self):
        return f"Minutes — {self.meeting}"
