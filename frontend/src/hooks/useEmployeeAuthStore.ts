import { create } from "zustand";

interface EmployeeUser {
  id: number;
  nombre: string;
  codigo: string;
  email: string;
  ci: string | null;
  celular: string | null;
  rol: string;
  activo: boolean;
  horasBase: number;
  horasProgramadas: number;
}

interface EmployeeAuthState {
  user: EmployeeUser | null;
  token: string | null;
  setUser: (user: EmployeeUser | null) => void;
  setToken: (token: string | null) => void;
  clearAuth: () => void;
}

function loadFromStorage(): { token: string | null; user: EmployeeUser | null } {
  try {
    const token = localStorage.getItem("sicad_emp_token");
    const raw = localStorage.getItem("sicad_emp_user");
    const user = raw ? JSON.parse(raw) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export const useEmployeeAuthStore = create<EmployeeAuthState>((set) => ({
  ...loadFromStorage(),
  setUser: (user) => {
    if (user) {
      localStorage.setItem("sicad_emp_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("sicad_emp_user");
    }
    set({ user });
  },
  setToken: (token) => {
    if (token) {
      localStorage.setItem("sicad_emp_token", token);
    } else {
      localStorage.removeItem("sicad_emp_token");
    }
    set({ token });
  },
  clearAuth: () => {
    localStorage.removeItem("sicad_emp_token");
    localStorage.removeItem("sicad_emp_user");
    set({ user: null, token: null });
  },
}));
