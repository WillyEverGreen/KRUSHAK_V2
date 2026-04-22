import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const http = axios.create({
  baseURL,
  timeout: 60_000,
});

/* ── Request interceptor: attach JWT ──────────────────────── */
http.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("krushak_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ── Response interceptor: handle expired / invalid token ─── */
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stale credentials but only if it's NOT the auth endpoints
      // (so login/register errors still surface normally)
      const url = error.config?.url || "";
      const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/register");
      if (!isAuthEndpoint) {
        window.localStorage.removeItem("krushak_token");
        window.localStorage.removeItem("krushak_user");
        // Let the component handle re-auth; we don't force redirect here
        // so unauthenticated requests (demo mode) still work smoothly
      }
    }
    return Promise.reject(error);
  }
);
