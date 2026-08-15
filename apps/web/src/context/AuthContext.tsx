import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

type User = {
  id: string;
  email: string;
  name: string;
  role: "CONSUMER" | "MERCHANT" | "ADMIN";
  avatar?: string;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  googleAuthEnabled: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);

  async function refresh() {
      try {
        const data = await api<{ user: User | null; googleAuthEnabled: boolean }>("/auth/me");
        setUser(data.user);
        setGoogleAuthEnabled(data.googleAuthEnabled);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, googleAuthEnabled, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
