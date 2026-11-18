# ClerkOS — Municipal Clerk Operations Platform

**On-premise, browser-based operations platform for a Municipal Clerk's Office.**
Runs on the municipality's own server or private VM. No public cloud dependency for
core operations. Prioritizes local control, records security, auditability, and
administrative oversight.

![Status](https://img.shields.io/badge/status-MVP-blue) ![License](https://img.shields.io/badge/deployment-on--premise-navy)

## What it manages

Official records vault · Meetings, agendas & packets · Ordinances & resolutions ·
OPRA/public-records requests · Public notices · Licenses · Boards & appointments ·
Correspondence · Tasks & notifications · Retention & legal holds · Tamper-evident
audit logs · User/role administration · SOC 2 / ISO 27001 **readiness** tracking.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | **Django 4.2 LTS + Django REST Framework** | Batteries-included auth/sessions/CSRF, mature ORM + migrations, hardened by two decades of production use — the lowest-risk foundation for a government records system |
| Frontend | **React 18 + Vite + TypeScript** | Modern, componentized dashboard UI; builds to static files served by Nginx on the LAN |
| Database | **PostgreSQL 16** | Transactional integrity, full-text search built in, `pg_dump` backups |
| Jobs | **Celery + Redis** | Deadline sweeps, nightly backups, notifications — all local |
| Storage | Encrypted local volume (LUKS/BitLocker) or optional **MinIO** | Records never leave the building |
| Proxy | **Nginx** with internal TLS | `https://clerkos.local`, HSTS, security headers |
| Deploy | **Docker Compose** | One-command install on Windows Server (WSL2/Hyper-V) or Linux |

> The database schema is also maintained as a standalone source-of-truth repo,
> **clerkos-db** (PostgreSQL migrations, roles, reporting views, backup/restore).

## Quick start (evaluation)

```bash
cp .env.example .env            # edit CLERKOS_SECRET_KEY and POSTGRES_PASSWORD
make certs                      # self-signed TLS for clerkos.local
make up                         # build + start the full stack
make demo                       # load sample municipal data
# add "127.0.0.1 clerkos.local" to your hosts file, then open https://clerkos.local
```

Local development without Docker:

```bash
make backend-dev                # Django API on :8000 (SQLite, demo data)
make frontend-dev               # Vite dev server on :5173, proxies /api
```

## Seed users

All seeded accounts use the password in `CLERKOS_SEED_PASSWORD`
(default `ChangeMe!2026`) and **must change it at first sign-in**.

| Username | Role | Purpose |
|---|---|---|
| `admin` | Super Admin | Emergency/IT administration |
| `lmitchell` | Municipal Clerk | Full clerk operations + user management |
| `dcarter` | Deputy Clerk | Clerk operations |
| `janderson` | Clerk Staff | Day-to-day processing |
| `mpatel` | Records Custodian | Vault, retention, legal holds |
| `srivera` | Department Contributor | Department submissions |
| `tbrown` | Department Head | Departmental OPRA responses |
| `kwalsh` | Legal Counsel | Legal review, redaction, holds |
| `councilview` | Council Member View-Only | Read-only access |
| `auditor` | Auditor View-Only | Logs + compliance center, read-only |

## Documentation

| Doc | Contents |
|---|---|
| [docs/01-product-requirements.md](docs/01-product-requirements.md) | PRD: vision, modules, MVP scope, future features |
| [docs/02-architecture.md](docs/02-architecture.md) | System + security architecture, deployment model |
| [docs/03-database-schema.md](docs/03-database-schema.md) | Data model reference |
| [docs/04-api-specification.md](docs/04-api-specification.md) | REST API reference |
| [docs/05-rbac-matrix.md](docs/05-rbac-matrix.md) | Permission catalog and role matrix |
| [docs/06-audit-logging.md](docs/06-audit-logging.md) | Tamper-evident audit trail specification |
| [docs/07-frontend-spec.md](docs/07-frontend-spec.md) | Page map, admin panel spec, UI components, dashboard |
| [docs/08-compliance-readiness.md](docs/08-compliance-readiness.md) | SOC 2 / ISO 27001 readiness checklist |
| [docs/09-deployment-guide.md](docs/09-deployment-guide.md) | Install, hardening, backup & disaster recovery |
| [docs/10-testing-plan.md](docs/10-testing-plan.md) | Test strategy and current coverage |
| [docs/11-roadmap.md](docs/11-roadmap.md) | MVP + future roadmap, developer task breakdown |

## Public platform (prototype)

`platform/` contains a separate Next.js + Payload + PostGIS public website and editorial CMS for the City of Orange
Township. It does not modify ClerkOS. See [platform/README.md](platform/README.md) and
[platform/BUILD_STATUS.md](platform/BUILD_STATUS.md).

## Repository layout

```
ClerkOS/
├── backend/            Django project (apps/: accounts, audit, records, meetings,
│                       legislation, opra, notices, licensing, boards, workflow,
│                       compliance, core)
├── frontend/           React + Vite + TypeScript SPA
├── deploy/             Nginx config, TLS + backup/restore scripts
├── docs/               Full specification set
├── platform/           Public platform prototype (Next.js + Payload + PostGIS)
├── docker-compose.yml  On-prem deployment
└── Makefile            Operator shortcuts
```

## Security posture (summary)

HTTPS-only via internal CA · session auth with sliding 30-min timeout · account
lockout (5 attempts / 15 min) · 12-char minimum passwords (NIST-aligned) · MFA-ready
user model · least-privilege RBAC (27 permissions × 12 roles) · hash-chained
append-only audit log with CLI + API verification · upload allow-list + optional
ClamAV hook · legal-hold deletion protection · encrypted volumes at rest ·
nightly `pg_dump` with checksums and restore-test tracking.

> ClerkOS is designed to **support** SOC 2 and ISO 27001 readiness. It does not,
> by itself, make an organization certified or compliant.
