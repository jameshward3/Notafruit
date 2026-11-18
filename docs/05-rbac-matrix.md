# ClerkOS — RBAC Permission Matrix

Source of truth: `backend/apps/accounts/permissions_catalog.py` (seeded into the
`Permission`/`Role` tables). Roles are editable in the Admin Panel; **every role or
permission change writes a `permission_change` audit event with before/after
permission lists.** Superuser (`admin`) bypasses RBAC and is reserved for
break-glass use — all superuser actions are still audited.

## Permission catalog (27)

| Code | Grants |
|---|---|
| records.view | Read records/meetings/legislation/OPRA/notices/licenses/boards |
| records.create / records.edit / records.delete | Vault + module writes (delete gated further, see below) |
| records.approve | Approve minutes/records |
| records.publish | Publish records to public exports |
| documents.upload / documents.download / documents.redact | File operations (each individually audited + custody logged) |
| opra.manage | OPRA intake, assignment, extension, closure, export |
| meetings.manage / agendas.manage | Meetings lifecycle; agenda items + packet generation |
| ordinances.manage / resolutions.manage | Legislative lifecycle |
| notices.manage / licenses.manage / boards.manage | Module management |
| users.manage | Users, roles, departments, sessions |
| logs.view / logs.export | Audit trail read / CSV export |
| system.configure | Settings, categories, retention rules, backup admin |
| retention.approve_destruction | Required *in addition to* records.delete to destroy a document |
| locks.override | Take over another user's record lock |
| legalhold.place / legalhold.remove | Litigation hold control |
| public.export | Public records exports, board directory |
| compliance.access | Compliance Center, evidence, risk register, backup history |

## Role × permission matrix

✔ = granted. **SA**=Super Admin, **MC**=Municipal Clerk, **DC**=Deputy Clerk,
**CS**=Clerk Staff, **RC**=Records Custodian, **DH**=Dept Head, **DCo**=Dept
Contributor, **LC**=Legal Counsel, **CM**=Council View-Only, **MB**=Mayor/BA
View-Only, **PP**=Public Portal Publisher, **AU**=Auditor View-Only.

| Permission | SA | MC | DC | CS | RC | DH | DCo | LC | CM | MB | PP | AU |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| records.view | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| documents.download | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| records.create | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | | | | | |
| records.edit | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | | | | | |
| documents.upload | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | | | | | |
| records.delete | ✔ | ✔ | | | | | | | | | | |
| records.approve | ✔ | ✔ | ✔ | | | ✔ | | ✔ | | | | |
| records.publish | ✔ | ✔ | ✔ | | | | | | | | ✔ | |
| documents.redact | ✔ | ✔ | ✔ | | ✔ | | | ✔ | | | | |
| opra.manage | ✔ | ✔ | ✔ | | | ✔ | | | | | | |
| meetings.manage | ✔ | ✔ | ✔ | ✔ | | | | | | | | |
| agendas.manage | ✔ | ✔ | ✔ | ✔ | | | | | | | | |
| ordinances.manage | ✔ | ✔ | ✔ | | | | | | | | | |
| resolutions.manage | ✔ | ✔ | ✔ | | | | | | | | | |
| notices.manage | ✔ | ✔ | ✔ | ✔ | | | | | | | | |
| licenses.manage | ✔ | ✔ | ✔ | ✔ | | | | | | | | |
| boards.manage | ✔ | ✔ | ✔ | | | | | | | | | |
| users.manage | ✔ | ✔ | | | | | | | | | | |
| logs.view | ✔ | ✔ | ✔ | | | | | | | | | ✔ |
| logs.export | ✔ | ✔ | | | | | | | | | | ✔ |
| system.configure | ✔ | | | | | | | | | | | |
| retention.approve_destruction | ✔ | ✔ | | | ✔ | | | | | | | |
| locks.override | ✔ | ✔ | ✔ | | | | | | | | | |
| legalhold.place | ✔ | ✔ | | | ✔ | | | ✔ | | | | |
| legalhold.remove | ✔ | ✔ | | | | | | ✔ | | | | |
| public.export | ✔ | ✔ | ✔ | | ✔ | | | | | | ✔ | |
| compliance.access | ✔ | ✔ | ✔ | | | | | | | ✔ | | ✔ |

## Enforcement model

- Every ViewSet declares an `rbac` map (`view/create/edit/delete/<custom-action>` →
  permission code). `HasRBACPermission` checks the requester's role-derived
  permission set on each request; unauthenticated → 401/403, unauthorized → 403.
- Defense in depth beyond the matrix:
  - Document destruction = `records.delete` **and** `retention.approve_destruction`,
    **and** the record must not be under an active legal hold or permanent-archive.
  - Lock override = `locks.override` and produces a `lock_override` (warning) event.
  - Deleting a user is impossible; deactivation preserves audit attribution.
  - System roles cannot be deleted.
- Access reviews: the Users list and the role permission matrix are exportable views
  for quarterly reviews; the audit log filters on `action=permission_change`.
