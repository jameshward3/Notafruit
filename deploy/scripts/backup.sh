#!/usr/bin/env bash
# Manual/cron full backup: PostgreSQL dump + document store archive.
# The in-app nightly Celery task covers the database; run this for full
# off-machine copies (e.g. to an encrypted USB drive or NAS).
set -euo pipefail

STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${1:-./backups-offsite}"
mkdir -p "$DEST"

echo "[1/3] Dumping PostgreSQL…"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-clerkos}" -Fc "${POSTGRES_DB:-clerkos}" \
  > "$DEST/clerkos-db-$STAMP.dump"

echo "[2/3] Archiving document store…"
docker compose run --rm --no-deps -v "$(pwd)/$DEST:/out" backend \
  sh -c "tar czf /out/clerkos-documents-$STAMP.tar.gz -C /data documents"

echo "[3/3] Writing checksums…"
(cd "$DEST" && sha256sum "clerkos-db-$STAMP.dump" "clerkos-documents-$STAMP.tar.gz" > "clerkos-$STAMP.sha256")

echo "Backup complete: $DEST/clerkos-*-$STAMP.*"
echo "Store a copy off-machine and record the restore test in the Compliance Center."
