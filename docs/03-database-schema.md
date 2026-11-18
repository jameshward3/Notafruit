# ClerkOS — Database Schema Reference

PostgreSQL 16 via the Django ORM (migrations in each app's `migrations/`).
FK = foreign key, M2M = many-to-many. All tables get `BigAutoField` PKs.

> The schema is also maintained as a standalone source-of-truth SQL repo
> (**clerkos-db**) with numbered migrations, database roles, reporting views,
> and audit triggers. This file documents the Django models the app owns.

## accounts

**User** (extends AbstractUser: username, password hash, names, email, is_active…)
plus: department FK, roles M2M, title, phone, must_change_password,
last_password_change, mfa_enabled/mfa_secret (MFA readiness),
failed_login_attempts, locked_until, temporary_access_expires, last_login_ip.

**Role**: name, description, is_system, permissions M2M → **Permission**
(code unique, label, module; seeded from `permissions_catalog.py`).

**Department**: name, code (unique), description, head FK User, is_active.

**UserSession**: user FK, session_key (unique), ip_address, user_agent, created_at,
last_activity, ended_at, is_revoked, revoked_by FK.

**LoginEvent**: user FK, username_attempted, success, failure_reason, ip_address,
user_agent, created_at.

## audit

**AuditLog** — append-only, hash-chained: event_id (uuid), created_at, actor FK +
denormalized actor_username/actor_role/department, ip_address, user_agent, action,
module, object_type/id/repr, before JSON, after JSON, success, severity, reason,
retention_category, prev_hash, entry_hash.

## records

**RetentionRule**: code, name, retention_years (null=n/a), permanent, authority_citation.
**RecordCategory**: name, slug, parent FK self, default_classification, retention_rule FK.
**LegalHold**: name, matter_reference, placed_by/at, released_by/at, is_active.
**Document**: title, category FK, department FK, owner FK, classification, status,
retention_rule FK, retention_review_date, legal_holds M2M, permanent_archive,
tags JSON, metadata JSON, related_documents M2M self.
**DocumentVersion**: document FK, version_number, file, original_filename, content_type,
size_bytes, checksum_sha256 (indexed), uploaded_by/at, note, is_redacted_version.
**DocumentAccess** (chain of custody): document FK, version FK, user FK, access_type,
ip_address, created_at.
**RecordLock**: record_type + record_id (generic), locked_by FK, locked_at, expires_at,
released_at, overridden_by FK.

## meetings

**Meeting**: title, meeting_type, body FK Board, date, start_time, location, status,
agenda_deadline, video_url, packet_document FK, attendance JSON, created_by.
**AgendaItem**: meeting FK, order, item_type, title, department FK, submitted_by FK,
status, legal_review_required/completed, attachments M2M, motion_text, moved_by,
seconded_by, result.
**Vote**: agenda_item FK, member_name, value (yes/no/abstain/recuse/absent); unique per item+member.
**Minutes**: meeting 1:1, content, status, prepared_by, approved_by/at, document FK.

## legislation

**Ordinance / Resolution** (shared abstract `LegislativeItem`): number (unique), title,
summary, sponsor, co_sponsors JSON, department FK, status (11-state lifecycle),
introduced/public_hearing/adoption/effective/publication dates, legal_review,
fiscal_impact, related_meeting FK, related_agenda_item FK, attachments M2M, amendments
JSON, created_by. Ordinance adds second_reading_date; Resolution adds consent_agenda.

## opra

**OPRARequest**: request_number (unique), requestor_* fields, description, received_date,
due_date (auto +7 business days), extended_due_date + reason, status, custodian FK,
denial_basis, fee_charged, closed_date. Properties: effective_due_date, days_remaining, is_open.
**OPRAAssignment**: request FK, department FK (unique together), assigned_to FK,
internal_due_date, status.
**OPRAResponse**: request FK, response_type, public_notes, internal_notes, documents M2M, created_by.

## notices / licensing / boards

**PublicNotice**: title, category, body, newspaper, required_publication_date,
publication_date, public_hearing_date, status, related_meeting/ordinance/resolution FKs,
proof_document FK.
**License**: license_number (unique), license_type, holder_name, contacts, issued_date,
expiration_date, status, fee_amount, fee_paid, history JSON, certificate_document FK.
**LicenseApplication**: license FK, applicant_name, license_type, submitted_date, status,
documents M2M, reviewed_by, decision_date.
**Board**: name, board_type, meeting_schedule, enabling_authority, is_active.
**BoardSeat**: board FK, seat_name (unique per board), term_length_years,
appointing_authority. Properties: current_appointment, is_vacant.
**Appointment**: seat FK, member_name/email, appointed_by, term_start, term_end, status,
council_approval_date, application_document FK. Property: days_until_expiration.

## workflow / compliance / core

**Task**: title, module, record_reference, assigned_to FK, department FK, due_date,
priority, status, created_by.
**Notification**: user FK, category, severity, title, message, link, is_read.
**Correspondence**: subject, direction, sender, recipient, date, department FK,
assigned_to FK, status, summary, documents M2M.
**ComplianceControl**: framework, control_id (unique per framework), name, owner FK,
status, last_reviewed, next_review_due.
**ComplianceEvidence**: control FK, title, document FK, period_start/end, collected_by/at.
**RiskRegisterItem**: title, category, likelihood (1–5), impact (1–5), score (=L×I),
treatment, treatment_plan, owner FK, status, review_date.
**BackupJob**: job_type, started_at, completed_at, status, size_bytes, location,
checksum_sha256, verified (restore-tested) + verified_at, log.
**SystemSetting**: key (unique), value JSON, description, updated_by/at.

## Relationship map (core chain)

```
Meeting ──< AgendaItem >── Ordinance/Resolution ──< PublicNotice
   │             │                   │                    │
   └── Minutes   └── attachments ────┴── Document (vault) ┘
OPRARequest ──< OPRAAssignment (Department) ; ──< OPRAResponse >── Document
Board ──< BoardSeat ──< Appointment
ComplianceControl ──< ComplianceEvidence >── Document
```
