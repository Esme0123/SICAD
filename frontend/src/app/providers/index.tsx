import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../../context/AuthContext";
import { EmployeeAuthProvider } from "../../context/EmployeeAuthContext";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EmployeeAuthProvider>
          {children}
        </EmployeeAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
