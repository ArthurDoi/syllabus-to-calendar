import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,  // Send cookies automatically in all requests
});

// ── Request: Add access token from cookies if available ─────────────────────
api.interceptors.request.use((config) => {
  // Cookies are sent automatically with withCredentials: true
  // No need to manually add Authorization header
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
        // Call refresh endpoint - backend will set new cookies
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refresh_token: "" },  // Backend gets token from cookies
          { withCredentials: true }  // Send refresh token cookie
        );
        // Backend sets new cookies, just retry original request
        return api(original);
      } catch {
        // Refresh failed, redirect to login ONLY if not already on the auth pages
        if (!window.location.pathname.startsWith("/auth/")) {
          window.location.href = "/auth/login?error=session_expired";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
