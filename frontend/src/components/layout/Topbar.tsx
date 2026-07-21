import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Bell, Sun, Moon } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

interface TopbarProps {
  dark: boolean;
  onToggleDark: () => void;
}

const screenMeta: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Vista general — Centro de Cómputo UCB" },
  "/employees": { title: "Gestión de Empleados", subtitle: "Administra el personal y auxiliares del Centro" },
  "/leaves": { title: "Gestión de Permisos", subtitle: "Administra los permisos del personal" },
  "/attendance/periods": { title: "Asignación de Periodos", subtitle: "Configura los horarios de cada empleado" },
  "/attendance/qr": { title: "Pantalla QR", subtitle: "Código de registro de asistencia activo" },
  "/attendance/success": { title: "Pantalla QR", subtitle: "Asistencia registrada exitosamente" },
  "/attendance/history": { title: "Historial de Asistencias", subtitle: "Consulta, filtra y exporta los registros" },
  "/reports": { title: "Reportes y Análisis", subtitle: "Estadísticas de cumplimiento y asistencia" },
  "/settings": { title: "Configuración", subtitle: "Usuarios, roles, respaldos y auditoría" },
};

export const Topbar: React.FC<TopbarProps> = ({ dark, onToggleDark }) => {
  const location = useLocation();
  const [now, setNow] = useState(new Date());
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch admin unread notifications
  const fetchUnreadCount = () => {
    const token = localStorage.getItem("sicad_token");
    if (!token) return;
    fetch(`${API}/notificaciones/admin/no-leidas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setNotifCount(json.data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const meta = screenMeta[location.pathname] || {
    title: "SICAD",
    subtitle: "Sistema Inteligente de Control de Asistencia Digital",
  };

  return (
    <header
      className={`flex items-center justify-between px-6 h-16 border-b flex-shrink-0 ${dark ? "bg-[#1E293B] border-white/8" : "bg-white border-slate-100"
        }`}
    >
      <div className="flex flex-col justify-center">
        <h2 className={`text-base font-semibold leading-tight ${dark ? "text-white" : "text-slate-900"}`}>
          {meta.title}
        </h2>
        <p className={`text-xs mt-0.5 ${dark ? "text-white/30" : "text-slate-400"}`}>
          {meta.subtitle}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-mono tabular-nums ${dark ? "text-white/35" : "text-slate-400"}`}>
          {now.toLocaleTimeString("es-BO")} &nbsp;·&nbsp;{" "}
          {now.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
        <div className={`w-px h-5 mx-1 ${dark ? "bg-white/10" : "bg-slate-200"}`} />
        <button
          className={`relative p-2 rounded-xl transition-all cursor-pointer ${dark ? "hover:bg-white/6 text-white/40" : "hover:bg-slate-100 text-slate-500"
            }`}
        >
          <Bell size={17} />
          {notifCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: "#EF4444" }}
            >
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </button>
        <button
          onClick={onToggleDark}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${dark ? "hover:bg-white/6 text-yellow-400" : "hover:bg-slate-100 text-slate-500"
            }`}
        >
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <div className="flex items-center gap-2 pl-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "#6A1B9A" }} // Morado UCB
          >
            A
          </div>
        </div>
      </div>
    </header>
  );
};
