import { create } from "zustand";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  session: {
    isActive: boolean;
    expiresAt?: string;
  } | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setSession: (session: AuthState["session"]) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  session: null,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem("sicad_token", token);
    } else {
      localStorage.removeItem("sicad_token");
    }
    set({ token });
  },
  setSession: (session) => set({ session }),
  clearAuth: () => {
    localStorage.removeItem("sicad_token");
    set({ user: null, token: null, session: null });
  },
}));
