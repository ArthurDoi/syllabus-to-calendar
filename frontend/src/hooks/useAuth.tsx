"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/services";
import type { UserResponse } from "@/types";

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Khôi phục session khi reload - check từ cookies via API call
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const me = await authService.me();
        setUser(me);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for token updates (e.g., from OAuth callback)
    const handleTokenUpdate = () => {
      setLoading(true);
      checkAuth();
    };

    window.addEventListener("auth-tokens-updated", handleTokenUpdate);
    return () => window.removeEventListener("auth-tokens-updated", handleTokenUpdate);
  }, []);

  const login = async (email: string, password: string) => {
    // Backend sets HttpOnly cookies automatically
    // Just call login and let API handle cookies
    await authService.login({ username: email, password });

    // Fetch user info to verify login worked
    const me = await authService.me();
    setUser(me);
    router.push("/courses");
  };

  const register = async (email: string, password: string, name?: string) => {
    await authService.register({ email, password, name });
    await login(email, password);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    router.push("/auth/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
