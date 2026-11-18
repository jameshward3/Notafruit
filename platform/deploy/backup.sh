#!/usr/bin/env bash
# Backup: Postgres (custom format, includes the civic PostGIS/search schema)
# + media/private uploads (local dir) or S3 bucket mirror, with SHA-256 checksums.
# Usage: DATABASE_URL=... BACKUP_DIR=/backups deploy/backup.sh
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/$STAMP"
mkdir -p "$OUT"
pg_dump --format=custom --no-owner --no-privileges --file="$OUT/db.dump" "$DATABASE_URL"
if [ -n "${S3_BUCKET:-}" ] && command -v mc >/dev/null; then
  mc mirror --quiet "backup-src/$S3_BUCKET" "$OUT/media"   # requires an 'mc alias set backup-src ...'
else
  for d in media private-uploads; do [ -d "$d" ] && tar -czf "$OUT/$d.tar.gz" "$d"; done
fi
( cd "$OUT" && find . -type f ! -name SHA256SUMS -print0 | xargs -0 sha256sum > SHA256SUMS )
echo "$OUT"
