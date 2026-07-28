import React, { useState, useMemo } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";

const KIOSKO_ONLY = ["/attendance/qr", "/attendance/success"];

interface RootLayoutProps {
  dark: boolean;
  onToggleDark: () => void;
}

export const RootLayout: React.FC<RootLayoutProps> = ({ dark, onToggleDark }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Redirect to login if user session is not active
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const rawRole = (user?.rol || user?.role || "").toUpperCase();
  if (rawRole === "KIOSKO" && !KIOSKO_ONLY.includes(location.pathname)) {
    return <Navigate to="/attendance/qr" replace />;
  }
  if (rawRole === "COORDINADOR" && location.pathname === "/settings") {
    return <Navigate to="/dashboard" replace />;
  }

  if (rawRole === "KIOSKO") {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center">
        <Outlet />
      </div>
    );
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
      <Toaster />
    </div>
  );
};
