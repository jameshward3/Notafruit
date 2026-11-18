import { useEffect, useState } from "react";
import { api, Paginated, API_BASE } from "../api";
import { fmtDate, Panel, Spinner, StatusBadge } from "../components/ui";

export default function CompliancePage() {
  const [summary, setSummary] = useState<any[] | null>(null);
  const [controls, setControls] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [framework, setFramework] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/compliance-controls/summary/").then(setSummary)
      .catch((e) => { setSummary([]); setError(e.status === 403 ? "The Compliance Center requires the compliance.access permission." : e.message); });
    api.get<Paginated<any>>("/risk-register/").then((r) => setRisks(r.results)).catch(() => {});
  }, []);

  useEffect(() => {
    const q = framework ? `?framework=${framework}` : "";
    api.get<Paginated<any>>(`/compliance-controls/${q}`).then((r) => setControls(r.results)).catch(() => {});
  }, [framework]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">🛡 Compliance Center</div>
          <div className="page-sub">
            SOC 2 and ISO 27001 <b>readiness</b> tracking — control status, evidence collection, and risk register.
            This system supports readiness; it does not confer certification.
          </div>
        </div>
        <a className="btn" href={`${API_BASE}/compliance-evidence/export_package/`}>Export Evidence Package (JSON)</a>
      </div>
      {error && <div className="error-box">{error}</div>}
      {summary === null ? <Spinner /> : (
        <div className="metric-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {summary.map((s) => (
            <div className="metric" key={s.framework}>
              <div className="tile" style={{ background: s.readiness_pct >= 80 ? "var(--green-soft)" : "var(--amber-soft)", color: s.readiness_pct >= 80 ? "var(--green)" : "var(--amber)" }}>🛡</div>
              <div style={{ flex: 1 }}>
                <div className="label">{s.label}</div>
                <div className="value">{s.readiness_pct}%</div>
                <div className="sub">{s.implemented}/{s.total - s.not_applicable} controls implemented</div>
                <div className={`progress ${s.readiness_pct >= 80 ? "green" : "amber"}`} style={{ marginTop: 6 }}><div style={{ width: `${s.readiness_pct}%` }} /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="dash-grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <Panel title="Control Register" icon="📋" action={
          <select value={framework} onChange={(e) => setFramework(e.target.value)} style={{ padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 8 }}>
            <option value="">All frameworks</option>
            <option value="soc2_security">SOC 2 — Security</option>
            <option value="soc2_availability">SOC 2 — Availability</option>
            <option value="soc2_confidentiality">SOC 2 — Confidentiality</option>
            <option value="iso27001">ISO 27001</option>
          </select>
        }>
          <table className="tbl">
            <thead><tr><th>Control</th><th>Name</th><th>Owner</th><th>Status</th><th>Evidence</th><th>Last Review</th></tr></thead>
            <tbody>
              {controls.map((c) => (
                <tr key={c.id}>
                  <td className="primary-cell">{c.control_id}</td>
                  <td>{c.name}</td>
                  <td>{c.owner_name || "Unassigned"}</td>
                  <td><StatusBadge value={c.status} /></td>
                  <td>{c.evidence_count}</td>
                  <td>{fmtDate(c.last_reviewed)}</td>
                </tr>
              ))}
              {controls.length === 0 && <tr><td colSpan={6} className="empty">No controls in this framework yet.</td></tr>}
            </tbody>
          </table>
        </Panel>

        <Panel title="Risk Register" icon="⚠">
          <table className="tbl">
            <thead><tr><th>Risk</th><th>Score</th><th>Treatment</th><th>Status</th></tr></thead>
            <tbody>
              {risks.map((r) => (
                <tr key={r.id}>
                  <td className="primary-cell">{r.title}<div style={{ fontSize: 11.5, color: "var(--text-faint)", fontWeight: 400 }}>{r.category}</div></td>
                  <td><span className={`badge ${r.score >= 15 ? "red" : r.score >= 8 ? "amber" : "green"}`}>{r.score}</span></td>
                  <td>{r.treatment}</td>
                  <td><StatusBadge value={r.status} /></td>
                </tr>
              ))}
              {risks.length === 0 && <tr><td colSpan={4} className="empty">Risk register is empty.</td></tr>}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}
