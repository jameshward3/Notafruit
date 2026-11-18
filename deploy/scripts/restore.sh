#!/usr/bin/env bash
# Restore a ClerkOS backup produced by backup.sh.
# Usage: ./restore.sh backups-offsite/clerkos-db-STAMP.dump [documents.tar.gz]
set -euo pipefail

DB_DUMP="${1:?usage: restore.sh <db.dump> [documents.tar.gz]}"
DOCS_ARCHIVE="${2:-}"

echo "!! This will REPLACE the current database. Ctrl-C within 10s to abort."
sleep 10

echo "[1/2] Restoring database…"
docker compose exec -T db pg_restore -U "${POSTGRES_USER:-clerkos}" \
  --clean --if-exists -d "${POSTGRES_DB:-clerkos}" < "$DB_DUMP"

if [ -n "$DOCS_ARCHIVE" ]; then
  echo "[2/2] Restoring document store…"
  docker compose run --rm --no-deps -v "$(pwd)/$(dirname "$DOCS_ARCHIVE"):/in" backend \
    sh -c "tar xzf /in/$(basename "$DOCS_ARCHIVE") -C /data"
else
  echo "[2/2] Skipped documents (no archive supplied)."
fi

echo "Restore complete. Run: docker compose exec backend python manage.py verify_audit_chain"
echo "Then record this restore test in the Compliance Center (backup verification evidence)."
