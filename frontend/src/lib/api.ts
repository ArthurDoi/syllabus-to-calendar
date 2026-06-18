import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export const tokenStorage = {
  getAccess: () => null,
  getRefresh: () => null,
  set: (_a: string, _r: string) => {},
  clear: () => {},
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      original.url?.includes("/auth/login") ||
      original.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        return api(original);
      } catch {
        if (!window.location.pathname.startsWith("/auth/")) {
          window.location.href = "/auth/login?error=session_expired";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;