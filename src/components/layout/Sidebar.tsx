import React from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  Users,
  Calendar,
  QrCode,
  ClipboardList,
  BarChart2,
  Settings as SettingsIcon,
  LogOut,
  Menu,
} from "lucide-react";
import { UCBLogo } from "../common/UCBLogo";
import { useAuth } from "@/context/AuthContext";

type NavId =
  | "dashboard"
  | "employees"
  | "periods"
  | "qr"
  | "history"
  | "reports"
  | "settings";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems: { id: NavId; label: string; path: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: <Home size={18} /> },
  { id: "employees", label: "Empleados", path: "/employees", icon: <Users size={18} /> },
  { id: "periods", label: "Periodos", path: "/attendance/periods", icon: <Calendar size={18} /> },
  { id: "qr", label: "Pantalla QR", path: "/attendance/qr", icon: <QrCode size={18} /> },
  { id: "history", label: "Historial", path: "/attendance/history", icon: <ClipboardList size={18} /> },
  { id: "reports", label: "Reportes", path: "/reports", icon: <BarChart2 size={18} /> },
  { id: "settings", label: "Configuración", path: "/settings", icon: <SettingsIcon size={18} /> },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { logout } = useAuth();

  return (
    <motion.aside
      animate={{ width: collapsed ? 66 : 236 }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      className="flex flex-col h-full flex-shrink-0 overflow-hidden"
      style={{ background: "#6A1B9A" }} // Morado UCB
    >
      {/* Logo / toggle */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 flex-shrink-0">
        <button
          onClick={onToggle}
          className="text-white/50 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
        >
          <Menu size={18} />
        </button>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5 overflow-hidden"
            >
              <UCBLogo size={30} />
              <div className="leading-none">
                <p className="text-white font-bold text-sm">SICAD</p>
                <p className="text-white/35 text-[10px] mt-0.5">Centro de Cómputo</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-left ${
                isActive ? "text-white bg-white/14 font-medium" : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="flex-shrink-0">{item.icon}</span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && !collapsed && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: "#64B5F6" }} // Celeste accent indicator
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-white/10 p-2 flex-shrink-0">
        {!collapsed && (
          <div
            className="px-3 py-2.5 mb-1 rounded-xl"
            style={{ background: "rgba(100, 181, 246, 0.10)" }} // Light celeste background
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[#6A1B9A]"
                style={{ background: "#64B5F6" }} // Celeste background for avatar initial
              >
                A
              </div>
              <div className="leading-none">
                <p className="text-white text-xs font-semibold">Admin UCB</p>
                <p className="text-white/35 text-[10px] mt-0.5">Administrador</p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all text-sm cursor-pointer"
        >
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && <span className="font-medium">Cerrar sesión</span>}
        </button>
      </div>

      {/* Celeste stripe */}
      <div
        className="h-1 flex-shrink-0"
        style={{
          background: "linear-gradient(90deg, #64B5F6 0%, #90CAF9 50%, #64B5F6 100%)",
        }}
      />
    </motion.aside>
  );
};
