import React, { createContext, useContext, useEffect } from "react";
import { useAuthStore } from "../hooks/useAuthStore";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { id: string; name: string; email: string; role: string } | null;
  login: (token: string, user: { id: string; name: string; email: string; role: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, setUser, setToken, clearAuth } = useAuthStore();

  useEffect(() => {
    // Restaura el token desde localStorage al montar la app.
    // El objeto user se reestablece cuando el usuario vuelve a iniciar sesión
    // o cuando se implemente GET /api/auth/me.
    const savedToken = localStorage.getItem("sicad_token");
    if (savedToken && !token) {
      setToken(savedToken);
    }
  }, [token, setToken]);

  const login = (newToken: string, newUser: { id: string; name: string; email: string; role: string }) => {
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    clearAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
