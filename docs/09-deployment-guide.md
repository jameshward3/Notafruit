# ClerkOS — Deployment Guide, Backup & Disaster Recovery

## 1. Requirements

| Item | Minimum | Recommended |
|---|---|---|
| Host | 4 vCPU / 8 GB RAM / 100 GB | 8 vCPU / 16 GB / 500 GB (SSD) |
| OS | Ubuntu 22.04+/RHEL 9, or Windows Server 2019+ with Docker (WSL2/Hyper-V VM) | Linux VM on the municipal hypervisor |
| Disk | — | OS volume + **encrypted** data volume (LUKS/BitLocker/vSAN encryption) |
| Network | Internal DNS entry `clerkos.local` → server; 443 open from staff VLAN/VPN | Dedicated server VLAN; deny-all default |
| Software | Docker Engine + Compose v2 | + monitoring agent pointed at `/api/v1/system/health/` |

No inbound internet access is required. Outbound access is only needed during
initial image build/pull; images can be pre-pulled for air-gapped installs
(`docker save`/`docker load`).

## 2. Install

```bash
git clone <your-mirror>/ClerkOS && cd ClerkOS
cp .env.example .env
# EDIT .env:
#   CLERKOS_SECRET_KEY  → python3 -c "import secrets; print(secrets.token_urlsafe(50))"
#   POSTGRES_PASSWORD   → strong unique value
#   CLERKOS_ALLOWED_HOSTS / CLERKOS_CSRF_TRUSTED_ORIGINS → your internal hostname
bash deploy/scripts/generate-certs.sh     # or drop municipal-CA cert into deploy/certs/
docker compose up -d --build
docker compose exec backend python manage.py seed          # roles/permissions/users
# optional evaluation data: ... manage.py seed --demo-data
```

Point internal DNS (or workstation hosts files) at the server, then open
`https://clerkos.local`. Sign in as `admin`, change the password immediately,
then create real staff accounts and deactivate unused seed users.

### Post-install hardening checklist

- [ ] Change every seeded password; deactivate unused seed accounts.
- [ ] Confirm data volumes live on the encrypted disk (`docker volume inspect`).
- [ ] Firewall: allow 443 (and 80 redirect) from staff networks only; block all else.
- [ ] Replace self-signed cert with a municipal-CA-issued cert.
- [ ] Set `CLERKOS_EMAIL_BACKEND=…smtp.EmailBackend` and point at the internal relay.
- [ ] Configure ClamAV and set `CLERKOS_ANTIVIRUS_COMMAND=clamdscan --no-summary {path}`.
- [ ] Schedule `deploy/scripts/backup.sh` (cron/Task Scheduler) to an off-machine target.
- [ ] Verify `https://clerkos.local/api/v1/system/health/` from a workstation.
- [ ] Record the deployment in the Compliance Center (change management evidence).

## 3. Operations

| Task | Command |
|---|---|
| Logs | `docker compose logs -f backend nginx worker` |
| Update | `git pull && docker compose up -d --build` (migrations run on start) |
| Audit chain check | `make verify-audit` |
| Manual backup | `make backup` |
| Health | `GET /api/v1/system/health/` (public, JSON) |

## 4. Backup plan

| What | How | When | Where |
|---|---|---|---|
| Database | In-app Celery `pg_dump -Fc` + SHA-256, recorded as BackupJob (success/failure alerting) | Nightly 01:30 | `backups` volume |
| Database + documents | `deploy/scripts/backup.sh` (dump + tar + checksums) | Nightly/weekly via cron | **Off-machine**: NAS, tape, or encrypted removable media |
| Config | `.env`, `deploy/certs/` | On change | Municipal secrets store |

Retention recommendation: 7 daily, 4 weekly, 12 monthly. Backups inherit volume
encryption; removable media must itself be encrypted.

## 5. Disaster recovery

**Objectives (single-server baseline): RPO ≤ 24 h (nightly backups), RTO ≤ 4 h.**

1. Provision replacement host (or restore VM snapshot); install Docker.
2. Restore repo/config: clone + copy preserved `.env` and certs.
3. `docker compose up -d --build` (schema migrates on an empty DB).
4. `bash deploy/scripts/restore.sh <db.dump> <documents.tar.gz>` — verifies checksums first.
5. `docker compose exec backend python manage.py verify_audit_chain`.
6. Smoke test: login, open dashboard, download a known document.
7. Record the restore in the Compliance Center; mark the BackupJob verified.

**Drills**: run steps 3–7 against a scratch VM monthly. The `verified` flag on
BackupJob rows is the evidence trail.

## 6. Failure modes

| Scenario | Behavior | Response |
|---|---|---|
| Internet outage | No impact — fully LAN-operational | none |
| Backend crash | Docker `restart: unless-stopped`; Nginx 502 until healthy | check `docker compose logs backend` |
| DB down | `/system/health/` reports degraded; dashboard shows red server pill | restart db; restore if corrupted |
| Backup failure | BackupJob=failed + critical notification to superusers | investigate same day; run manual backup |
| Disk full | uploads fail with 400s; health remains up | expand volume; prune old backups per retention |

## 7. Emergency (break-glass) access

If all admin users are locked out: console access to the host →
`docker compose exec backend python manage.py shell` (ORM reset), or
`manage.py changepassword admin`. This path requires host login (OS-level audit)
and every subsequent in-app action is still recorded in the audit trail. Document
each use as a security incident in the Compliance Center.
