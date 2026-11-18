import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

const NAV: { section?: string; items: [string, string, string][] }[] = [
  {
    items: [
      ["/", "▦", "Dashboard"],
      ["/records", "🗄", "Records Vault"],
      ["/meetings", "📅", "Meetings"],
      ["/agendas", "📋", "Agendas & Packets"],
      ["/ordinances", "⚖", "Ordinances"],
      ["/resolutions", "✍", "Resolutions"],
      ["/opra", "🔎", "OPRA Requests"],
      ["/notices", "📢", "Public Notices"],
      ["/licenses", "🪪", "Licenses"],
      ["/boards", "👥", "Boards & Appointments"],
      ["/correspondence", "✉", "Correspondence"],
      ["/tasks", "☑", "Tasks"],
      ["/reports", "📈", "Reports"],
    ],
  },
  {
    section: "Administration",
    items: [
      ["/audit-logs", "🧾", "Audit Logs"],
      ["/users", "👤", "User Management"],
      ["/admin", "🛠", "Admin Panel"],
      ["/compliance", "🛡", "Compliance Center"],
      ["/system-health", "💓", "System Health"],
      ["/settings", "⚙", "Settings"],
    ],
  },
];

interface SearchResult { type: string; id: number; label: string; route: string; }

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [health, setHealth] = useState<{ status: string } | null>(null);
  const [unread, setUnread] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const searchTimer = useRef<number>();

  useEffect(() => {
    const load = () => {
      api.get("/system/health/").then(setHealth).catch(() => setHealth(null));
      api.get("/notifications/unread_count/").then((r) => setUnread(r.unread)).catch(() => {});
    };
    load();
    const interval = window.setInterval(load, 60_000); // polling keeps it LAN-simple
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    window.clearTimeout(searchTimer.current);
    if (query.trim().length < 2) { setResults(null); return; }
    searchTimer.current = window.setTimeout(async () => {
      try {
        const r = await api.get(`/search/?q=${encodeURIComponent(query)}`);
        setResults(r.results);
      } catch { setResults([]); }
    }, 250);
  }, [query]);

  const initials = (user?.full_name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">Clerk<span>OS</span></div>
        <div className="logo-sub">Municipal Clerk Suite</div>
        {NAV.map((group, i) => (
          <div key={i}>
            {group.section && <div className="nav-section">{group.section}</div>}
            {group.items.map(([to, icon, label]) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
                <span className="icon">{icon}</span>{label}
              </NavLink>
            ))}
          </div>
        ))}
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="search">
            <span className="glass">🔍</span>
            <input
              placeholder="Search records, meetings, ordinances, requests…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => window.setTimeout(() => setResults(null), 200)}
            />
            {results && (
              <div className="search-results">
                {results.length === 0 && <div className="empty">No matches.</div>}
                {results.map((r) => (
                  <a key={`${r.type}-${r.id}`} onClick={() => { setQuery(""); navigate(r.route); }}>
                    <span className="badge blue" style={{ marginRight: 8 }}>{r.type}</span>{r.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="server-pill">
            Server: CLERKOS-01
            <span className={`dot ${health?.status === "ok" ? "green" : "red"}`} />
            {health?.status === "ok" ? "Online" : "Degraded"}
          </div>
          <button className="bell" title="Notifications" onClick={() => navigate("/tasks")}>
            🔔{unread > 0 && <span className="count">{unread}</span>}
          </button>
          <div className="who">
            <div className="avatar">{initials}</div>
            <div>
              <div className="who-name">{user?.full_name}</div>
              <div className="who-role">{user?.roles[0] ?? user?.title}</div>
            </div>
            <button className="btn sm" onClick={async () => { await logout(); navigate("/login"); }}>Sign out</button>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
