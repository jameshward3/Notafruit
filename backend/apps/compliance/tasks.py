import hashlib
import os
import subprocess
from datetime import datetime
from pathlib import Path

from celery import shared_task
from django.conf import settings
from django.utils import timezone


@shared_task
def run_backup():
    """
    Nightly pg_dump to the local backup volume; records a BackupJob row either
    way so the dashboard's backup status is always truthful.
    """
    from apps.workflow.models import Notification

    from .models import BackupJob

    backup_dir = Path(os.environ.get("CLERKOS_BACKUP_DIR", "/backups"))
    job = BackupJob.objects.create(job_type=BackupJob.JobType.DATABASE)
    try:
        backup_dir.mkdir(parents=True, exist_ok=True)
        target = backup_dir / f"clerkos-db-{datetime.now():%Y%m%d-%H%M%S}.dump"
        db = settings.DATABASES["default"]
        if db["ENGINE"].endswith("postgresql"):
            env = {**os.environ, "PGPASSWORD": db["PASSWORD"]}
            subprocess.run(
                ["pg_dump", "-h", db["HOST"], "-p", str(db["PORT"]), "-U", db["USER"], "-Fc", "-f", str(target), db["NAME"]],
                check=True, env=env, capture_output=True, timeout=3600,
            )
        else:  # sqlite dev database
            import shutil

            shutil.copy(db["NAME"], target)
        sha = hashlib.sha256(target.read_bytes()).hexdigest()
        job.status = BackupJob.Status.SUCCESS
        job.size_bytes = target.stat().st_size
        job.location = str(target)
        job.checksum_sha256 = sha
    except Exception as exc:  # noqa: BLE001 — must record any failure
        job.status = BackupJob.Status.FAILED
        job.log = str(exc)[:4000]
        from apps.accounts.models import User

        for admin in User.objects.filter(is_active=True, is_superuser=True):
            Notification.objects.create(
                user=admin, category=Notification.Category.BACKUP, severity=Notification.Severity.CRITICAL,
                title="Nightly backup FAILED", message=str(exc)[:500], link="/admin/backups",
            )
    job.completed_at = timezone.now()
    job.save()
    return job.status
