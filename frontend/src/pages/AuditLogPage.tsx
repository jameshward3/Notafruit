import { useEffect, useMemo, useState } from "react";
import { api, Paginated, API_BASE } from "../api";
import { fmtDateTime, Panel, Spinner, StatusBadge } from "../components/ui";

interface AuditRow {
  id: number; event_id: string; created_at: string; actor_username: string; actor_role: string;
  department: string; ip_address: string | null; action: string; module: string;
  object_type: string; object_id: string; object_repr: string;
  before: any; after: any; success: boolean; severity: string; reason: string; entry_hash: string;
}

const ACTIONS = ["login", "login_failed", "logout", "create", "update", "delete", "view", "upload", "download",
  "redact", "approve", "publish", "export", "lock", "unlock", "lock_override", "permission_change",
  "admin_action", "backup", "restore", "security"];
const MODULES = ["accounts", "audit", "records", "meetings", "legislation", "opra", "notices", "licensing", "boards", "workflow", "compliance", "core"];

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ action: "", module: "", severity: "", search: "", start: "", end: "" });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [chain, setChain] = useState<{ intact: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page) });
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    return params.toString();
  }, [page, filters]);

  useEffect(() => { setPage(1); }, [filters]);

  useEffect(() => {
    api.get<Paginated<AuditRow>>(`/audit-logs/?${query}`)
      .then((r) => { setRows(r.results); setCount(r.count); setError(null); })
      .catch((e) => { setRows([]); setError(e.status === 403 ? "Viewing audit logs requires the logs.view permission." : e.message); });
  }, [query]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">🧾 Audit Logs</div>
          <div className="page-sub">Tamper-evident, hash-chained event trail. Entries are append-only and verified end-to-end.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => api.get("/audit-logs/verify/").then(setChain).catch(() => setChain(null))}>
            Verify Chain Integrity
          </button>
          <a className="btn" href={`${API_BASE}/audit-logs/export/?${query}`}>Export CSV</a>
        </div>
      </div>
      {chain && (
        <div className={chain.intact ? "login-note" : "error-box"} style={{ marginBottom: 14 }}>
          {chain.intact ? "✓ Audit chain verified — no tampering detected." : "✗ CHAIN BROKEN — possible tampering. Preserve the database and notify the administrator."}
        </div>
      )}
      <div className="filters">
        <input placeholder="Search user, record, reason…" value={filters.search} onChange={set("search")} style={{ minWidth: 240 }} />
        <select value={filters.action} onChange={set("action")}>
          <option value="">All actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
        </select>
        <select value={filters.module} onChange={set("module")}>
          <option value="">All modules</option>
          {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filters.severity} onChange={set("severity")}>
          <option value="">All severities</option>
          {["info", "notice", "warning", "critical"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={filters.start} onChange={set("start")} title="From date" />
        <input type="date" value={filters.end} onChange={set("end")} title="To date" />
        <span style={{ alignSelf: "center", color: "var(--text-muted)", fontSize: 12.5 }}>{count} event(s)</span>
      </div>
      <Panel>
        {error && <div className="error-box">{error}</div>}
        {rows === null ? <Spinner /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Time</th><th>User</th><th>Department</th><th>Action</th><th>Module</th><th>Record</th><th>IP</th><th>Severity</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <>
                    <tr key={e.id} onClick={() => setExpanded(expanded === e.id ? null : e.id)} style={{ cursor: "pointer" }}>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(e.created_at)}</td>
                      <td className="primary-cell">{e.actor_username || "system"}</td>
                      <td>{e.department || "—"}</td>
                      <td><StatusBadge value={e.action} /></td>
                      <td>{e.module}</td>
                      <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.object_repr || "—"}</td>
                      <td>{e.ip_address || "—"}</td>
                      <td><StatusBadge value={e.severity} /></td>
                      <td><span className={`badge ${e.success ? "green" : "red"}`}>{e.success ? "Success" : "Failed"}</span></td>
                    </tr>
                    {expanded === e.id && (
                      <tr key={`${e.id}-detail`}>
                        <td colSpan={9} style={{ background: "var(--surface-muted)", fontSize: 12 }}>
                          <b>Event:</b> {e.event_id} · <b>Role:</b> {e.actor_role || "—"} · <b>Object:</b> {e.object_type} #{e.object_id}
                          {e.reason && <> · <b>Reason:</b> {e.reason}</>}
                          <br /><b>Hash:</b> <code>{e.entry_hash.slice(0, 32)}…</code>
                          {(e.before || e.after) && (
                            <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>
                              {e.before && `before: ${JSON.stringify(e.before)}\n`}
                              {e.after && `after:  ${JSON.stringify(e.after)}`}
                            </pre>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {rows.length === 0 && !error && <tr><td colSpan={9} className="empty">No events match the filters.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {count > 25 && (
          <div className="pagination">
            <button className="btn sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
            Page {page} of {Math.ceil(count / 25)}
            <button className="btn sm" disabled={page >= Math.ceil(count / 25)} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        )}
      </Panel>
    </>
  );
}
