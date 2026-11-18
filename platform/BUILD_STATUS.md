# BUILD_STATUS — platform/
_Last updated 2026-11-17. Branch `claude/orange-township-platform-o9f049`._

## Decisions
- Separate Next.js + Payload app in `platform/` (owner's choice); ClerkOS untouched. Priority: working vertical slices.
- Pinned: Next 16.4.5, Payload 3.92.1, React 19.2.9, MapLibre 6.16.0, Recharts 3.10.1 (all ≥ 2 weeks old).
- PostGIS + search in app-managed `civic` schema (Payload doesn't model PostGIS). Tailwind not adopted (CSS tokens).
- No campaign (jw4o.com) content imported. No ward geometry invented.

## Done (verified by tests or observed)
- Schema + migrations: 24 collections + `civic` schema; versions, audit, workflow, verification state.
- Roles/permissions with department scope; enforced on REST/admin/Local API.
- Public pages: home, explore (+ ward/place detail), projects (+ detail), budget (+ datasets, CSV), meetings (+ detail,
  print), legislation (+ detail, votes), services, departments, notices, calendar (+ ICS), search, report-a-concern,
  subscribe/confirm/unsubscribe, accessibility, privacy, redirects/404, health.
- Worker + jobs: publication sweep, outbox with dedupe/retry/suppression, search reconcile, CSV import pipeline.
- Security: CSP + headers, rate limits (hashed keys), CSRF via server actions/Payload csrf list, formula-safe CSV,
  sanitized search snippets, private upload dir, SVG uploads rejected, identity-proxy auth strategy for production.
- Tests: 71 int/unit, 61 browser (axe on 16 pages × 2 viewports, forced colors, 200% zoom). Build, lint, typecheck clean. Backup/restore drilled.

## Style-guide conformance pass (after the guide was supplied)
Guide committed as docs/Orange_Agentic_Style_Guide.md; item-by-item status in docs/style-guide-conformance.md.
Added: guide token names, type weights, focus rings (light/navy/forced-colors), compact mobile header, illustrative map
banner, guide project status styles with symbols, explorer layers incl. street projects, list-first mobile maps,
direct chart labels + keyboard tooltips, capital investment by location, media manifest fields (checksum, approval
stamps, verification, AVIF), originals no longer re-encoded, staff previews, SSRF-guarded link checks, source warnings.
Migration: src/migrations/20261117_224506_style_guide_conformance.

## Seal and map boundary (owner request, 2026-11-17)
- Official seal from orangenj.gov added unmodified to the masthead lockup, authorized by the project owner.
- Maps render like the owner's paving map (OSM basemap, grey outside City, dashed navy outline) using the U.S. Census
  Bureau legal municipal boundary instead of ZIP 07050 (98% overlap, up to 79 m apart). Ward boundaries still missing.

## Not done / open (see docs/production-checklist.md)
- Official seal, photography, ward/municipal GIS, real content migration (only City Hall facts verified).
- Docker images/compose not built (no daemon). S3/MinIO, SMTP, geocoder, basemap not exercised with real providers.
- Identity-aware proxy path implemented but not exercised against a real IdP; no MFA exists in local mode.
- Upload malware scanning; CSP nonces; CDN invalidation; Spanish content; ClerkOS sync; manual screen-reader testing.
- Contracts dataset view; device geolocation (intentionally not implemented).

## Commands run (all succeeded unless noted)
`pnpm install` · `payload generate:types` · `payload migrate:create initial` · `pnpm db:migrate` · `pnpm seed:demo` (×4,
idempotent) · `pnpm test:int` · `pnpm test:e2e` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm worker --once`
· `deploy/backup.sh` + `deploy/restore.sh`. Failures encountered and fixed: ESLint compat config, MapLibre worker URL,
axe label-in-name, 320 px overflow, scrollable-region focus, form values lost on validation error, rate-limit in e2e.
Docker image tag check: `minio/minio` not resolvable on Docker Hub → MinIO made opt-in with explicit image.

## Resume here
1. Obtain P-2/P-3 inputs (seal, ward GIS) and load per docs/gis-provenance.md.
2. Build a resumable crawler for orangetwpnjcc.org meetings → `source-records` + unreviewed text versions.
3. Stand up private staging with Docker; configure IdP proxy, SMTP, basemap.
