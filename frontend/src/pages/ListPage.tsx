import { useEffect, useMemo, useState } from "react";
import { api, Paginated } from "../api";
import { fmtDate, Panel, Spinner, StatusBadge } from "../components/ui";

export interface ColumnDef {
  key: string;
  label: string;
  kind?: "text" | "date" | "status" | "bool";
  primary?: boolean;
}

export interface ListConfig {
  title: string;
  subtitle: string;
  icon: string;
  endpoint: string;
  columns: ColumnDef[];
  statusFilterField?: string;
  statusOptions?: string[];
  searchable?: boolean;
}

export const LIST_PAGES: Record<string, ListConfig> = {
  "/records": {
    title: "Records Vault", icon: "🗄", endpoint: "/documents/",
    subtitle: "Official municipal records — encrypted local storage, versioned, chain-of-custody logged.",
    columns: [
      { key: "title", label: "Record", primary: true },
      { key: "category_name", label: "Category" },
      { key: "department_name", label: "Department" },
      { key: "classification", label: "Classification", kind: "status" },
      { key: "status", label: "Status", kind: "status" },
      { key: "owner_name", label: "Owner" },
      { key: "updated_at", label: "Last Action", kind: "date" },
      { key: "under_legal_hold", label: "Legal Hold", kind: "bool" },
    ],
    statusFilterField: "status",
    statusOptions: ["draft", "active", "under_review", "retention_review", "archived"],
    searchable: true,
  },
  "/meetings": {
    title: "Meetings", icon: "📅", endpoint: "/meetings/",
    subtitle: "Council, board, commission, and committee meetings.",
    columns: [
      { key: "title", label: "Meeting", primary: true },
      { key: "meeting_type", label: "Type", kind: "status" },
      { key: "date", label: "Date", kind: "date" },
      { key: "location", label: "Location" },
      { key: "status", label: "Status", kind: "status" },
      { key: "agenda_item_count", label: "Agenda Items" },
      { key: "minutes_status", label: "Minutes", kind: "status" },
    ],
    statusFilterField: "status",
    statusOptions: ["scheduled", "agenda_open", "packet_ready", "completed", "archived", "cancelled"],
    searchable: true,
  },
  "/agendas": {
    title: "Agendas & Packets", icon: "📋", endpoint: "/agenda-items/",
    subtitle: "Agenda item submissions, department routing, legal review, and packet assembly.",
    columns: [
      { key: "title", label: "Item", primary: true },
      { key: "meeting_title", label: "Meeting" },
      { key: "meeting_date", label: "Meeting Date", kind: "date" },
      { key: "item_type", label: "Type", kind: "status" },
      { key: "department_name", label: "Department" },
      { key: "submitted_by_name", label: "Submitted By" },
      { key: "status", label: "Status", kind: "status" },
    ],
    statusFilterField: "status",
    statusOptions: ["submitted", "department_review", "legal_review", "approved", "on_agenda", "deferred", "withdrawn"],
    searchable: true,
  },
  "/ordinances": {
    title: "Ordinances", icon: "⚖", endpoint: "/ordinances/",
    subtitle: "Legislative lifecycle from draft through adoption, publication, and archive.",
    columns: [
      { key: "number", label: "Number", primary: true },
      { key: "title", label: "Title" },
      { key: "sponsor", label: "Sponsor" },
      { key: "department_name", label: "Department" },
      { key: "status", label: "Status", kind: "status" },
      { key: "public_hearing_date", label: "Hearing", kind: "date" },
      { key: "adoption_date", label: "Adopted", kind: "date" },
      { key: "legal_review", label: "Legal Review", kind: "status" },
    ],
    statusFilterField: "status",
    statusOptions: ["draft", "under_review", "ready_for_agenda", "introduced", "public_hearing", "adopted", "published", "archived"],
    searchable: true,
  },
  "/resolutions": {
    title: "Resolutions", icon: "✍", endpoint: "/resolutions/",
    subtitle: "Resolution tracking with consent-agenda support.",
    columns: [
      { key: "number", label: "Number", primary: true },
      { key: "title", label: "Title" },
      { key: "department_name", label: "Department" },
      { key: "status", label: "Status", kind: "status" },
      { key: "adoption_date", label: "Adopted", kind: "date" },
      { key: "legal_review", label: "Legal Review", kind: "status" },
    ],
    statusFilterField: "status",
    statusOptions: ["draft", "under_review", "ready_for_agenda", "adopted", "failed", "archived"],
    searchable: true,
  },
  "/opra": {
    title: "OPRA Requests", icon: "🔎", endpoint: "/opra-requests/",
    subtitle: "Public records requests with statutory deadline tracking and department assignment.",
    columns: [
      { key: "request_number", label: "Request #", primary: true },
      { key: "requestor_name", label: "Requestor" },
      { key: "received_date", label: "Received", kind: "date" },
      { key: "effective_due_date", label: "Due", kind: "date" },
      { key: "days_remaining", label: "Days Left" },
      { key: "status", label: "Status", kind: "status" },
      { key: "custodian_name", label: "Custodian" },
    ],
    statusFilterField: "status",
    statusOptions: ["received", "assigned", "in_progress", "extension", "fulfilled", "denied", "closed"],
    searchable: true,
  },
  "/notices": {
    title: "Public Notices", icon: "📢", endpoint: "/public-notices/",
    subtitle: "Legal notices, publication deadlines, and proof-of-publication tracking.",
    columns: [
      { key: "title", label: "Notice", primary: true },
      { key: "category", label: "Category", kind: "status" },
      { key: "newspaper", label: "Publication" },
      { key: "required_publication_date", label: "Required By", kind: "date" },
      { key: "publication_date", label: "Published", kind: "date" },
      { key: "status", label: "Status", kind: "status" },
    ],
    statusFilterField: "status",
    statusOptions: ["draft", "submitted", "published", "proof_received", "archived"],
    searchable: true,
  },
  "/licenses": {
    title: "Licenses", icon: "🪪", endpoint: "/licenses/",
    subtitle: "Clerk-issued licenses, renewals, and fee tracking.",
    columns: [
      { key: "license_number", label: "License #", primary: true },
      { key: "license_type", label: "Type" },
      { key: "holder_name", label: "Holder" },
      { key: "issued_date", label: "Issued", kind: "date" },
      { key: "expiration_date", label: "Expires", kind: "date" },
      { key: "status", label: "Status", kind: "status" },
      { key: "fee_paid", label: "Fee Paid", kind: "bool" },
    ],
    statusFilterField: "status",
    statusOptions: ["application", "active", "renewal_pending", "expired", "suspended", "revoked"],
    searchable: true,
  },
  "/boards": {
    title: "Boards & Appointments", icon: "👥", endpoint: "/appointments/",
    subtitle: "Board seats, member terms, vacancies, and reappointment tracking.",
    columns: [
      { key: "board_name", label: "Board", primary: true },
      { key: "seat_name", label: "Seat" },
      { key: "member_name", label: "Member" },
      { key: "term_start", label: "Term Start", kind: "date" },
      { key: "term_end", label: "Term End", kind: "date" },
      { key: "days_until_expiration", label: "Days Left" },
      { key: "status", label: "Status", kind: "status" },
    ],
    statusFilterField: "status",
    statusOptions: ["pending_approval", "active", "expired", "resigned", "removed"],
    searchable: true,
  },
  "/correspondence": {
    title: "Correspondence", icon: "✉", endpoint: "/correspondence/",
    subtitle: "Incoming and outgoing official correspondence.",
    columns: [
      { key: "subject", label: "Subject", primary: true },
      { key: "direction", label: "Direction", kind: "status" },
      { key: "sender", label: "From" },
      { key: "recipient", label: "To" },
      { key: "date", label: "Date", kind: "date" },
      { key: "department_name", label: "Department" },
      { key: "status", label: "Status", kind: "status" },
    ],
    statusFilterField: "status",
    statusOptions: ["received", "assigned", "in_progress", "responded", "filed"],
    searchable: true,
  },
  "/tasks": {
    title: "Tasks", icon: "☑", endpoint: "/tasks/",
    subtitle: "Assigned work across every module, with deadlines and priorities.",
    columns: [
      { key: "title", label: "Task", primary: true },
      { key: "module", label: "Module", kind: "status" },
      { key: "assigned_to_name", label: "Assigned To" },
      { key: "department_name", label: "Department" },
      { key: "due_date", label: "Due", kind: "date" },
      { key: "priority", label: "Priority", kind: "status" },
      { key: "status", label: "Status", kind: "status" },
    ],
    statusFilterField: "status",
    statusOptions: ["open", "in_progress", "blocked", "done", "cancelled"],
    searchable: true,
  },
};

