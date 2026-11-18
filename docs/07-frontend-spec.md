# ClerkOS — Frontend Specification

React 18 + TypeScript + Vite SPA. Styling via a single design-token stylesheet
(`src/theme.css`) — no CSS framework dependency, no external fonts/CDNs (on-prem
constraint: everything is served from the municipal server).

## Design language (matches the approved mockup)

- **Palette**: off-white app background `#f5f7fa`; white cards; navy/charcoal text
  `#1c2b3a`; muted blue primary `#2563eb`; **gold** `#b7791f` for official municipal
  actions (adopted legislation); green `#16a34a` complete/on-track; red `#dc2626`
  deadline risk; amber `#d97706` warnings. All muted, no saturated brights.
- **Surfaces**: 12px radius cards, soft shadows, 1px `#e5eaf1` borders, spacious
  padding, collapsible density via tabs/filters/drawers.
- **Status badges everywhere**: one shared `<StatusBadge>` maps every workflow
  status to a tone (see `src/components/ui.tsx`) so color semantics stay consistent.

## Application shell

- **Left sidebar** (248px): ClerkOS wordmark; primary nav (Dashboard, Records Vault,
  Meetings, Agendas & Packets, Ordinances, Resolutions, OPRA Requests, Public Notices,
  Licenses, Boards & Appointments, Correspondence, Tasks, Reports) and an
  **Administration** section (Audit Logs, User Management, Admin Panel, Compliance
  Center, System Health, Settings). Active item = soft blue pill.
- **Top bar**: global quick search (250 ms debounce → `/search/`, grouped dropdown) ·
  server status pill (green/red from `/system/health/` polled every 60 s) ·
  notification bell with unread badge · user identity chip · sign out.

## Page map

| Route | Page | Contents |
|---|---|---|
| `/login` | Sign in | Card on gradient; failure/lockout messaging |
| `/` | **Command Center dashboard** | metric cards, legislation stepper, work queue tabs, lifecycle map, alerts, mini calendar, active users, compliance snapshot, recent audit |
| `/records`…`/tasks` | Module lists | one config-driven `ListPage` (columns, endpoint, filters, search, pagination) |
| `/audit-logs` | Audit Logs | full filter bar, expandable rows (event id, role, before/after diff, hash), Verify Chain button, CSV export |
| `/users` | User Management | accounts table; Create User modal, reset password, unlock, revoke sessions, deactivate/reactivate |
| `/admin` `/settings` | **Admin Panel** | tabs: Active Sessions · Roles & Permissions matrix · Departments · Backups · Legal Holds · Retention Rules · System Settings |
| `/compliance` `/reports` | Compliance Center | per-framework readiness cards, control register, risk register, evidence export |
| `/system-health` | System Health | app/database/backup/time metric cards (30 s poll), recent failed logins |

All module list pages share one config-driven `ListPage` component — adding a module
view is a config entry, not a new page.

## Component inventory

`AppShell` · `Panel` · `Metric` · `StatusBadge` · `MiniCalendar` · stepper (CSS) ·
`ListPage` · modal · `Spinner` · date formatters. Auth: `AuthProvider` context
exposes `user` and `can(permission)` for permission-aware rendering; API client
handles CSRF and 401/403/423 mapping.

## UX rules

- Administrative actions surface the audited consequence ("Every action here is audited").
- 403 responses render an inline explanation naming the missing permission — never a blank screen.
- 423 lock responses surface "currently being edited by {name}".
- Every list keeps result counts visible; pagination never exceeds 25 rows.
