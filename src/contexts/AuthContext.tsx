import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { switchTenant } from "@/lib/api";

interface User {
  id: string;
  username: string;
  tenant_id?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: User | null;
  login: (token: string, username?: string) => void;
  logout: () => void;
  switchBusiness: (tenantId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function decodeJwtPayload(token: string): { sub?: string; tenant_id?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = sessionStorage.getItem("auth_token");
    const storedUsername = sessionStorage.getItem("auth_username");
    if (storedToken) {
      setToken(storedToken);
      const payload = decodeJwtPayload(storedToken);
      setUser({
        id: payload?.sub || storedUsername || "admin",
        username: storedUsername || payload?.sub || "admin",
        tenant_id: payload?.tenant_id,
      });
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, username?: string) => {
    sessionStorage.setItem("auth_token", newToken);
    if (username) {
      sessionStorage.setItem("auth_username", username);
    }
    setToken(newToken);
    const payload = decodeJwtPayload(newToken);
    setUser({
      id: payload?.sub || username || "admin",
      username: username || payload?.sub || "admin",
      tenant_id: payload?.tenant_id,
    });
  };

  const logout = () => {
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_username");
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  };

  const switchBusiness = async (tenantId: string): Promise<void> => {
    const response = await switchTenant(tenantId);
    // CRITICAL: Immediately overwrite the token in sessionStorage
    sessionStorage.setItem("auth_token", response.access_token);
    // Force a fresh state and clear all caches
    window.location.reload();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: Boolean(token),
        isLoading,
        token,
        user,
        login,
        logout,
        switchBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
