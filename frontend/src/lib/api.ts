import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,  // Keep for cookie fallback (desktop)
});

// ── Token Storage Helpers ─────────────────────────────────────────────────────
export const tokenStorage = {
  getAccess: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  },
  getRefresh: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refresh_token");
  },
  set: (access: string, refresh: string) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
  },
  clear: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
};

// ── Request: Add Authorization header from localStorage ───────────────────────
api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// ── Response: Auto-refresh on 401 ────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (original.url?.includes("/auth/login") || original.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = tokenStorage.getRefresh();
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/refresh`,
          { refresh_token: refreshToken || "" },
          { withCredentials: true }
        );
        // Save new tokens
        if (data?.access_token) {
          tokenStorage.set(data.access_token, data.refresh_token || refreshToken || "");
        }
        return api(original);
      } catch {
        tokenStorage.clear();
        if (!window.location.pathname.startsWith("/auth/")) {
          window.location.href = "/auth/login?error=session_expired";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
