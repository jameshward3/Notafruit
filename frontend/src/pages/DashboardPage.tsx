import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Paginated } from "../api";
import { useAuth } from "../auth";
import { fmtDate, fmtDateTime, Metric, Panel, Spinner, StatusBadge } from "../components/ui";

interface Dashboard {
  metrics: Record<string, number | null>;
  backup: { status: string; completed_at: string | null; verified: boolean };
  active_users: { username: string; full_name: string; department: string; last_activity: string }[];
  upcoming_meetings: { id: number; title: string; date: string; start_time: string | null; status: string; meeting_type: string }[];
  work_queue_by_department: { department__name: string | null; count: number }[];
  recent_audit_events: { id: number; created_at: string; actor: string; action: string; module: string; object_repr: string; success: boolean; severity: string }[];
}

interface Ordinance {
  id: number; number: string; title: string; status: string;
  introduced_date: string | null; public_hearing_date: string | null; adoption_date: string | null;
  publication_date: string | null; effective_date: string | null; created_at: string;
}

interface TaskRow {
  id: number; title: string; module: string; assigned_to_name: string; department_name: string;
  due_date: string | null; priority: string; status: string;
}

const ORDINANCE_STEPS: { key: string; label: string; dateField: keyof Ordinance }[] = [
  { key: "draft", label: "Draft", dateField: "created_at" },
  { key: "introduced", label: "Introduced", dateField: "introduced_date" },
  { key: "public_hearing", label: "Public Hearing", dateField: "public_hearing_date" },
  { key: "adopted", label: "Adopted", dateField: "adoption_date" },
  { key: "published", label: "Published", dateField: "publication_date" },
  { key: "effective", label: "Effective", dateField: "effective_date" },
];

