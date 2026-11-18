# ClerkOS — Roadmap & Developer Task Breakdown

## Phase 0 — Foundation (✅ complete in this repository)

Backend platform (12 Django apps, RBAC, hash-chained audit, locking, seed data,
tests) · React command-center UI (dashboard, 11 module list pages, audit viewer,
user management, admin panel, compliance center, system health) · Docker Compose
deployment with internal TLS, Celery jobs, nightly backups · full documentation set.

## Phase 1 — MVP hardening (target: 4–6 weeks)

| # | Task | Notes |
|---|---|---|
| 1.1 | Record detail drawers (view/edit forms per module) | extend `ListPage` with a side drawer; wire lock/unlock UX |
| 1.2 | Document upload/preview UI in the vault | multipart upload to `{id}/upload/`, PDF preview, version list, custody tab |
| 1.3 | Agenda builder (drag-order, attach documents, packet PDF) | server-side PDF via WeasyPrint |
| 1.4 | OPRA deadline board UI (Gantt) + extension/close dialogs | endpoint exists (`deadline_board`) |
| 1.5 | Boards terms Gantt view | endpoint exists (`terms_timeline`) |
| 1.6 | Report exports: PDF/CSV/XLSX for the 12 required reports | openpyxl + WeasyPrint; JSON evidence bundle exists |
| 1.7 | Email notification delivery (SMTP relay) + SMS webhook hook | templates per Notification category |
| 1.8 | TOTP MFA enrollment/challenge (fields already present) | django-otp or custom TOTP |
| 1.9 | Auto-save drafts for long forms | localStorage + PATCH debounce |
| 1.10 | E2E test suite (Playwright) + CI pipeline | see docs/10 |

## Phase 2 — Records depth (6–10 weeks)

Full-text search upgrade (`tsvector` + rank) · bulk import wizard (CSV/folder) ·
retention review queue workflow with destruction approvals + certificates ·
redaction-assist viewer (draw boxes → flattened redacted version) · public packet /
transparency export bundles · correspondence mail-merge templates.

## Phase 3 — Integration & expansion

Active Directory/LDAP + SSO (django-auth-ldap; RBAC unchanged) · resident-facing
transparency portal (separate read-only container publishing only `public.export`
content) · e-signature integration · OCR pipeline (Tesseract worker) for scanned
documents · meeting video linking + timestamped index · AI-assisted minutes
drafting (local/on-prem model only, clerk-reviewed) · subscription alerts for
residents · inter-municipal shared-services mode → multi-tenant SaaS edition once
the on-prem line is stable.

## Suggested folder structure (implemented)

```
ClerkOS/
├── backend/
│   ├── clerkos/           settings · api_urls · celery
│   └── apps/{accounts,audit,core,records,meetings,legislation,
│              opra,notices,licensing,boards,workflow,compliance}/
├── frontend/src/{api.ts,auth.tsx,theme.css,components/,pages/}
├── deploy/{nginx/,scripts/,certs/(untracked)}
├── docs/
├── docker-compose.yml · Makefile · .env.example
```

## Developer onboarding

```bash
make backend-dev    # API :8000 with SQLite + demo data
make frontend-dev   # Vite :5173 (proxies /api)
make test           # 11 backend tests
```

Conventions: every new ViewSet extends `AuditedModelViewSet` (+ `LockableMixin`
for editable records) and declares an `rbac` map; new permissions go in
`permissions_catalog.py` (single source of truth); user-visible statuses get a
tone entry in `ui.tsx`. Never write directly to `AuditLog` — use `log_event()`.
The database schema evolves through the **clerkos-db** repo's numbered migrations.
