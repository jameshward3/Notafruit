from django.core.management.base import BaseCommand

from apps.audit.models import AuditLog


class Command(BaseCommand):
    help = "Verify the audit log hash chain end to end. Exit code 1 on tamper evidence."

    def handle(self, *args, **options):
        prev = "genesis"
        checked = 0
        for entry in AuditLog.objects.order_by("id").iterator():
            if entry.prev_hash != prev:
                self.stderr.write(self.style.ERROR(f"Chain break at entry {entry.pk} ({entry.event_id}): prev_hash mismatch"))
                raise SystemExit(1)
            if entry.compute_hash() != entry.entry_hash:
                self.stderr.write(self.style.ERROR(f"Content tampering at entry {entry.pk} ({entry.event_id}): hash mismatch"))
                raise SystemExit(1)
            prev = entry.entry_hash
            checked += 1
        self.stdout.write(self.style.SUCCESS(f"Audit chain intact: {checked} entries verified."))
