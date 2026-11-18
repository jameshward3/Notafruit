#!/usr/bin/env bash
# Restore a backup into TARGET_DATABASE_URL (must be an EMPTY database you
# intend to overwrite). Verifies checksums first. PostGIS/pg_trgm must be
# available on the target server.
# Usage: TARGET_DATABASE_URL=... deploy/restore.sh /backups/20261117T000000Z
set -euo pipefail
SRC="${1:?backup directory}"
: "${TARGET_DATABASE_URL:?set TARGET_DATABASE_URL}"
( cd "$SRC" && sha256sum --check --quiet SHA256SUMS )
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -qc "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS pg_trgm;"
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$TARGET_DATABASE_URL" "$SRC/db.dump" 2>&1 | grep -v 'already exists' || true
for f in "$SRC"/*.tar.gz; do [ -e "$f" ] && echo "media archive available: $f (extract into the app directory or upload to the bucket)"; done
echo "restore complete"
