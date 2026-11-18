# ClerkOS — Product Requirements Document

## 1. Vision

ClerkOS is an internal operations platform for a Municipal Clerk's Office: a single,
calm, modern command center for official records, meetings, legislation, public
records requests, notices, licenses, and board appointments — with the security,
auditability, and local control a government office requires.

It replaces the mix of shared drives, spreadsheets, paper logs, and aging desktop
databases that most clerk's offices run on today, without moving any record to a
public cloud.

**Design north star:** a high-end operations dashboard (see the interface mockup) —
left sidebar navigation, metric cards, timeline/stepper visualizations, work queues,
and status badges — not a legacy government database screen.

## 2. Users and roles

| Persona | Needs |
|---|---|
| Municipal Clerk | Full oversight: deadlines, packets, legislation lifecycle, sign-off |
| Deputy Clerk / Clerk Staff | Day-to-day processing, agenda building, intake |
| Records Custodian | Vault management, retention, legal holds, chain of custody |
| Department heads/contributors | Submit agenda items, answer OPRA assignments |
| Legal Counsel | Legal review, redactions, holds |
| Council / Mayor / BA | Read-only situational awareness |
| Auditor | Read-only logs and compliance evidence |
| IT / Super Admin | Users, sessions, policy, backups, system health |

## 3. Functional requirements by module

### 3.1 Dashboard (Command Center)
- Top metric cards: active users, open OPRA requests (+risk), upcoming meetings,
  active legislation, backup status.
- Legislation workflow stepper for the featured ordinance (Draft → Introduced →
  Public Hearing → Adopted → Published → Effective).
- Work queue with priority tabs (All/Urgent/High/Medium/Low).
- Records lifecycle map: Meeting → Agenda Item → Ordinance → Public Notice → Adopted Record.
- Alerts & system health panel (failed logins, OPRA risk, backup state, compliance readiness).
- Upcoming meetings mini-calendar + list.
- Active users panel; work queue by department; compliance snapshot;
  recent audit events table.
- Global quick search across all record types (top bar).

### 3.2 Records Vault
Folder/category tree, metadata + tags, versioned uploads with SHA-256 checksums and
duplicate detection, classification (public/internal/confidential/restricted),
retention rules + review queue, legal holds (block deletion), permanent-archive flag,
chain-of-custody log, related-record linking, authenticated download only,
upload type allow-list + AV hook, redaction workflow (redacted versions),
bulk import/export (CLI + API).

### 3.3 Meetings, Agendas & Packets
Meeting calendar and lifecycle (scheduled → agenda open → packet ready → completed →
minutes → archived), agenda item submission with department routing and legal review,
packet manifest generation, attendance, motions/seconds, roll-call votes
(yes/no/abstain/recuse/absent), minutes drafting and approval, video link,
public packet export.

### 3.4 Ordinances & Resolutions
Numbering, sponsors, department, full status lifecycle (Draft, Under Review, Ready
for Agenda, Introduced, Public Hearing Scheduled, Adopted, Failed, Tabled, Withdrawn,
Published, Archived), key dates (introduced/hearing/adoption/effective/publication),
legal review state, fiscal impact, amendments, links to meetings/agenda items/notices/
documents, and a visual lifecycle timeline per item.

### 3.5 OPRA Requests
Intake with requestor profile (anonymous allowed), automatic statutory due date
(7 business days, editable), department assignments with internal due dates,
extensions with reasons, responses (documents, extension, clarification, denial,
partial denial, closing letter), denial basis citations, fee tracking, exportable
request file (JSON), deadline board (overdue / due soon / on track), performance
reporting.

### 3.6 Public Notices
Categories (meeting, ordinance, hearing, bid, election, legal ad), required
publication date with alerts, newspaper/vendor, proof-of-publication upload,
links to related legislation/meetings, archive export.

### 3.7 Licenses
Applications and issued licenses, fee tracking, renewals and expiration alerts,
suspension/revocation history, certificate document link.

### 3.8 Boards & Appointments
Boards/commissions/committees, seats with terms and appointing authority,
appointments with council approval, vacancy detection, expiring-term reminders,
Gantt-style terms timeline, public directory export.

### 3.9 Multi-user operation
Simultaneous browser users on LAN/VPN; session tracking with active-user list;
pessimistic record locks ("currently editing by …") with 30-minute expiry,
read-only viewing while locked, authorized override (audited); polling-based
freshness (dashboard 45 s, health 60 s); notifications in-app with email hooks.

### 3.10 User management & Admin panel
Create/edit/deactivate (never hard-delete) users; roles and permission matrix;
departments; password reset + forced change; session revocation; lockout rules;
temporary access expiry; MFA-ready model; login policy via environment;
backup history with restore-test verification; legal hold and retention rule
administration; system settings; maintenance via CLI.

### 3.11 Audit & Compliance
Hash-chained append-only audit log (see docs/06); searchable and exportable (CSV);
compliance control register (SOC 2 Security/Availability/Confidentiality, ISO 27001)
with owners, status, evidence records, and readiness score; risk register with
scored likelihood×impact; evidence export package (JSON).

## 4. Non-functional requirements

| Category | Requirement |
|---|---|
| Deployment | Docker Compose on municipal server/VM; Windows Server or Linux; no public-cloud dependency for core operations |
| Access | Browser via `https://clerkos.local` on LAN or VPN only |
| Security | See docs/02 §Security architecture |
| Availability | Single-node target 99.5%; restart-resilient; offline-tolerant (LAN-only operation) |
| Performance | Dashboard < 1 s at 50k records; lists paginated at 25 |
| Usability | Non-technical staff; consistent status badges; no training-heavy workflows |
| Auditability | Every create/update/delete/download/login/admin action logged with before/after |
| Records governance | Retention schedules, legal holds, chain of custody, classification |

## 5. MVP scope (implemented in this repository)

Local deployment (Compose), login/lockout/session tracking, admin panel, user/role
management with full RBAC, records vault (versions, checksums, holds, custody),
audit logs (hash-chained, searchable, exportable, verifiable), meetings/agendas/
votes/minutes, ordinance/resolution tracking with lifecycle timeline, OPRA tracking
with deadline board, public notices, licenses, boards/appointments with vacancy and
expiry views, tasks/notifications with deadline sweep, compliance center with
readiness scoring and backup history, Command Center dashboard, seed data.

## 6. Out of MVP scope (future roadmap — see docs/11)

Active Directory/LDAP SSO, public resident transparency portal, e-signatures,
OCR/full-text extraction of scanned PDFs, automated redaction assistance, meeting
video indexing, AI-assisted minutes drafting, public subscription alerts,
inter-municipal shared services, multi-tenant SaaS edition.

## 7. Success metrics

- 100% of OPRA requests carry a tracked statutory deadline; zero silent misses.
- Packet assembly time reduced ≥ 50% vs. manual process.
- Every record change attributable to a user within 5 seconds of search.
- Quarterly access review completed from the system in under 1 hour.
- Restore test executed and recorded at least monthly.
