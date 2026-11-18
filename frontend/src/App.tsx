import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import AppShell from "./components/AppShell";
import { Spinner } from "./components/ui";
import AdminPage from "./pages/AdminPage";
import AuditLogPage from "./pages/AuditLogPage";
import CompliancePage from "./pages/CompliancePage";
import DashboardPage from "./pages/DashboardPage";
import ListPage, { LIST_PAGES } from "./pages/ListPage";
import LoginPage from "./pages/LoginPage";
import SystemHealthPage from "./pages/SystemHealthPage";
import UsersPage from "./pages/UsersPage";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route path="/" element={<DashboardPage />} />
        {Object.entries(LIST_PAGES).map(([path, config]) => (
          <Route key={path} path={path} element={<ListPage config={config} />} />
        ))}
        <Route path="/audit-logs" element={<AuditLogPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/settings" element={<AdminPage />} />
        <Route path="/compliance" element={<CompliancePage />} />
        <Route path="/system-health" element={<SystemHealthPage />} />
        <Route path="/reports" element={<CompliancePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
