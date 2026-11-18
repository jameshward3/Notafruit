# ClerkOS — API Specification

Base URL: `/api/v1/` · JSON only · Session authentication with CSRF
(`X-CSRFToken` header on mutating requests) · Pagination: `?page=N` (25/page) →
`{count, next, previous, results}` · Filtering: field params (django-filter),
`?search=` (module-specific fields), `?ordering=field|-field`.

Errors: `400` validation `{field: [errors]}` · `401` unauthenticated/expired ·
`403` RBAC denied `{"detail": ...}` · `423` record locked `{"detail", "lock"}`.

## Authentication

| Method | Path | Notes |
|---|---|---|
| GET | `/auth/csrf/` | Sets the CSRF cookie (call before login) |
| POST | `/auth/login/` | `{username, password}` → user payload with `permissions[]`; 401 + lockout handling |
| POST | `/auth/logout/` | Ends session (tracked + audited) |
| GET | `/auth/me/` | Current user, roles, permissions, `must_change_password` |
| POST | `/auth/change-password/` | `{current_password, new_password}` (policy-validated) |

## Users, roles, departments, sessions (users.manage)

| Resource | Routes | Extra actions |
|---|---|---|
| `/users/` | CRUD (DELETE = deactivate) | POST `{id}/reset_password/`, `{id}/unlock/`, `{id}/revoke_sessions/` |
| `/roles/` | CRUD (list open to all authenticated) | permission changes audited as `permission_change`; system roles undeletable |
| `/permissions/` | read-only catalog | |
| `/departments/` | CRUD (list open) | |
| `/sessions/` | read-only; `?active=true` = last 15 min | POST `{id}/revoke/` |

## Records Vault

| Resource | Routes | Extra actions |
|---|---|---|
| `/documents/` | CRUD (delete requires `retention.approve_destruction`; blocked by legal hold / permanent flag) | POST `{id}/upload/` (multipart) → version + duplicate report · GET `{id}/download/?version=n` · GET `{id}/versions/` · GET `{id}/chain_of_custody/` · POST `{id}/redact/` · lock trio |
| `/record-categories/`, `/retention-rules/` | CRUD (`system.configure` to modify) | |
| `/legal-holds/` | CRUD (`legalhold.place` / `legalhold.remove`) | POST `{id}/release/`, `{id}/attach/` `{document_ids}` |

## Meetings & Legislation

| Resource | Extra actions |
|---|---|
| `/meetings/` | POST `{id}/generate_packet/` → manifest · lock trio |
| `/agenda-items/` | POST `{id}/record_votes/` `{votes:[...], result?}` · lock trio |
| `/votes/`, `/minutes/` | CRUD; minutes: POST `{id}/approve/` |
| `/ordinances/`, `/resolutions/` | GET `{id}/timeline/` → lifecycle milestones · status transitions audited · lock trio |

## OPRA

| Resource | Extra actions |
|---|---|
| `/opra-requests/` | POST `{id}/assign/`, `{id}/extend/`, `{id}/close/` · GET `{id}/export_file/` · GET `deadline_board/` → `{overdue[], due_soon[], on_track[]}` · lock trio |
| `/opra-assignments/`, `/opra-responses/` | CRUD |

## Notices, Licenses, Boards

| Resource | Extra actions |
|---|---|
| `/public-notices/` | CRUD + lock trio |
| `/licenses/`, `/license-applications/` | CRUD |
| `/boards/` | GET `terms_timeline/` (Gantt) · GET `directory/` (public export) |
| `/board-seats/`, `/appointments/` | CRUD · GET `/appointments/expiring/?days=90` |

## Workflow

| Resource | Extra actions |
|---|---|
| `/tasks/` | CRUD (assignment creates a notification) |
| `/notifications/` | own-user scope · POST `mark_all_read/` · GET `unread_count/` |
| `/correspondence/` | CRUD |

## Audit & Compliance

| Resource | Extra actions |
|---|---|
| `/audit-logs/` | read-only (`logs.view`); rich filters + `start`/`end` dates · GET `export/` CSV · GET `verify/` → `{intact, ...}` |
| `/compliance-controls/` | GET `summary/` → readiness % per framework |
| `/compliance-evidence/` | GET `export_package/` → JSON bundle |
| `/risk-register/`, `/backup-jobs/` | CRUD · POST `/backup-jobs/{id}/mark_verified/` |
| `/system-settings/` | CRUD (`system.configure`) |

## System

| Method | Path | Notes |
|---|---|---|
| GET | `/system/health/` | public liveness: status, database, last backup, version |
| GET | `/dashboard/` | all Command Center data in one payload |
| GET | `/search/?q=` | grouped quick-search across documents/meetings/legislation/OPRA/notices/licenses |
