# ClerkOS — System & Security Architecture

## 1. Deployment model

```
Municipal network (LAN / VPN only — no inbound internet)
┌─────────────────────────────────────────────────────────────────┐
│  Staff workstations ──HTTPS──▶ https://clerkos.local            │
│                                                                 │
│  Municipal server / VM (Windows Server w/ Docker, or Linux)     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Docker Compose                                            │  │
│  │  nginx:443 ── TLS (internal CA) ── security headers       │  │
│  │    ├── /            React SPA (static)                    │  │
│  │    └── /api/        gunicorn ── Django + DRF              │  │
│  │            ├── PostgreSQL 16   (volume: pgdata)           │  │
│  │            ├── Redis 7         (broker)                   │  │
│  │            ├── Celery worker   (deadlines, backups)       │  │
│  │            ├── Celery beat     (schedule)                 │  │
│  │            └── documents vol   (encrypted at OS layer)    │  │
│  │  [optional] MinIO — local S3-compatible object store      │  │
│  └───────────────────────────────────────────────────────────┘  │
│  Backups volume ──▶ nightly pg_dump + checksums ──▶ NAS/tape    │
└─────────────────────────────────────────────────────────────────┘
```

- **Access**: browser only, via internal DNS `clerkos.local` (or municipal choice).
  VPN required off-site. No component phones home; the stack runs with the WAN cable
  unplugged.
- **Network assumptions**: the host sits in a server VLAN; firewall allows 443 from
  staff VLAN/VPN only; 5432/6379 are never exposed off the Docker network.
- **OS support**: any Docker host — Ubuntu LTS/RHEL, or Windows Server 2019+ with
  Docker Desktop/WSL2 or a Linux VM under Hyper-V.

## 2. Stack rationale

**Django over NestJS** — this is a records-integrity system, not a real-time app.
Django brings a hardened authentication/session/CSRF layer, a migration-safe ORM,
`django.contrib.admin` as a break-glass tool, first-class PostgreSQL support, and a
15+-year security track record. Python is also the easiest language for municipal IT
to maintain. Celery covers scheduled jobs. DRF gives a clean, versioned REST surface.

**React + Vite over Vue** — larger component ecosystem, easiest hiring pool, and the
dashboard-heavy UI (steppers, Gantt, maps) benefits from React's composition model.
The SPA compiles to static files; no Node process runs in production.

**PostgreSQL-first search** — `icontains` + indexed filters now; `tsvector` columns
are a migration away; OpenSearch only if a municipality's corpus demands it.

**Polling over WebSockets** — on a LAN, 30–60 s polling for health/notifications is
simple, proxy-friendly, and removes a stateful layer. WebSockets (Django Channels)
can be added later for live lock indicators.

## 3. Backend layout

```
backend/
├── clerkos/            settings (env-driven), api_urls (all routes), celery
└── apps/
    ├── accounts/       User, Role, Permission, Department, UserSession, LoginEvent
    │                   permissions_catalog.py = RBAC source of truth
    ├── audit/          AuditLog (hash chain), middleware, log_event(), verify cmd
    ├── core/           api.py (RBAC + audited viewset bases), dashboard, search,
    │                   health, SystemSetting, seed command
    ├── records/        Document/Version/Access, categories, retention, holds,
    │                   locking.py (LockableMixin)
    ├── meetings/       Meeting, AgendaItem, Vote, Minutes
    ├── legislation/    Ordinance, Resolution (shared abstract lifecycle)
    ├── opra/           OPRARequest, OPRAAssignment, OPRAResponse
    ├── notices/        PublicNotice
    ├── licensing/      License, LicenseApplication
    ├── boards/         Board, BoardSeat, Appointment
    ├── workflow/       Task, Notification, Correspondence, deadline sweep
    └── compliance/     ComplianceControl/Evidence, RiskRegisterItem, BackupJob
```

Cross-cutting mechanics:

- **`AuditedModelViewSet`** (core/api.py): every ViewSet inherits RBAC enforcement
  (`rbac` map: action → permission code) and automatic before/after audit logging
  on create/update/delete.
- **`LockableMixin`** (records/locking.py): adds `lock/unlock/lock_status` actions
  and returns **HTTP 423** on edits while another user holds the lock; override
  requires `locks.override` and is logged as `lock_override`.
- **`log_event()`** (audit/services.py): one call writes a hash-chained entry with
  actor, role, department, IP, and user agent pulled from middleware context.

## 4. Security architecture

| Layer | Control |
|---|---|
| Transport | TLS 1.2/1.3 only at Nginx; HSTS; HTTP → HTTPS redirect; internal CA cert distributed by Group Policy |
| Session | HttpOnly + Secure + SameSite=Lax cookies; sliding 30-min inactivity timeout; server-side session revocation; active-session registry |
| Authentication | Local credentials; per-user lockout (5 fails → 15 min, configurable); temporary-access expiry; forced password change; MFA-ready fields (TOTP secret) |
| Passwords | 12-char minimum + common-password and similarity validators (NIST 800-63B aligned); PBKDF2-SHA256 hashing |
| Authorization | Least-privilege RBAC: 27 permission codes × 12 default roles; superuser reserved for break-glass |
| CSRF/XSS/SQLi | Django CSRF middleware on all mutating routes; React escaping + CSP header; ORM-only data access (no raw SQL) |
| Uploads | Extension allow-list, size cap, SHA-256 checksum, unguessable storage paths outside webroot, optional ClamAV command hook, authenticated download endpoint only |
| At rest | Host volume encryption (LUKS/BitLocker/VM-level); documents volume separate from OS |
| Audit | Append-only hash-chained log; CSV export; CLI + API chain verification |
| Records governance | Legal holds block deletion at the API layer; destruction additionally requires `retention.approve_destruction`; permanent-archive flag is undeletable |
| Admin actions | All admin panel operations produce `admin_action` / `permission_change` audit events with before/after |
| Emergency access | `admin` superuser with documented break-glass procedure (docs/09 §7); every superuser action still audited |
| Backups | Nightly `pg_dump` (checksummed) + document archive script; restore-test verification recorded as compliance evidence |

### Threat notes

- **Insider modification of records** → versioning + checksums + chain-of-custody +
  audit before/after values.
- **Log tampering** → hash chain: editing or deleting any entry breaks verification
  from that point forward; export copies support off-system retention.
- **Credential stuffing/brute force** → lockout + failed-login dashboard alerts +
  LoginEvent trail with IP/user agent.
- **Session theft on LAN** → TLS everywhere, HttpOnly cookies, short sliding timeout,
  admin revocation.
- **Ransomware on the host** → off-machine backup copies (script → NAS/tape),
  documented RTO/RPO (docs/09).

## 5. Data flows worth knowing

1. **Login** → lockout check → authenticate → session row + LoginEvent + audit
   (`login`/`login_failed`) → sliding timeout per request via middleware.
2. **Document upload** → allow-list/size validation → SHA-256 → AV hook →
   DocumentVersion + DocumentAccess(upload) + audit(upload) → duplicate report by
   checksum.
3. **OPRA intake** → due date auto-computed (7 business days) → assignment fan-out →
   hourly Celery sweep raises escalating notifications at ≤2 days and overdue.
4. **Backup** → Celery beat 01:30 → `pg_dump -Fc` → checksum → BackupJob row
   (success **or failure**, with critical notifications to superusers on failure) →
   admin marks restore-tested after a drill.
