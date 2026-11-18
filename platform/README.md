# City of Orange Township — unified public platform (prototype)

> **Prototype for review. Not the official City website.** Do not deploy to an official domain without the project
> owner's authorization (see `docs/production-checklist.md`).

Public website + editorial CMS + records/legislation + projects + budget transparency + maps, in one app:
Next.js 16 (App Router) · Payload 3 · PostgreSQL 16 + PostGIS · MapLibre · Recharts. Lives beside (and does not modify)
the ClerkOS internal system in `../`.

## Quick start (local, no Docker)
Requires Node 22.23+, pnpm 10, PostgreSQL 16 with PostGIS 3 and pg_trgm.
```bash
createdb orange_platform && psql orange_platform -c "CREATE EXTENSION postgis; CREATE EXTENSION pg_trgm;"
cp .env.example .env          # set DATABASE_URL, PAYLOAD_SECRET (≥32 chars), SEED_STAFF_PASSWORD for dev logins
pnpm install --frozen-lockfile
pnpm db:migrate               # Payload migrations + civic (PostGIS/search) SQL
pnpm seed:demo                # verified facts + source inventory + redirects + dev staff + LABELED demo content
pnpm dev                      # http://localhost:3000  (staff: /admin, *@orange.test / SEED_STAFF_PASSWORD)
pnpm worker                   # in a second terminal: publication, email outbox, search, imports
```
With Docker (not verified in the authoring environment): `docker compose up -d db mailpit && docker compose run --rm web pnpm db:migrate && docker compose up -d web worker`.

## Tests
```bash
createdb orange_platform_test && psql orange_platform_test -c "CREATE EXTENSION postgis; CREATE EXTENSION pg_trgm;"
pnpm typecheck && pnpm lint
pnpm test:int                 # resets orange_platform_test (refuses any DB not named *_test)
pnpm test:e2e                 # needs the dev server + seeded dev DB; --trace off by default
pnpm build
```

## Docs
| | |
|---|---|
| [BUILD_STATUS.md](BUILD_STATUS.md) | What is done, what is not, commands run |
| [docs/architecture.md](docs/architecture.md) | Stack, topology, data boundaries, workflow, jobs, auth, caching |
| [docs/permission-matrix.md](docs/permission-matrix.md) | Roles × capabilities |
| [docs/Orange_Agentic_Style_Guide.md](docs/Orange_Agentic_Style_Guide.md) | Design & content contract |
| [docs/style-guide-conformance.md](docs/style-guide-conformance.md) | Requirement-by-requirement status |
| [docs/design-system.md](docs/design-system.md) | Tokens and components |
| [docs/editor-guide.md](docs/editor-guide.md) | Plain-language walkthroughs (holiday notice, agenda, milestone, budget import, image) |
| [docs/api.md](docs/api.md) | Routes, server actions, data dictionaries |
| [docs/source-inventory.md](docs/source-inventory.md) | Sources, discrepancies, redirect matrix, reconciliation |
| [docs/gis-provenance.md](docs/gis-provenance.md) | Boundary status and load procedure |
| [docs/asset-manifest.md](docs/asset-manifest.md) | Seal, photography, fonts, icons |
| [docs/content-status.md](docs/content-status.md) | Verified vs demo content |
| [docs/operations.md](docs/operations.md) | Backup/restore, monitoring, providers |
| [docs/production-checklist.md](docs/production-checklist.md) | Release blockers |
| [docs/test-results.md](docs/test-results.md) | Results, coverage, performance, screenshots |
