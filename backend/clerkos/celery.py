import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "clerkos.settings")

app = Celery("clerkos")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Deadline sweeps and backup verification run on the local worker — no cloud
# scheduler involved.
app.conf.beat_schedule = {
    "deadline-sweep-hourly": {
        "task": "apps.workflow.tasks.deadline_sweep",
        "schedule": crontab(minute=5),
    },
    "session-cleanup-nightly": {
        "task": "apps.accounts.tasks.cleanup_stale_sessions",
        "schedule": crontab(hour=2, minute=0),
    },
    "nightly-backup": {
        "task": "apps.compliance.tasks.run_backup",
        "schedule": crontab(hour=1, minute=30),
    },
}
