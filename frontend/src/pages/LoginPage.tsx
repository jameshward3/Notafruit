import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      navigate(location.state?.from?.pathname ?? "/", { replace: true });
    } catch (err: any) {
      setError(err.message || "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="logo" style={{ padding: 0 }}>Clerk<span>OS</span></div>
        <div className="logo-sub" style={{ padding: "0 0 22px" }}>Municipal Clerk Suite — Internal System</div>
        {error && <div className="error-box">{error}</div>}
        <div className="field">
          <label>Username</label>
          <input autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn primary" style={{ width: "100%", padding: "11px" }} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <div className="login-note">
          Authorized municipal personnel only. All activity on this system is logged and subject to audit.
        </div>
      </form>
    </div>
  );
}
