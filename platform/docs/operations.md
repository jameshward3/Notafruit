# Operations runbook
## Processes
- `web`: `pnpm start` (after `pnpm build`). Health: `GET /data/health`.
- `worker`: `pnpm worker` (loop, 30 s) or `pnpm worker --once` from a scheduler. Logs one JSON line per tick.
- Migrations on deploy: `pnpm db:migrate` (Payload migrations, then `civic` SQL). Run before starting new web/worker.

## Backup (tested 2026-11-17 in the authoring environment)
`DATABASE_URL=… BACKUP_DIR=/backups deploy/backup.sh` → `/backups/<UTC stamp>/{db.dump, media.tar.gz?, private-uploads.tar.gz?, SHA256SUMS}`.
Schedule nightly; copy off-host; retain per the City's records schedule.

## Restore
1. Create an **empty** database with PostGIS available.
2. `TARGET_DATABASE_URL=… deploy/restore.sh /backups/<stamp>` (verifies checksums, restores schema `public` + `civic`).
3. Extract media archives / mirror the bucket back.
4. Start web + worker; check `/data/health`.
**Drill performed:** restore into `orange_platform_restore`; counts of notices (7), budget lines (45), search docs (28),
project geometries (4), audit events (148) and the budget cents total matched the source exactly. Object-storage
restore was not drilled (no bucket configured).

## Monitoring
- `/data/health` → alert on 503 (DB down, or no job completed in 10 min = worker stalled).
- `outbox.failed > 0` or `stalePending > 0` → mail provider problem. Failed jobs are visible to administrators in
  **Administration → Payload Jobs**; failed import batches show their report on the batch.
- Data freshness: each budget dataset shows `dataUpdatedAt`; add an alert if the current fiscal year has no published dataset.
- Logs: worker logs JSON; the app never logs raw addresses or form contents. Ship stdout to the City's log platform with
  retention ≥ 90 days. Error monitoring (e.g. Sentry) is an adapter to add with credentials (checklist P-7).

## Providers to configure
Basemap: the prototype loads OpenStreetMap's public tiles in visitors' browsers (`NEXT_PUBLIC_BASEMAP=osm`, default); their usage
policy forbids heavy use, so production must set `NEXT_PUBLIC_MAP_STYLE_URL` to a licensed provider or `NEXT_PUBLIC_BASEMAP=none`.
Mail (SMTP credentials), geocoder (`census` needs outbound access), basemap style URL, S3 bucket, identity-aware proxy +
IdP app registration. None are required for the site to run; each degrades to an explicit "not available" state.

## Performance budgets (targets; measured values in test-results.md)
Public page TTFB < 500 ms on the staging DB; JS < 250 kB gz on non-map pages; maps and charts load client-side only on
their pages. Lighthouse was not run in this environment.
