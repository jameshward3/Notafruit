# ClerkOS — SOC 2 / ISO 27001 Readiness Checklist

> **Positioning**: ClerkOS *supports readiness* for SOC 2 examinations and
> ISO 27001 certification by implementing technical controls and collecting
> evidence. Certification/attestation applies to the organization and requires
> policies, processes, and an independent audit — the software alone does not
> confer it. This language appears in the product UI.

## How the Compliance Center works

- **Control register**: controls per framework (SOC 2 Security / Availability /
  Confidentiality, ISO 27001 Annex A) with owner, status, review dates.
- **Evidence records**: attach documents/exports to controls with coverage periods.
- **Readiness score**: implemented ÷ applicable controls, per framework and overall.
- **Risk register**: likelihood × impact scoring, treatment plans, owners, reviews.
- **Evidence package export**: one JSON bundle of controls + evidence (audited).

## Control mapping — what the platform already provides

| Control area (SOC 2 / ISO 27001) | ClerkOS capability | Evidence source |
|---|---|---|
| Logical access (CC6.1 / A.5.15) | RBAC matrix, least-privilege roles | Role matrix view, `permission_change` events |
| Provisioning & deprovisioning (CC6.2 / A.5.16) | Admin-only user lifecycle, deactivation, temp access expiry | Users list export, `admin_action` |
| Authentication (CC6.1 / A.5.17) | Password policy (12+, NIST-aligned), lockout, forced rotation, MFA-ready | Settings + `LoginEvent` |
| Access reviews (CC6.3 / A.5.18) | Users + roles + last-login report; audit filter on permission changes | User access review report |
| Security event logging (CC7.2 / A.8.15) | Hash-chained audit trail, failed-login alerts, severity levels | Audit export, chain verification |
| Log protection (CC7.2 / A.8.15) | Append-only + hash chain + off-box CSV export | `verify_audit_chain` output |
| Backup (A1.2 / A.8.13) | Nightly pg_dump w/ checksum, failure alerts, off-machine script | BackupJob history |
| Recovery testing (A1.3 / A.8.14) | Restore script + "restore-tested" verification flag | BackupJob `verified` evidence |
| Confidential data ID (C1.1 / A.5.12) | 4-level record classification, category defaults | Vault classification report |
| Confidential disposal (C1.2 / A.8.10) | Retention rules, destruction dual-permission, legal hold block | Retention queue, `delete` events |
| Encryption in transit (CC6.7 / A.8.24) | TLS 1.2/1.3-only Nginx, HSTS | Nginx config in repo |
| Encryption at rest (CC6.7 / A.8.24) | Host volume encryption (LUKS/BitLocker) — deployment requirement | Deployment guide sign-off |
| Change management (CC8.1 / A.8.32) | Versioned migrations, image tags, audited settings changes | Git history, `admin_action` |
| Incident response (CC7.3 / A.5.26) | Security-severity events feed alerts; incident log via evidence | Alert panel, evidence records |
| Session management (CC6.1) | 30-min sliding timeout, admin revocation, active-session registry | Sessions admin tab |

## Organizational checklist (outside the software — municipality must do)

- [ ] Approve and publish an information security policy; record acknowledgments.
- [ ] Enable host disk encryption on the ClerkOS server and backups target.
- [ ] Issue TLS cert from the municipal CA; distribute via Group Policy.
- [ ] Enforce VPN + firewall rules (443 from staff VLAN only).
- [ ] Run quarterly user access reviews (Users page) and record evidence.
- [ ] Run monthly restore tests; mark the BackupJob verified.
- [ ] Export audit CSV monthly to off-box storage.
- [ ] Maintain the risk register review cadence (e.g., semi-annual).
- [ ] Document the emergency (break-glass) access procedure and test it annually.
- [ ] Assign an owner to every control before an audit engagement.
