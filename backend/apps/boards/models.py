from django.db import models
from django.utils import timezone


class Board(models.Model):
    class BoardType(models.TextChoices):
        BOARD = "board"
        COMMISSION = "commission"
        COMMITTEE = "committee"
        AUTHORITY = "authority"

    name = models.CharField(max_length=160, unique=True)
    board_type = models.CharField(max_length=20, choices=BoardType.choices, default=BoardType.BOARD)
    description = models.TextField(blank=True)
    meeting_schedule = models.CharField(max_length=200, blank=True, help_text="e.g. 2nd Tuesday monthly, 7:00 PM")
    enabling_authority = models.CharField(max_length=200, blank=True, help_text="Statute/ordinance creating the body")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class BoardSeat(models.Model):
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="seats")
    seat_name = models.CharField(max_length=120, help_text='e.g. "Seat 3", "Class II Member", "Alternate 1"')
    term_length_years = models.PositiveIntegerField(default=3)
    appointing_authority = models.CharField(max_length=160, blank=True, help_text="e.g. Mayor with Council consent")
    qualifications = models.TextField(blank=True)

    class Meta:
        ordering = ["board", "seat_name"]
        unique_together = [("board", "seat_name")]

    def __str__(self):
        return f"{self.board.name} — {self.seat_name}"

    @property
    def current_appointment(self):
        return self.appointments.filter(status="active").order_by("-term_end").first()

    @property
    def is_vacant(self) -> bool:
        return self.current_appointment is None


class Appointment(models.Model):
    class Status(models.TextChoices):
        PENDING_APPROVAL = "pending_approval", "Pending Council Approval"
        ACTIVE = "active"
        EXPIRED = "expired"
        RESIGNED = "resigned"
        REMOVED = "removed"

    seat = models.ForeignKey(BoardSeat, on_delete=models.CASCADE, related_name="appointments")
    member_name = models.CharField(max_length=160)
    member_email = models.EmailField(blank=True)
    appointed_by = models.CharField(max_length=160, blank=True)
    term_start = models.DateField()
    term_end = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING_APPROVAL, db_index=True)
    council_approval_date = models.DateField(null=True, blank=True)
    application_document = models.ForeignKey(
        "records.Document", null=True, blank=True, on_delete=models.SET_NULL, related_name="appointment_applications"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-term_end"]

    def __str__(self):
        return f"{self.member_name} — {self.seat}"

    @property
    def days_until_expiration(self) -> int:
        return (self.term_end - timezone.localdate()).days
