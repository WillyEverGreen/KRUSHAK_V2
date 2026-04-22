import { create } from "zustand";

function readStoredSession() {
  try {
    const token = window.localStorage.getItem("krushak_token");
    const userRaw = window.localStorage.getItem("krushak_user");
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

const initialSession = readStoredSession();

export const useSessionStore = create((set) => ({
  token: initialSession.token,
  user: initialSession.user,
  languageCode: "en",
  setSession: ({ token, user }) => {
    window.localStorage.setItem("krushak_token", token);
    window.localStorage.setItem("krushak_user", JSON.stringify(user));
    set({ token, user });
  },
  clearSession: () => {
    window.localStorage.removeItem("krushak_token");
    window.localStorage.removeItem("krushak_user");
    set({ token: null, user: null });
  },
  setLanguageCode: (languageCode) => set({ languageCode }),
}));
