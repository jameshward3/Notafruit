import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";

export interface CurrentUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
  title: string;
  department: string | null;
  roles: string[];
  permissions: string[];
  is_superuser: boolean;
  must_change_password: boolean;
}

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await api.get("/auth/csrf/");
        setUser(await api.get<CurrentUser>("/auth/me/"));
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const me = await api.post<CurrentUser>("/auth/login/", { username, password });
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout/");
    } finally {
      setUser(null);
    }
  }, []);

  const can = useCallback(
    (permission: string) => !!user && (user.is_superuser || user.permissions.includes(permission)),
    [user],
  );

  return <AuthContext.Provider value={{ user, loading, login, logout, can }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
