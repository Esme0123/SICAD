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
    // Check local storage on mount
    const savedToken = localStorage.getItem("sicad_token");
    if (savedToken && !token) {
      setToken(savedToken);
      // Here you would normally fetch current user info
      setUser({
        id: "1",
        name: "Admin UCB",
        email: "admin@ucb.edu.bo",
        role: "Administrador",
      });
    }
  }, [token, setToken, setUser]);

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
