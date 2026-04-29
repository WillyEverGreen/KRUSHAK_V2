import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { registerLogoutCallback } from '../services/http';

export const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  isReady: false,

  /** Call once on app start to rehydrate session from SecureStore */
  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync('krushak_token');
      const userStr = await SecureStore.getItemAsync('krushak_user');
      const user = userStr ? JSON.parse(userStr) : null;
      set({ token, user, isReady: true });
    } catch {
      set({ isReady: true });
    }

    // Wire up HTTP interceptor → Zustand logout so 401s auto-redirect
    registerLogoutCallback(() => {
      set({ token: null, user: null });
    });
  },

  login: async ({ token, user }) => {
    await SecureStore.setItemAsync('krushak_token', token);
    await SecureStore.setItemAsync('krushak_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('krushak_token').catch(() => {});
    await SecureStore.deleteItemAsync('krushak_user').catch(() => {});
    set({ token: null, user: null });
  },

  setUser: (user) => {
    set({ user });
    SecureStore.setItemAsync('krushak_user', JSON.stringify(user)).catch(() => {});
  },

  isLoggedIn: () => Boolean(get().token),
}));
