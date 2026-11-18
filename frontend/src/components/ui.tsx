import { ReactNode } from "react";

export function Panel({ title, icon, action, children, className = "" }: {
  title?: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-head">
          <div className="panel-title">{icon && <span>{icon}</span>}{title}</div>
          {action}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function Metric({ icon, tone, label, value, sub, subTone }: {
  icon: string; tone: string; label: string; value: ReactNode; sub?: ReactNode; subTone?: "up" | "risk";
}) {
  return (
    <div className="metric">
      <div className="tile" style={{ background: `var(--${tone}-soft, var(--primary-soft))`, color: `var(--${tone}, var(--primary))` }}>{icon}</div>
      <div>
        <div className="label">{label}</div>
        <div className="value">{value}</div>
        {sub && <div className={`sub ${subTone ?? ""}`}>{sub}</div>}
      </div>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  // green — complete / on-track
  active: "green", adopted: "gold", published: "green", approved: "green", fulfilled: "green",
  success: "green", complete: "green", done: "green", implemented: "green", proof_received: "green",
  completed: "green", carried: "green", verified: "green",
  // blue — in motion
  in_progress: "blue", introduced: "blue", assigned: "blue", scheduled: "blue", submitted: "blue",
  under_review: "blue", department_review: "blue", legal_review: "violet", public_hearing: "blue",
  agenda_open: "blue", packet_ready: "blue", on_agenda: "blue", in_review: "blue", monitoring: "blue",
  in_treatment: "blue", pending_approval: "amber", renewal_pending: "amber",
  // amber — waiting / at-risk
  received: "amber", extension: "amber", clarification: "amber", draft: "gray", tabled: "amber",
  blocked: "amber", needs_review: "amber", open: "amber", retention_review: "amber", minutes_pending: "amber",
  // red — problem
  denied: "red", failed: "red", overdue: "red", revoked: "red", suspended: "red", expired: "red",
  removed: "red", cancelled: "red", withdrawn: "gray", destroyed: "red",
  // gray
  archived: "gray", closed: "gray", resigned: "gray", not_started: "gray", not_applicable: "gray",
  // priority
  low: "gray", medium: "blue", high: "amber", urgent: "red", critical: "red", warning: "amber",
  info: "blue", notice: "blue",
  // classification
  public: "green", internal: "blue", confidential: "amber", restricted: "red",
};

export function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="badge gray">—</span>;
  const tone = STATUS_TONE[value] ?? "gray";
  const label = value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <span className={`badge ${tone}`}>{label}</span>;
}

export function fmtDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? value + "T00:00:00" : value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function Spinner() {
  return <div className="empty">Loading…</div>;
}
