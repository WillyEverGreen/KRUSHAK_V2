import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// ── API base URL ─────────────────────────────────────────────
// EXPO_PUBLIC_API_BASE_URL is read from .env at bundle time.
// For Android emulator: http://10.0.2.2:5000/api
// For Expo Go on a physical device: http://<your-local-IP>:5000/api
//   e.g. http://192.168.1.42:5000/api  — update .env to match your machine's IP.
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:5000/api';

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
});

/* ── Logout callback (set by authStore to avoid circular deps) */
let _logoutCallback = null;
export function registerLogoutCallback(fn) {
  _logoutCallback = fn;
}

/* ── Request interceptor: attach JWT ─────────────────────────── */
http.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('krushak_token').catch(() => null);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ── Response interceptor: handle 401 ───────────────────────── */
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint =
        url.includes('/auth/login') || url.includes('/auth/register');
      if (!isAuthEndpoint) {
        // Wipe stored credentials
        await SecureStore.deleteItemAsync('krushak_token').catch(() => {});
        await SecureStore.deleteItemAsync('krushak_user').catch(() => {});
        // Trigger Zustand logout so navigation updates immediately
        if (_logoutCallback) _logoutCallback();
      }
    }
    return Promise.reject(error);
  },
);
