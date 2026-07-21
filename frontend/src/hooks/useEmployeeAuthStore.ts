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

export const useEmployeeAuthStore = create<EmployeeAuthState>((set) => ({
  user: null,
  token: null,
  setUser: (user) => set({ user }),
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
    set({ user: null, token: null });
  },
}));
