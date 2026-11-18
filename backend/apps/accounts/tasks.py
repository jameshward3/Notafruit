from datetime import timedelta

from celery import shared_task
from django.utils import timezone


@shared_task
def cleanup_stale_sessions():
    """Mark tracked sessions idle past the timeout as ended."""
    from django.conf import settings

    from .models import UserSession

    cutoff = timezone.now() - timedelta(seconds=settings.SESSION_COOKIE_AGE)
    return UserSession.objects.filter(ended_at=None, last_activity__lt=cutoff).update(ended_at=timezone.now())
