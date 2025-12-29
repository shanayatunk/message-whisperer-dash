import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface User {
  id: string;
  username: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: User | null;
  login: (token: string, username?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function decodeJwtPayload(token: string): { sub?: string } | null {
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
    });
  };

  const logout = () => {
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_username");
    setToken(null);
    setUser(null);
    window.location.href = "/login";
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
