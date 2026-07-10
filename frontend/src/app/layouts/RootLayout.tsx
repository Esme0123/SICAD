import React, { useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/context/AuthContext";

interface RootLayoutProps {
  dark: boolean;
  onToggleDark: () => void;
}

export const RootLayout: React.FC<RootLayoutProps> = ({ dark, onToggleDark }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Redirect to login if user session is not active
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      className={`w-full h-screen flex overflow-hidden ${dark ? "dark" : ""}`}
      style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
    >
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar dark={dark} onToggleDark={onToggleDark} />

        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
};