export default function ListPage({ config }: { config: ListConfig }) {
  const [rows, setRows] = useState<Record<string, any>[] | null>(null);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (status && config.statusFilterField) params.set(config.statusFilterField, status);
    if (search.trim()) params.set("search", search.trim());
    return params.toString();
  }, [page, status, search, config]);

  useEffect(() => { setPage(1); }, [status, search]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api.get<Paginated<Record<string, any>>>(`${config.endpoint}?${query}`)
      .then((r) => { if (!cancelled) { setRows(r.results); setCount(r.count); } })
      .catch((e) => { if (!cancelled) { setRows([]); setError(e.status === 403 ? "You do not have permission to view this module." : e.message); } });
    return () => { cancelled = true; };
  }, [config, query]);

  function cell(row: Record<string, any>, col: ColumnDef) {
    const value = row[col.key];
    switch (col.kind) {
      case "date": return fmtDate(value);
      case "status": return <StatusBadge value={value} />;
      case "bool": return value ? <span className="badge amber">Yes</span> : <span className="badge gray">No</span>;
      default:
        if (value === null || value === undefined || value === "") return "—";
        return String(value);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / 25));

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">{config.icon} {config.title}</div>
          <div className="page-sub">{config.subtitle}</div>
        </div>
      </div>
      <div className="filters">
        {config.searchable && (
          <input placeholder={`Search ${config.title.toLowerCase()}…`} value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 260 }} />
        )}
        {config.statusOptions && (
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {config.statusOptions.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        )}
        <span style={{ alignSelf: "center", color: "var(--text-muted)", fontSize: 12.5 }}>{count} record(s)</span>
      </div>
      <Panel>
        {error && <div className="error-box">{error}</div>}
        {rows === null ? <Spinner /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr>{config.columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {config.columns.map((c) => (
                      <td key={c.key} className={c.primary ? "primary-cell" : ""}>{cell(row, c)}</td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && !error && <tr><td colSpan={config.columns.length} className="empty">No records found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
            Page {page} of {totalPages}
            <button className="btn sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        )}
      </Panel>
    </>
  );
}
