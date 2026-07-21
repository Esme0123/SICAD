import React, { createContext, useContext, useEffect } from "react";
import { useEmployeeAuthStore } from "../hooks/useEmployeeAuthStore";

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

interface EmployeeAuthContextType {
  isAuthenticated: boolean;
  user: EmployeeUser | null;
  login: (token: string, user: EmployeeUser) => void;
  logout: () => void;
}

const EmployeeAuthContext = createContext<EmployeeAuthContextType | undefined>(undefined);

export const EmployeeAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, setUser, setToken, clearAuth } = useEmployeeAuthStore();

  useEffect(() => {
    const savedToken = localStorage.getItem("sicad_emp_token");
    if (savedToken && !token) {
      setToken(savedToken);
    }
  }, [token, setToken]);

  const login = (newToken: string, newUser: EmployeeUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    clearAuth();
  };

  return (
    <EmployeeAuthContext.Provider
      value={{
        isAuthenticated: !!token,
        user,
        login,
        logout,
      }}
    >
      {children}
    </EmployeeAuthContext.Provider>
  );
};

export const useEmployeeAuth = () => {
  const context = useContext(EmployeeAuthContext);
  if (context === undefined) {
    throw new Error("useEmployeeAuth must be used within an EmployeeAuthProvider");
  }
  return context;
};
