"""
Deadline sweep: the background job behind every deadline alert on the
dashboard. Runs hourly via Celery beat; idempotent per day per record.
"""
from datetime import timedelta

from celery import shared_task
from django.utils import timezone


def _notify_clerks(category, severity, title, message, link):
    from apps.accounts.models import User

    from .models import Notification

    recipients = User.objects.filter(is_active=True, roles__permissions__code="opra.manage").distinct()
    for user in recipients:
        # One notification per user per title per day keeps the sweep idempotent.
        today = timezone.localdate()
        if not Notification.objects.filter(user=user, title=title, created_at__date=today).exists():
            Notification.objects.create(
                user=user, category=category, severity=severity, title=title, message=message, link=link
            )


@shared_task
def deadline_sweep():
    from apps.boards.models import Appointment
    from apps.licensing.models import License
    from apps.notices.models import PublicNotice
    from apps.opra.models import OPRARequest

    from .models import Notification

    today = timezone.localdate()
    counts = {"opra": 0, "notices": 0, "licenses": 0, "boards": 0}

    for r in OPRARequest.objects.filter(status__in=OPRARequest.OPEN_STATUSES):
        days = (r.effective_due_date - today).days
        if days <= 2:
            severity = Notification.Severity.CRITICAL if days < 0 else Notification.Severity.WARNING
            label = "OVERDUE" if days < 0 else f"due in {days} day(s)"
            _notify_clerks(Notification.Category.OPRA_DEADLINE, severity,
                           f"OPRA {r.request_number} {label}", r.description[:200], f"/opra/{r.pk}")
            counts["opra"] += 1

    for n in PublicNotice.objects.filter(status__in=["draft", "submitted"], required_publication_date__isnull=False):
        days = (n.required_publication_date - today).days
        if days <= 3:
            _notify_clerks(Notification.Category.NOTICE_DEADLINE, Notification.Severity.WARNING,
                           f"Public notice deadline: {n.title[:80]}", f"Required publication {n.required_publication_date}",
                           f"/notices/{n.pk}")
            counts["notices"] += 1

    horizon = today + timedelta(days=60)
    for lic in License.objects.filter(status="active", expiration_date__lte=horizon, expiration_date__gte=today):
        _notify_clerks(Notification.Category.LICENSE_RENEWAL, Notification.Severity.INFO,
                       f"License {lic.license_number} expires {lic.expiration_date}", lic.holder_name, f"/licenses/{lic.pk}")
        counts["licenses"] += 1

    for appt in Appointment.objects.filter(status="active", term_end__lte=today + timedelta(days=90), term_end__gte=today):
        _notify_clerks(Notification.Category.BOARD_VACANCY, Notification.Severity.INFO,
                       f"Board term expiring: {appt.member_name} ({appt.seat})", f"Term ends {appt.term_end}",
                       f"/boards/{appt.seat.board_id}")
        counts["boards"] += 1

    return counts
