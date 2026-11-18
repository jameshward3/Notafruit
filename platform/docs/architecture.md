# Architecture — Orange Township public platform (`platform/`)

## Context and the decision to build a separate app
The repository already contained **ClerkOS** (Django/DRF + React, on-prem, LAN-only clerk operations). The project owner chose
(2026-11-17) to build the public platform as a **separate Next.js + Payload app** in `platform/`, leaving ClerkOS untouched.
Consequence: meetings/legislation exist in both systems. Until a sync is built, **ClerkOS remains the clerk's internal system
and this platform is the public publication system**; a future one-way, reviewed export from ClerkOS → platform is the
recommended path (production checklist item P-14). Nothing here writes to ClerkOS.

## Stack (pinned, all releases ≥ 2 weeks old at selection; `pnpm-lock.yaml` committed)
| Layer | Choice | Version |
|---|---|---|
| Web + SSR | Next.js App Router, React | 16.4.5, 19.2.9 |
| CMS / staff admin / auth | Payload | 3.92.1 (peer-compatible with Next ≥16.3.3) |
| Database | PostgreSQL + PostGIS + pg_trgm | 16 + 3.4 |
| DB adapter | @payloadcms/db-postgres (Drizzle) | 3.92.1 |
| Maps | MapLibre GL JS | 6.16.0 |
| Charts | Recharts | 3.10.1 |
| Validation | zod | 4.6.7 |
| Icons | lucide-react (ISC) | 1.66.0 |
| Font | Inter, self-hosted via @fontsource-variable/inter | 5.3.0 |
| Tests | Vitest 4.0.18; Playwright 1.63.0 + @axe-core/playwright 4.14.0 | |

**Deviation:** Tailwind CSS was not adopted. Tokens are CSS custom properties (`src/styles/tokens.css`) with one component
stylesheet (`site.css`). This kept the build simpler; Tailwind v4 can consume the same tokens via `@theme` if desired.

## Process topology
```
 browser ──HTTPS──▶ reverse proxy (TLS, rate limits, strips X-Auth-*)
                      ├── /           Next.js "web" (public pages, server actions, /data/* routes)
                      ├── /admin,/api Payload (same Next process)  ◀── identity-aware proxy (IdP + MFA) in production
                      └── ...
 "worker" process (scripts/worker.ts) ── same image, separate container; runs Payload jobs every 30 s
 PostgreSQL 16 + PostGIS  (public schema: Payload; civic schema: app-managed)
 Object storage: local ./media (dev) or S3-compatible bucket (S3_BUCKET set)
 Private files: PRIVATE_UPLOAD_DIR (import CSVs, captured mail) — never under the web root
```
Deploying only the frontend does **not** deploy the system: the worker, Postgres/PostGIS, storage and backups are required.
A platform that runs serverless functions only (no long-running worker) needs an external scheduler invoking
`pnpm worker --once` every minute.

## Data boundaries
- **Payload-managed schema (`public`)** — all editorial/records/data collections, versions, jobs. Changed only by committed
  migrations (`src/migrations`, `push: false`).
- **App-managed schema (`civic`)** — `sql/*.sql`, applied by `scripts/sql-migrate.ts` (checksummed, refuses edited files).
  Holds PostGIS geometry (`boundary_versions`, `municipal_geometries`, `ward_geometries`, `place_points`,
  `project_geometries`), the search index and rate-limit counters. Kept outside `public` because Payload/Drizzle's schema
  tooling does not model PostGIS columns and could drop unknown tables. Rows link to Payload docs by integer id.
- **Public reads** go only through `src/lib/public.ts`, which forces `overrideAccess:false` with no user (the Payload Local
  API otherwise bypasses access control by default).

## Editorial workflow
`draft → in_review → approved → scheduled/published → archived` (`src/fields/workflow.ts`, `TRANSITIONS` in
`src/access/roles.ts`). Approval and publication are separate. Transitions are enforced in a `beforeChange` hook on
every write path (admin UI, REST, Local API without `context.system`). Verification state (`unverified / verified /
needs_review / demo`) is a separate field. Every change writes an append-only `audit-events` row; collections keep up to
100 versions for rollback (`restoreVersion`).

## Jobs (durable, idempotent)
Payload jobs persisted in `payload_jobs`. Scheduled every minute: `publicationSweep` (scheduled→published,
expired→archived), `deliverOutbox`; hourly `reconcileSearch`; on demand `importBatch`. The outbox claims rows with
`FOR UPDATE SKIP LOCKED`, deduplicates by unique key, retries with exponential backoff (max 5), suppresses unsubscribed
recipients, and marks `sent` only after the provider returns a message id (dev capture ids are prefixed `capture:`).

## Search
Postgres FTS (`websearch_to_tsquery`) + trigram similarity in `civic.search_documents`, behind `src/lib/search.ts`.
Exact identifier matches get +10 rank. Only publicly visible docs are indexed (hook on every change + hourly reconcile).
Replaceable by a dedicated engine by reimplementing that module.

## Auth
- Development: Payload local login (`AUTH_MODE=local`), lockout after 5 failures, sessions, SameSite=Strict cookies.
- Production: `AUTH_MODE=proxy` disables local passwords; an identity-aware proxy authenticates staff against the City
  IdP (MFA by IdP policy) and forwards the email plus a shared secret (`src/auth/proxyStrategy.ts`). Accounts are not
  auto-provisioned; roles live only in the CMS. One identity system, one authorization system.

## Caching
Public pages are dynamic (`force-dynamic`) and Next sends `private, no-cache` — nothing private can enter a shared
cache. `/admin` and `/api` additionally send `private, no-store`. Data downloads (`/data/*.csv|ics`) use short public
max-age. A CDN layer with explicit purge-on-publish is a production option (checklist P-9), not implemented.
