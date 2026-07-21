import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Sun, Moon, CheckCheck, ChevronRight, X, FileText, Loader, Trash2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  leida: boolean;
  permisoId?: number | null;
  createdAt: string;
}

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
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState<Notificacion[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const token = localStorage.getItem("sicad_token");

  const fetchUnreadCount = useCallback(() => {
    if (!token) return;
    fetch(`${API}/notificaciones/admin/no-leidas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => { if (json.ok) setNotifCount(json.data); })
      .catch(() => {});
  }, [token]);

  const fetchNotifications = useCallback(() => {
    if (!token) return;
    setLoadingNotifs(true);
    fetch(`${API}/notificaciones/admin`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setNotifications(json.data || []);
      })
      .catch(() => {})
      .finally(() => setLoadingNotifs(false));
  }, [token]);

  const markAsRead = useCallback(async (id: number) => {
    if (!token) return;
    await fetch(`${API}/notificaciones/admin/leer/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    setNotifCount((prev) => Math.max(0, prev - 1));
  }, [token]);

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    await fetch(`${API}/notificaciones/admin/leer-todas`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
    setNotifCount(0);
  }, [token]);

  const eliminarNotificacion = useCallback(async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    await fetch(`${API}/notificaciones/admin/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => {
      const removed = prev.find((n) => n.id === id);
      if (removed && !removed.leida) setNotifCount((c) => Math.max(0, c - 1));
      return prev.filter((n) => n.id !== id);
    });
  }, [token]);

  const eliminarTodasAdmin = useCallback(async () => {
    if (!token) return;
    await fetch(`${API}/notificaciones/admin/todas`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications([]);
    setNotifCount(0);
  }, [token]);

  const handleNotifClick = useCallback((n: Notificacion) => {
    if (!n.leida) markAsRead(n.id);
    setShowPanel(false);
    navigate("/leaves");
  }, [markAsRead, navigate]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (showPanel) fetchNotifications();
  }, [showPanel, fetchNotifications]);

  // Cerrar panel al hacer clic fuera
  useEffect(() => {
    if (!showPanel) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPanel]);

  const formatTimeAgo = (iso: string) => {
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "ahora";
      if (mins < 60) return `hace ${mins} min`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `hace ${hrs}h`;
      const days = Math.floor(hrs / 24);
      return `hace ${days}d`;
    } catch { return ""; }
  };

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

        {/* Notification bell */}
        <div ref={panelRef} className="relative">
          <button
            onClick={() => setShowPanel((p) => !p)}
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

          {/* Dropdown panel */}
          {showPanel && (
            <div
              className={`absolute right-0 top-full mt-2 w-80 md:w-96 rounded-2xl shadow-2xl border overflow-hidden z-[100] ${
                dark ? "bg-[#1E293B] border-white/10" : "bg-white border-slate-200"
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b ${dark ? "border-white/10" : "border-slate-100"}`}>
                <span className={`text-sm font-bold ${dark ? "text-white" : "text-slate-800"}`}>Notificaciones</span>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button onClick={eliminarTodasAdmin}
                      className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                        dark ? "text-red-400 hover:bg-white/10" : "text-red-500 hover:bg-slate-100"
                      }`}
                    >
                      <Trash2 size={13} />
                      Limpiar
                    </button>
                  )}
                  {notifications.some((n) => !n.leida) && (
                    <button onClick={markAllAsRead}
                      className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                        dark ? "text-blue-400 hover:bg-white/10" : "text-blue-600 hover:bg-slate-100"
                      }`}
                    >
                      <CheckCheck size={13} />
                      Leer todas
                    </button>
                  )}
                  <button onClick={() => setShowPanel(false)} className={`p-1 rounded-lg transition-colors cursor-pointer ${dark ? "text-white/50 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}>
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {loadingNotifs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader size={18} className="animate-spin opacity-50" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className={`py-8 text-center text-xs ${dark ? "text-white/30" : "text-slate-400"}`}>
                    <Bell size={20} className="mx-auto mb-2 opacity-40" />
                    No hay notificaciones
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`px-4 py-3 border-b cursor-pointer transition-colors group ${
                        !n.leida
                          ? (dark ? "bg-blue-600/5 border-white/10" : "bg-blue-50/50 border-slate-100")
                          : (dark ? "border-white/5 hover:bg-white/3" : "border-slate-50 hover:bg-slate-50/50")
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          !n.leida
                            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                        }`}>
                          <FileText size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs font-semibold truncate ${!n.leida ? (dark ? "text-white" : "text-slate-800") : (dark ? "text-white/60" : "text-slate-500")}`}>
                              {n.titulo}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={(e) => eliminarNotificacion(n.id, e)}
                                className={`p-1 rounded transition-all opacity-0 group-hover:opacity-100 ${
                                  dark ? "text-red-400 hover:bg-white/10" : "text-red-500 hover:bg-slate-200"
                                }`}
                                title="Eliminar notificación"
                              >
                                <Trash2 size={11} />
                              </button>
                              <span className={`text-[10px] whitespace-nowrap ${dark ? "text-white/30" : "text-slate-400"}`}>
                                {formatTimeAgo(n.createdAt)}
                              </span>
                            </div>
                          </div>
                          <p className={`text-[11px] mt-0.5 line-clamp-2 ${dark ? "text-white/50" : "text-slate-500"}`}>
                            {n.mensaje}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {!n.leida ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            ) : null}
                            {n.permisoId && (
                              <span className={`text-[10px] flex items-center gap-0.5 ${dark ? "text-blue-400/60" : "text-blue-500/60"}`}>
                                <ChevronRight size={10} />
                                Ver permiso
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
