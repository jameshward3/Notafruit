import { useEffect, useState } from "react";
import { api, Paginated } from "../api";
import { fmtDateTime, Metric, Panel, Spinner } from "../components/ui";

export default function SystemHealthPage() {
  const [health, setHealth] = useState<any | null>(null);
  const [logins, setLogins] = useState<any[]>([]);

  useEffect(() => {
    const load = () => {
      api.get("/system/health/").then(setHealth).catch(() => setHealth({ status: "unreachable", database: "unknown" }));
      api.get<Paginated<any>>("/audit-logs/?action=login_failed").then((r) => setLogins(r.results.slice(0, 10))).catch(() => {});
    };
    load();
    const interval = window.setInterval(load, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  if (!health) return <Spinner />;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">💓 System Health</div>
          <div className="page-sub">Live status of the ClerkOS server, database, and backup pipeline. Polled every 30 seconds.</div>
        </div>
      </div>
      <div className="metric-grid">
        <Metric icon={health.status === "ok" ? "✓" : "✗"} tone={health.status === "ok" ? "green" : "red"}
          label="Application" value={health.status === "ok" ? "Online" : "Degraded"} sub={`v${health.version ?? "?"}`} />
        <Metric icon="🗃" tone={health.database === "up" ? "green" : "red"} label="Database"
          value={health.database === "up" ? "Connected" : "Down"} sub="PostgreSQL" />
        <Metric icon="💾" tone={health.last_successful_backup ? "green" : "amber"} label="Last Backup"
          value={health.last_successful_backup ? "OK" : "None"} sub={fmtDateTime(health.last_successful_backup)} />
        <Metric icon="🕐" tone="primary" label="Server Time" value={new Date(health.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} sub="Local municipal server" />
      </div>
      <Panel title="Recent Failed Login Attempts" icon="🚨">
        <table className="tbl">
          <thead><tr><th>Time</th><th>Username Attempted</th><th>IP Address</th><th>Reason</th></tr></thead>
          <tbody>
            {logins.map((e) => (
              <tr key={e.id}>
                <td>{fmtDateTime(e.created_at)}</td>
                <td className="primary-cell">{e.object_repr || e.actor_username || "—"}</td>
                <td>{e.ip_address || "—"}</td>
                <td>{e.reason || "Invalid credentials"}</td>
              </tr>
            ))}
            {logins.length === 0 && <tr><td colSpan={4} className="empty">No failed logins recorded (or you lack logs.view).</td></tr>}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
