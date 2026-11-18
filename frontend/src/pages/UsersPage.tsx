import { FormEvent, useEffect, useState } from "react";
import { api, Paginated } from "../api";
import { fmtDateTime, Panel, Spinner } from "../components/ui";

interface UserRow {
  id: number; username: string; first_name: string; last_name: string; email: string; title: string;
  department: number | null; department_name: string; role_ids: number[]; role_names: string[];
  is_active: boolean; is_locked: boolean; must_change_password: boolean; mfa_enabled: boolean;
  failed_login_attempts: number; last_login: string | null; last_login_ip: string | null;
}
interface Role { id: number; name: string; }
interface Department { id: number; name: string; }

const EMPTY_FORM = { username: "", first_name: "", last_name: "", email: "", title: "", department: "", role_ids: [] as number[], password: "" };

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = () => {
    api.get<Paginated<UserRow>>("/users/?page_size=100").then((r) => { setUsers(r.results); setError(null); })
      .catch((e) => { setUsers([]); setError(e.status === 403 ? "User management requires the users.manage permission." : e.message); });
    api.get<Paginated<Role>>("/roles/").then((r) => setRoles(r.results ?? (r as any))).catch(() => {});
    api.get<Department[]>("/departments/").then((r: any) => setDepartments(r.results ?? r)).catch(() => {});
  };
  useEffect(load, []);

  async function act(user: UserRow, action: string, body?: any) {
    setNotice(null);
    try {
      const r = await api.post(`/users/${user.id}/${action}/`, body);
      setNotice(r.temporary_password ? `Temporary password for ${user.username}: ${r.temporary_password}` : r.detail);
      load();
    } catch (e: any) { setError(e.message); }
  }

  async function toggleActive(user: UserRow) {
    try {
      if (user.is_active) await api.delete(`/users/${user.id}/`); // deactivates (never hard-deletes)
      else await api.patch(`/users/${user.id}/`, { is_active: true });
      load();
    } catch (e: any) { setError(e.message); }
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post("/users/", { ...form, department: form.department || null });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setNotice("User created. They must change their password at first sign-in.");
      load();
    } catch (err: any) {
      setError(typeof err.body === "object" ? JSON.stringify(err.body) : err.message);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">👤 User Management</div>
          <div className="page-sub">Accounts, roles, departments, lockouts, and password policy enforcement. Every action here is audited.</div>
        </div>
        <button className="btn primary" onClick={() => setShowCreate(true)}>+ Create User</button>
      </div>
      {notice && <div className="login-note" style={{ marginBottom: 14 }}>{notice}</div>}
      {error && <div className="error-box">{error}</div>}
      <Panel>
        {users === null ? <Spinner /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>User</th><th>Roles</th><th>Department</th><th>Status</th><th>MFA</th><th>Last Login</th><th>Failed Attempts</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="primary-cell">
                      {u.first_name} {u.last_name}
                      <div style={{ fontSize: 11.5, color: "var(--text-faint)", fontWeight: 400 }}>{u.username} · {u.email}</div>
                    </td>
                    <td>{u.role_names.map((r) => <span key={r} className="badge blue" style={{ marginRight: 4 }}>{r}</span>)}</td>
                    <td>{u.department_name || "—"}</td>
                    <td>
                      {!u.is_active ? <span className="badge gray">Deactivated</span>
                        : u.is_locked ? <span className="badge red">Locked</span>
                        : u.must_change_password ? <span className="badge amber">Pwd Change Required</span>
                        : <span className="badge green">Active</span>}
                    </td>
                    <td>{u.mfa_enabled ? <span className="badge green">Enabled</span> : <span className="badge gray">Ready</span>}</td>
                    <td>{u.last_login ? <>{fmtDateTime(u.last_login)}<div style={{ fontSize: 11, color: "var(--text-faint)" }}>{u.last_login_ip}</div></> : "Never"}</td>
                    <td>{u.failed_login_attempts}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn sm" onClick={() => act(u, "reset_password")}>Reset Pwd</button>{" "}
                      {u.is_locked && <><button className="btn sm" onClick={() => act(u, "unlock")}>Unlock</button>{" "}</>}
                      <button className="btn sm" onClick={() => act(u, "revoke_sessions")}>Revoke Sessions</button>{" "}
                      <button className={`btn sm ${u.is_active ? "danger" : ""}`} onClick={() => toggleActive(u)}>
                        {u.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={createUser}>
            <h3 style={{ marginTop: 0 }}>Create User</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
              <div className="field"><label>Username</label><input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
              <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="field"><label>First name</label><input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
              <div className="field"><label>Last name</label><input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
              <div className="field"><label>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="field">
                <label>Department</label>
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  <option value="">—</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Roles</label>
              <select multiple size={6} value={form.role_ids.map(String)}
                onChange={(e) => setForm({ ...form, role_ids: Array.from(e.target.selectedOptions).map((o) => Number(o.value)) })}>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Initial password (user must change at first sign-in)</label>
              <input type="password" required minLength={12} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn primary" type="submit">Create User</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
