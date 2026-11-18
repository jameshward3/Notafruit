# ClerkOS — Testing Plan

## Layers

| Layer | Tooling | Scope |
|---|---|---|
| Backend unit/API | Django test runner + DRF `APIClient` (SQLite, no services) | auth, lockout, RBAC, audit chain, locking, workflows, dashboard |
| Frontend type safety | `tsc` in `npm run build` | full strict-mode compile |
| Frontend component/E2E (roadmap) | Vitest + Playwright against compose stack | login → dashboard → module CRUD → audit visibility |
| Security regression | test suite + manual checklist below | authn/z, headers, uploads |
| Ops verification | restore drill (docs/09 §5) + `verify_audit_chain` | DR readiness |

## Current automated coverage (`make test` — 11 tests, all passing)

- **Auth**: successful login returns permissions and writes session + audit trail;
  5 failed attempts lock the account (correct password rejected while locked;
  critical `security` event recorded); unauthenticated `/auth/me/` rejected.
- **RBAC**: view-only role blocked from ordinance creation (403); clerk create
  succeeds and is audited; non-admin blocked from user list; auditor can read
  logs but cannot write records.
- **Audit chain**: verification passes on real activity; deliberate tampering with
  a hashed field flips `intact=false`.
- **Locking**: second user's lock blocks the owner's edit with HTTP 423; a
  `locks.override` holder can take over (audited `lock_override`) and then edit.
- **Dashboard/health**: aggregated payload well-formed; health endpoint public.

## Manual security checklist (per release)

- [ ] HTTPS-only: port 80 redirects; HSTS present; TLS 1.0/1.1 refused.
- [ ] Session cookie flags (Secure/HttpOnly/SameSite) in production mode.
- [ ] CSRF: mutating request without token → 403.
- [ ] Upload rejects: disallowed extension, oversize file; AV hook fires when configured.
- [ ] Download of a document URL while signed out → 401/403 (no direct media paths).
- [ ] Locked account cannot authenticate until window expires or admin unlock.
- [ ] Revoked session is terminated on next request.
- [ ] Legal-held document DELETE → 403 with critical audit event.
- [ ] `verify_audit_chain` clean after the test pass.

## Acceptance scenarios (UAT with clerk staff)

1. Intake an OPRA request → auto due date → assign two departments → extend →
   attach responsive documents → close with letter → export request file.
2. Build a meeting: agenda items from two departments → legal review → generate
   packet → record roll-call votes → approve minutes.
3. Ordinance from draft → introduced → hearing (notice generated & proof uploaded)
   → adopted → published; lifecycle timeline reflects each date.
4. Upload a document twice → duplicate checksum warning; download logs custody.
5. Create a user with a role → verify permission boundaries → deactivate →
   confirm attribution still intact in audit logs.
6. Simulate 5 bad logins → dashboard security alert → admin unlocks.

## CI recommendation

GitHub Actions: job 1 `CLERKOS_DB=sqlite manage.py test`; job 2 `npm ci && npm run
build`; job 3 `docker compose build`. Block merge on any failure.