function MiniCalendar({ meetingDates }: { meetingDates: Set<string> }) {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) weeks.push([...week, ...Array(7 - week.length).fill(null)]);
  const iso = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return (
    <table className="cal">
      <thead>
        <tr>{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <th key={i}>{d}</th>)}</tr>
      </thead>
      <tbody>
        {weeks.map((w, i) => (
          <tr key={i}>
            {w.map((d, j) => (
              <td key={j}>
                {d && (
                  <span className={`day${d === now.getDate() ? " today" : ""}${meetingDates.has(iso(d)) ? " has-meeting" : ""}`}>
                    {d}
                  </span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DashboardPage() {
  const { user, can } = useAuth();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [featured, setFeatured] = useState<Ordinance | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [compliance, setCompliance] = useState<{ label: string; readiness_pct: number }[]>([]);

  useEffect(() => {
    const load = () => api.get<Dashboard>("/dashboard/").then(setDash).catch(() => {});
    load();
    const interval = window.setInterval(load, 45_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    api.get<Paginated<Ordinance>>("/ordinances/?ordering=-updated_at").then((r) => {
      const live = r.results.find((o) => !["archived", "failed", "withdrawn"].includes(o.status));
      setFeatured(live ?? r.results[0] ?? null);
    }).catch(() => {});
    api.get<Paginated<TaskRow>>("/tasks/?ordering=due_date").then((r) =>
      setTasks(r.results.filter((t) => !["done", "cancelled"].includes(t.status)))).catch(() => {});
    if (can("compliance.access")) {
      api.get("/compliance-controls/summary/").then(setCompliance).catch(() => {});
    }
  }, [can]);

  if (!dash) return <Spinner />;
  const m = dash.metrics;

  const stepsDone = featured
    ? ORDINANCE_STEPS.map((s) => ({ ...s, date: featured[s.dateField] as string | null }))
    : [];
  const lastDoneIdx = stepsDone.reduce((acc, s, i) => (s.date ? i : acc), 0);
  const progressPct = featured ? Math.round(((lastDoneIdx + 1) / ORDINANCE_STEPS.length) * 100) : 0;

  const filteredTasks = tasks.filter((t) => taskFilter === "all" || t.priority === taskFilter);
  const meetingDates = new Set(dash.upcoming_meetings.map((mt) => mt.date));

  const alerts: { tone: string; icon: string; title: string; sub: string }[] = [];
  if ((m.failed_logins_24h ?? 0) > 0)
    alerts.push({ tone: "red", icon: "⚠", title: "Failed login attempts", sub: `${m.failed_logins_24h} failed attempt(s) in the last 24h` });
  if ((m.opra_overdue ?? 0) > 0)
    alerts.push({ tone: "red", icon: "⏰", title: "OPRA requests overdue", sub: `${m.opra_overdue} request(s) past statutory deadline` });
  if ((m.opra_due_soon ?? 0) > 0)
    alerts.push({ tone: "amber", icon: "🕒", title: "OPRA deadlines approaching", sub: `${m.opra_due_soon} request(s) due within 2 days` });
  if (dash.backup.status !== "success")
    alerts.push({ tone: "red", icon: "💾", title: "Backup attention needed", sub: `Last backup status: ${dash.backup.status}` });
  else
    alerts.push({ tone: "green", icon: "✓", title: "Backups healthy", sub: `Last backup ${fmtDateTime(dash.backup.completed_at)}${dash.backup.verified ? " · restore-tested" : ""}` });
  if (m.compliance_score != null)
    alerts.push({ tone: (m.compliance_score as number) >= 80 ? "green" : "amber", icon: "🛡", title: "Compliance readiness", sub: `${m.compliance_score}% of controls implemented` });

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Municipal Clerk Command Center <span title="Internal system" style={{ color: "var(--primary)" }}>✔</span></div>
          <div className="page-sub">Internal on-premise system · {user?.department ?? "Clerk's Office"}</div>
        </div>
        <div style={{ textAlign: "right", color: "var(--text-muted)", fontSize: 13 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          <br />
          <span style={{ fontSize: 12 }}>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
        </div>
      </div>

      <div className="metric-grid">
        <Metric icon="👥" tone="primary" label="Active Users" value={m.active_users ?? 0} sub="signed in now" />
        <Metric icon="🔎" tone="amber" label="Open OPRA Requests" value={m.open_opra_requests ?? 0}
          sub={`${m.opra_overdue ?? 0} overdue · ${m.opra_due_soon ?? 0} due soon`} subTone={(m.opra_overdue ?? 0) > 0 ? "risk" : undefined} />
        <Metric icon="📅" tone="green" label="Upcoming Meetings" value={m.upcoming_meetings ?? 0}
          sub={dash.upcoming_meetings[0] ? `Next: ${fmtDate(dash.upcoming_meetings[0].date)}` : "None scheduled"} />
        <Metric icon="⚖" tone="gold" label="Active Legislation" value={(m.active_ordinances ?? 0) + (m.active_resolutions ?? 0)}
          sub={`${m.active_ordinances ?? 0} ordinances · ${m.active_resolutions ?? 0} resolutions`} />
        <Metric icon="🛟" tone={dash.backup.status === "success" ? "green" : "red"} label="Backup Status"
          value={dash.backup.status === "success" ? "Healthy" : "Check"} sub={`Last: ${fmtDateTime(dash.backup.completed_at)}`} />
      </div>

      <div className="dash-grid">
        <div className="stack">
          {featured && (
            <Panel icon="📜" title="Legislation Workflow"
              action={<Link className="panel-link" to="/ordinances">View Details</Link>}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                <div style={{ fontWeight: 700 }}>Ordinance #{featured.number} <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>· {featured.title}</span></div>
                <StatusBadge value={featured.status} />
              </div>
              <div className="stepper">
                {stepsDone.map((s, i) => (
                  <div key={s.key} className={`step ${i < lastDoneIdx ? "done" : i === lastDoneIdx ? "current" : ""}`}>
                    <div className="node">{i < lastDoneIdx ? "✓" : ""}</div>
                    <div className="bar" />
                    <div className="name">{s.label}</div>
                    <div className="date">{s.date ? fmtDate(s.date) : "TBD"}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center", marginTop: 12 }}>
                <div className="progress"><div style={{ width: `${progressPct}%` }} /></div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Stage progress <b style={{ color: "var(--text)" }}>{progressPct}%</b></div>
              </div>
            </Panel>
          )}

          <Panel icon="🗂" title="Work Queue" action={<Link className="panel-link" to="/tasks">View All</Link>}>
            <div className="tabs" style={{ marginBottom: 10 }}>
              {["all", "urgent", "high", "medium", "low"].map((p) => (
                <button key={p} className={`tab${taskFilter === p ? " active" : ""}`} onClick={() => setTaskFilter(p)}>
                  {p === "all" ? `All (${tasks.length})` : `${p[0].toUpperCase()}${p.slice(1)} (${tasks.filter((t) => t.priority === p).length})`}
                </button>
              ))}
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Description</th><th>Assigned To</th><th>Due</th><th>Priority</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredTasks.slice(0, 8).map((t) => (
                    <tr key={t.id}>
                      <td className="primary-cell">{t.title}<div style={{ fontSize: 11.5, color: "var(--text-faint)", fontWeight: 400 }}>{t.module} · {t.department_name || "—"}</div></td>
                      <td>{t.assigned_to_name || "Unassigned"}</td>
                      <td>{fmtDate(t.due_date)}</td>
                      <td><StatusBadge value={t.priority} /></td>
                      <td><StatusBadge value={t.status} /></td>
                    </tr>
                  ))}
                  {filteredTasks.length === 0 && <tr><td colSpan={5} className="empty">Queue is clear.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel icon="🧬" title="Records Lifecycle Map">
            <div className="lifemap">
              {[
                { k: "Meeting", v: dash.upcoming_meetings[0]?.title ?? "Council Meeting", s: dash.upcoming_meetings[0] ? fmtDate(dash.upcoming_meetings[0].date) : "—", icon: "📅" },
                { k: "Agenda Item", v: featured ? `Ord. ${featured.number}` : "—", s: "On agenda", icon: "📋" },
                { k: "Ordinance", v: featured?.number ?? "—", s: featured?.status.replace(/_/g, " ") ?? "—", icon: "⚖" },
                { k: "Public Notice", v: "Hearing Notice", s: featured?.public_hearing_date ? `Hearing ${fmtDate(featured.public_hearing_date)}` : "Pending", icon: "📢" },
                { k: "Adopted Record", v: "Records Vault", s: featured?.adoption_date ? fmtDate(featured.adoption_date) : "Pending adoption", icon: "🗄" },
              ].map((n, i, arr) => (
                <span key={n.k} style={{ display: "contents" }}>
                  <div className="node-card">
                    <div className="k">{n.icon} {n.k}</div>
                    <div className="v">{n.v}</div>
                    <div className="s">{n.s}</div>
                  </div>
                  {i < arr.length - 1 && <span className="arrow">→</span>}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 6 }}>
              Linked chain for the featured ordinance — every stage keeps its documents and audit trail connected.
            </div>
          </Panel>

          <Panel icon="🧾" title="Recent Activity / Audit Log" action={<Link className="panel-link" to="/audit-logs">Open Audit Logs</Link>}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Module</th><th>Record</th><th>Status</th></tr></thead>
                <tbody>
                  {dash.recent_audit_events.map((e) => (
                    <tr key={e.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(e.created_at)}</td>
                      <td>{e.actor}</td>
                      <td><StatusBadge value={e.action} /></td>
                      <td>{e.module}</td>
                      <td className="primary-cell" style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.object_repr || "—"}</td>
                      <td><span className={`badge ${e.success ? "green" : "red"}`}>{e.success ? "Success" : "Failed"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Panel icon="🚨" title="Alerts & System Health" action={<Link className="panel-link" to="/system-health">View All</Link>}>
            {alerts.map((a, i) => (
              <div key={i} className="alert-row">
                <div className="alert-ico" style={{ background: `var(--${a.tone}-soft)`, color: `var(--${a.tone})` }}>{a.icon}</div>
                <div>
                  <div className="alert-title">{a.title}</div>
                  <div className="alert-sub">{a.sub}</div>
                </div>
              </div>
            ))}
          </Panel>

          <Panel icon="📅" title="Upcoming Meetings" action={<Link className="panel-link" to="/meetings">View Calendar</Link>}>
            <MiniCalendar meetingDates={meetingDates} />
            <div style={{ marginTop: 10 }}>
              {dash.upcoming_meetings.slice(0, 4).map((mt) => {
                const d = new Date(mt.date + "T00:00:00");
                return (
                  <div key={mt.id} className="meeting-mini">
                    <div className="meeting-date">
                      <div className="m">{d.toLocaleDateString("en-US", { month: "short" })}</div>
                      <div className="d">{d.getDate()}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{mt.title}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                        {mt.start_time ? mt.start_time.slice(0, 5) : ""} · <StatusBadge value={mt.status} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {dash.upcoming_meetings.length === 0 && <div className="empty">No meetings scheduled.</div>}
            </div>
          </Panel>

          <Panel icon="👤" title="Active Users">
            {dash.active_users.slice(0, 6).map((u) => (
              <div key={u.username} className="alert-row">
                <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                  {u.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div className="alert-title">{u.full_name}</div>
                  <div className="alert-sub">{u.department || "—"}</div>
                </div>
                <div className="alert-time">{fmtDateTime(u.last_activity)}</div>
              </div>
            ))}
            {dash.active_users.length === 0 && <div className="empty">Only you are signed in.</div>}
          </Panel>

          {compliance.length > 0 && (
            <Panel icon="🛡" title="Compliance Snapshot" action={<Link className="panel-link" to="/compliance">View Report</Link>}>
              {compliance.map((c) => (
                <div key={c.label} className="comp-row">
                  <span>{c.label}</span>
                  <div className={`progress ${c.readiness_pct >= 80 ? "green" : "amber"}`}><div style={{ width: `${c.readiness_pct}%` }} /></div>
                  <b>{c.readiness_pct}%</b>
                </div>
              ))}
              {m.compliance_score != null && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, borderTop: `1px solid var(--border)`, paddingTop: 10 }}>
                  <span style={{ fontWeight: 600 }}>Overall Readiness</span>
                  <span className="comp-score">{m.compliance_score}%</span>
                </div>
              )}
            </Panel>
          )}

          <Panel icon="🏢" title="Work Queue by Department">
            {dash.work_queue_by_department.map((w) => (
              <div key={w.department__name ?? "none"} className="comp-row" style={{ gridTemplateColumns: "1fr auto" }}>
                <span>{w.department__name ?? "Unassigned"}</span>
                <span className="badge blue">{w.count} open</span>
              </div>
            ))}
            {dash.work_queue_by_department.length === 0 && <div className="empty">No open work.</div>}
          </Panel>
        </div>
      </div>
    </>
  );
}
