# Test results — 2026-11-17 (updated after style-guide conformance pass) (authoring environment: Linux, Node 22.23.5, PostgreSQL 16.15 + PostGIS 3.4, Chromium via Playwright 1.63.0)

| Check | Command | Result |
|---|---|---|
| Type check | `pnpm typecheck` | ✅ no errors |
| Lint | `pnpm lint` | ✅ 0 errors, 0 warnings |
| Unit + integration (real Postgres test DB, reset per run) | `pnpm test:int` | ✅ 71/71 (incl. 31 contrast pairs, SSRF guard, media manifest, link checks) |
| Browser + accessibility + REST | `pnpm test:e2e` | ✅ 61 passed, 3 skipped (mobile-only tests in the desktop project) |
| Production build | `pnpm build` | ✅ |
| Migrations from empty DB | test global setup runs `payload migrate` + `sql-migrate` | ✅ |
| Backup → restore drill | `deploy/backup.sh` / `deploy/restore.sh` | ✅ row counts + budget total identical |
| Docker images / compose | — | ❌ not executed (no Docker daemon available) |
| Object-storage (S3/MinIO) | — | ❌ not executed (no bucket configured) |
| Real SMTP delivery | — | ❌ not executed (capture transport only) |
| Lighthouse | — | ❌ not run |
| Screen reader (NVDA/VoiceOver) manual test | — | ❌ not performed — required before launch |

Mutation check: forcing `canPublishIn()` to always return true made 6 permission tests fail (then restored).
Observed flake: one axe run on `/transparency/budget` failed right after a dev-server restart (first compile); it did not
reproduce in three subsequent full runs.

## Coverage of required scenarios
- Contributor cannot publish/approve/emergency-publish, cannot create/edit/read other departments' drafts, cannot read
  private collections, cannot escalate roles — Local API with access enforced **and** direct REST (`api.e2e.spec.ts`).
- Drafts absent from public REST, pages, search, ICS feed; private requests never searchable.
- Scheduled notice publishes only via worker sweep, expires to archived, re-runs are no-ops; version rollback.
- Outbox: one row per subscriber per event; delivery once; unsubscribe → suppression; "sent" only with provider id.
- Agenda → legislation → votes linkage; status derived from actions (tabled preserved); exact identifier ranks first.
- Budget: chart table total = CSV sum; filtered totals; nulls stay null; unpublished rows hidden; imports blocked on
  published datasets; dry run / duplicates / commit / idempotent re-commit / rollback.
- Ward lookup: unavailable without verified data; demo = illustrative only; inside/outside/boundary-ambiguous/gap cases.
- Concern intake private with real reference; rate limiting; input preserved after validation errors.
- axe (WCAG 2.0/2.1/2.2 A/AA tags) on 16 pages × desktop + mobile; skip link; 320 px reflow; keyboard-scrollable tables;
  mobile menu; map + list rendered together; Spanish fallback notice; old-URL redirects; security headers; staff admin login.

Automated accessibility checks supplement manual review; they are not a conformance certificate.

## Performance (production build, local, single user, warm DB)
| Page | TTFB | Load | JS received (decoded) |
|---|---|---|---|
| / | 26 ms | 759 ms | 238 kB |
| /projects (map) | 24 ms | 191 ms | 1,747 kB (MapLibre + worker) |
| /transparency/budget (charts) | 31 ms | 253 ms | 367 kB |
| /government/meetings/[slug] | 41 ms | 220 ms | 225 kB |
| /services | 12 ms | 113 ms | 157 kB |
Not representative of production network conditions; compressed transfer sizes were not measured.

## Screenshots
`docs/screenshots/{home,explore,projects,budget,meeting}-{desktop,mobile}.png` (desktop 1440 px; mobile iPhone 13 emulation).
Regenerate: `node scripts/screenshots.mjs` with the dev server running.

## Style-guide additions (second pass)
Forced-colors: axe's color-contrast rule reports author colors under Chromium forced-colors emulation even though the
browser renders system colors; the test therefore disables only that rule in forced-colors mode and asserts that no
author text/icon colors remain in the rendered output (this caught gold task icons, now fixed). The 200% zoom check
uses a 640×450 CSS viewport (1280×900 at 2×).
