import { useEffect, useState } from "react";
import { api, Paginated } from "../api";
import { fmtDateTime, Panel, Spinner, StatusBadge } from "../components/ui";

type Tab = "sessions" | "roles" | "departments" | "backups" | "holds" | "retention" | "settings";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("sessions");
  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">🛠 Admin Panel</div>
          <div className="page-sub">Sessions, roles &amp; permissions, departments, backups, legal holds, retention rules, and system settings.</div>
        </div>
      </div>
      <div className="tabs">
        {([["sessions", "Active Sessions"], ["roles", "Roles & Permissions"], ["departments", "Departments"],
           ["backups", "Backups"], ["holds", "Legal Holds"], ["retention", "Retention Rules"], ["settings", "System Settings"]] as [Tab, string][]).map(([key, label]) => (
          <button key={key} className={`tab${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {tab === "sessions" && <SessionsTab />}
      {tab === "roles" && <RolesTab />}
      {tab === "departments" && <SimpleListTab endpoint="/departments/" columns={[["name", "Department"], ["code", "Code"], ["head_name", "Head"], ["user_count", "Users"]]} />}
      {tab === "backups" && <BackupsTab />}
      {tab === "holds" && <SimpleListTab endpoint="/legal-holds/" columns={[["name", "Hold"], ["matter_reference", "Matter"], ["placed_by_name", "Placed By"], ["placed_at", "Placed", "dt"], ["is_active", "Active", "bool"], ["document_count", "Documents"]]} />}
      {tab === "retention" && <SimpleListTab endpoint="/retention-rules/" columns={[["code", "Code"], ["name", "Rule"], ["retention_years", "Years"], ["permanent", "Permanent", "bool"], ["authority_citation", "Authority"]]} />}
      {tab === "settings" && <SimpleListTab endpoint="/system-settings/" columns={[["key", "Setting"], ["description", "Description"], ["updated_by_name", "Updated By"], ["updated_at", "Updated", "dt"]]} emptyText="No settings configured yet. Settings are created via the API or seed." />}
    </>
  );
}

function SessionsTab() {
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => api.get<Paginated<any>>("/sessions/?active=true")
    .then((r) => { setSessions(r.results); setError(null); })
    .catch((e) => { setSessions([]); setError(e.status === 403 ? "Session administration requires users.manage." : e.message); });
  useEffect(() => { load(); }, []);
  return (
    <Panel title="Active Sessions" icon="🖥" action={<button className="btn sm" onClick={load}>Refresh</button>}>
      {error && <div className="error-box">{error}</div>}
      {sessions === null ? <Spinner /> : (
        <table className="tbl">
          <thead><tr><th>User</th><th>Department</th><th>IP</th><th>Signed In</th><th>Last Activity</th><th></th></tr></thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td className="primary-cell">{s.full_name || s.username}</td>
                <td>{s.department || "—"}</td>
                <td>{s.ip_address || "—"}</td>
                <td>{fmtDateTime(s.created_at)}</td>
                <td>{fmtDateTime(s.last_activity)}</td>
                <td><button className="btn sm danger" onClick={() => api.post(`/sessions/${s.id}/revoke/`).then(load)}>Revoke</button></td>
              </tr>
            ))}
            {sessions.length === 0 && !error && <tr><td colSpan={6} className="empty">No active sessions.</td></tr>}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function RolesTab() {
  const [roles, setRoles] = useState<any[] | null>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  useEffect(() => {
    api.get("/roles/").then((r: any) => setRoles(r.results ?? r)).catch(() => setRoles([]));
    api.get("/permissions/").then((r: any) => setPermissions(r.results ?? r)).catch(() => {});
  }, []);
  return (
    <div className="dash-grid" style={{ gridTemplateColumns: "1fr 1.2fr" }}>
      <Panel title="Roles" icon="🎭">
        {roles === null ? <Spinner /> : (
          <table className="tbl">
            <thead><tr><th>Role</th><th>Users</th><th>Permissions</th></tr></thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id} onClick={() => setSelected(r)} style={{ cursor: "pointer", background: selected?.id === r.id ? "var(--primary-soft)" : undefined }}>
                  <td className="primary-cell">{r.name}{r.is_system && <span className="badge gray" style={{ marginLeft: 6 }}>System</span>}</td>
                  <td>{r.user_count}</td>
                  <td>{r.permission_codes.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <Panel title={selected ? `Permission Matrix — ${selected.name}` : "Permission Matrix"} icon="🔐">
        {!selected ? <div className="empty">Select a role to view its permissions.</div> : (
          <table className="tbl">
            <thead><tr><th>Module</th><th>Permission</th><th>Granted</th></tr></thead>
            <tbody>
              {permissions.map((p) => (
                <tr key={p.code}>
                  <td>{p.module}</td>
                  <td>{p.label} <code style={{ fontSize: 10.5, color: "var(--text-faint)" }}>{p.code}</code></td>
                  <td>{selected.permission_codes.includes(p.code)
                    ? <span className="badge green">✓ Granted</span>
                    : <span className="badge gray">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

function BackupsTab() {
  const [jobs, setJobs] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.get<Paginated<any>>("/backup-jobs/").then((r) => setJobs(r.results))
      .catch((e) => { setJobs([]); setError(e.status === 403 ? "Backup history requires compliance.access." : e.message); });
  }, []);
  return (
    <Panel title="Backup History" icon="💾">
      {error && <div className="error-box">{error}</div>}
      {jobs === null ? <Spinner /> : (
        <table className="tbl">
          <thead><tr><th>Type</th><th>Started</th><th>Completed</th><th>Status</th><th>Size</th><th>Restore-Tested</th><th>Location</th></tr></thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td className="primary-cell">{j.job_type}</td>
                <td>{fmtDateTime(j.started_at)}</td>
                <td>{fmtDateTime(j.completed_at)}</td>
                <td><StatusBadge value={j.status} /></td>
                <td>{j.size_bytes ? `${(j.size_bytes / 1024 / 1024).toFixed(1)} MB` : "—"}</td>
                <td>{j.verified ? <span className="badge green">Verified</span> : <span className="badge amber">Pending</span>}</td>
                <td style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{j.location}</td>
              </tr>
            ))}
            {jobs.length === 0 && !error && <tr><td colSpan={7} className="empty">No backup jobs recorded.</td></tr>}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function SimpleListTab({ endpoint, columns, emptyText }: { endpoint: string; columns: [string, string, ("dt" | "bool")?][]; emptyText?: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.get(endpoint).then((r: any) => setRows(r.results ?? r))
      .catch((e) => { setRows([]); setError(e.status === 403 ? "You do not have permission to view this section." : e.message); });
  }, [endpoint]);
  return (
    <Panel>
      {error && <div className="error-box">{error}</div>}
      {rows === null ? <Spinner /> : (
        <table className="tbl">
          <thead><tr>{columns.map(([k, label]) => <th key={k}>{label}</th>)}</tr></thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={row.id}>
                {columns.map(([k, , kind]) => (
                  <td key={k}>
                    {kind === "dt" ? fmtDateTime(row[k])
                      : kind === "bool" ? (row[k] ? <span className="badge green">Yes</span> : <span className="badge gray">No</span>)
                      : (row[k] ?? "—") === "" ? "—" : String(row[k] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && !error && <tr><td colSpan={columns.length} className="empty">{emptyText ?? "No entries."}</td></tr>}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
