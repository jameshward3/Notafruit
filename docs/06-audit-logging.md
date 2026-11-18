# ClerkOS — Audit Logging Specification

## Goals

1. Every security-relevant and record-relevant action is attributable to a user,
   time, and network origin, with before/after values.
2. The log is **append-only and tamper-evident**: modification or deletion of any
   entry is detectable.
3. The log is **searchable** by the people who need it (clerk, auditor) and
   **exportable** as evidence.

## Entry contents

Each `AuditLog` row: `event_id` (UUID) · timestamp · actor FK + denormalized
username/role(s)/department (survives account changes) · IP address · device/browser
(user agent) · action type · module · affected object (type, id, repr) ·
`before`/`after` JSON (changed fields only on updates) · success flag · severity
(info/notice/warning/critical) · reason/comment · retention category · `prev_hash` ·
`entry_hash`.

## Event taxonomy → requirement coverage

| Requirement category | Implementation |
|---|---|
| Authentication / failed logins / sessions | `login`, `login_failed`, `logout` + `LoginEvent` table + `UserSession` registry; lockouts logged as `security`/critical |
| Document access / edit / upload / download / delete | `view`/`update`/`upload`/`download`/`delete` in module `records` + `DocumentAccess` chain-of-custody rows |
| OPRA / meetings / agendas / legislation / notices / licenses / boards | automatic `create`/`update`/`delete` with diffs via `AuditedModelViewSet`; workflow actions (assign/extend/close/approve/record_votes/generate_packet) logged with reasons |
| Admin actions / permission changes | `admin_action`, `permission_change` (role permission diffs before/after) |
| Locks and overrides | `lock`, `unlock`, `lock_override` (warning), blocked-edit attempts (`security`) |
| Backups / restores | `backup`, `restore` + `BackupJob` rows (success and failure) |
| Redaction / exports | `redact`, `export` (log exports and evidence packages are themselves audited) |
| Security alerts | `security` action at warning/critical severity feeds the dashboard alert panel |

## Tamper evidence (hash chain)

```
entry_hash(n) = SHA-256( canonical_json(entry n core fields) )
canonical fields include prev_hash(n) = entry_hash(n-1);  entry 1 uses "genesis"
```

- Rows are written through `AuditLog.append()` inside a transaction
  (`SELECT … FOR UPDATE` on the tail under PostgreSQL) so the chain never forks.
- Application code has no update/delete path for audit rows.
- **Verification**: `manage.py verify_audit_chain` (exit 1 on break) and
  `GET /audit-logs/verify/` (button in the Audit Logs UI). Editing any hashed field
  or removing a row breaks every verification from that point forward.
- Defense in depth for a DBA-level adversary: schedule periodic CSV exports off-box
  (the export includes `entry_hash`, so an offline copy pins the chain), and
  restrict the app's database account from `DELETE` on the audit table at the
  PostgreSQL grant level in hardened installs (see the clerkos-db repo).

## Search & export

UI filters: date range, user, department, action, module, severity, record type,
IP address, free text. CSV export respects active filters, caps at 50k rows,
requires `logs.export`, and generates its own `export` event.

## Retention

Audit entries default to `retention_category="audit-standard"`. Recommended policy:
retain online ≥ 3 years, archive exports with the municipality's records retention
schedule; entries related to litigation follow the legal hold.
