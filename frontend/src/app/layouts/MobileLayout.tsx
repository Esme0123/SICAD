import React, { useState, useEffect, useCallback } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Home, Calendar, FileText, ScrollText, User, LogOut, Sun, Moon, Bell, X, CheckCheck, Trash2, HelpCircle, Scan, Clock, ClipboardList, ShieldCheck, UserCircle } from "lucide-react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import { Toaster } from "@/components/ui/sonner";
import { GuideModal, GuideStep } from "@/components/ui/GuideModal";
import { UCBLogo } from "@/components/common/UCBLogo";

const API = import.meta.env.VITE_API_URL;

interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
}

const navItems = [
  { to: "/app/inicio",    icon: Home,       label: "Inicio" },
  { to: "/app/horarios",  icon: Calendar,   label: "Horarios" },
  { to: "/app/historial", icon: ScrollText,  label: "Historial" },
  { to: "/app/permisos",  icon: FileText,   label: "Permisos" },
  { to: "/app/perfil",    icon: User,        label: "Perfil" },
];

async function apiGet(path: string) {
  const token = localStorage.getItem("sicad_emp_token");
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.message || "Error de API");
  return json;
}

async function apiPatch(path: string) {
  const token = localStorage.getItem("sicad_emp_token");
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.message || "Error de API");
  return json;
}

async function apiDelete(path: string) {
  const token = localStorage.getItem("sicad_emp_token");
  const res = await fetch(`${API}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.message || "Error de API");
  return json;
}

export const MobileLayout: React.FC = () => {
  const { isAuthenticated, user, logout } = useEmployeeAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dark, setDark] = useState(false);
  const [notis, setNotis] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const mobileGuideSteps: GuideStep[] = [
    {
      icon: <Scan size={32} />,
      title: "Inicio y Escaneo QR",
      description: "Desde la pantalla de inicio, usa el botón \"Escanear QR\" para marcar tu entrada y salida. El código QR activo se muestra en la pantalla del Centro de Cómputo.",
      color: "#10B981",
      action: { label: "Probar Escáner", onClick: () => navigate("/app/escaner") },
    },
    {
      icon: <Calendar size={32} />,
      title: "Mis Horarios",
      description: "Revisa tus horarios y materias asignadas por día. Selecciona el día de la semana para ver los bloques y exporta tu horario a PDF o Excel.",
      color: "#3B82F6",
    },
    {
      icon: <ClipboardList size={32} />,
      title: "Historial de Asistencia",
      description: "Consulta tu historial con filtros por día, semana, mes o periodo. Revisa si llegaste puntual, con atraso o si faltaste. Exporta a PDF o Excel.",
      color: "#8B5CF6",
    },
    {
      icon: <ShieldCheck size={32} />,
      title: "Gestión de Permisos",
      description: "Crea solicitudes de permiso seleccionando la fecha, los periodos a cubrir y el motivo. Adjunta archivos y verifica el estado de aprobación.",
      color: "#F59E0B",
    },
    {
      icon: <UserCircle size={32} />,
      title: "Mi Perfil",
      description: "Visualiza tu información personal, código de empleado y rol. También puedes cambiar tu contraseña desde la sección de perfil.",
      color: "#EC4899",
    },
  ];

  useEffect(() => {
    const saved = localStorage.getItem("sicad_theme");
    if (saved === "dark" || saved === "light") {
      setDark(saved === "dark");
    } else {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      setDark(mq.matches);
      const handler = (e: MediaQueryListEvent) => setDark(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem("sicad_theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  const fetchNotis = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiGet("/notificaciones/mis-notificaciones");
      setNotis(res.data || []);
      const resCount = await apiGet("/notificaciones/no-leidas");
      setNoLeidas(resCount.data || 0);
    } catch {}
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotis([]);
      setNoLeidas(0);
      return;
    }
    fetchNotis();
    const interval = setInterval(fetchNotis, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotis]);

  const marcarLeida = async (id: number) => {
    try {
      await apiPatch(`/notificaciones/${id}/leer`);
      setNotis((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
      setNoLeidas((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const marcarTodasLeidas = async () => {
    try {
      await apiPatch("/notificaciones/leer-todas");
      setNotis((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNoLeidas(0);
    } catch {}
  };

  const eliminarNotificacion = async (id: number) => {
    try {
      await apiDelete(`/notificaciones/${id}`);
      setNotis((prev) => prev.filter((n) => n.id !== id));
      setNoLeidas((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const eliminarTodas = async () => {
    try {
      await apiDelete("/notificaciones/todas");
      setNotis([]);
      setNoLeidas(0);
    } catch {}
  };

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/app/login", { replace: true });
  };

  const hideNav = location.pathname === "/app/marcar";

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden ${dark ? "dark" : ""}`}
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <header className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <UCBLogo size={22} />
          <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>SICAD</span>
        </div>
        <div className="flex items-center gap-1">
          {user && (
            <span className="text-xs truncate max-w-[80px]" style={{ color: "var(--muted-foreground)" }}>
              {user.nombre}
            </span>
          )}
          <div className="relative">
            <button
              onClick={() => { setPanelOpen(!panelOpen); if (!panelOpen) fetchNotis(); }}
              className="p-1.5 rounded-lg transition-colors relative"
              style={{ color: "var(--muted-foreground)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--foreground)"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}
              title="Notificaciones"
            >
              <Bell size={16} />
              {noLeidas > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{ background: "var(--color-danger)", color: "#fff" }}
                >
                  {noLeidas > 9 ? "9+" : noLeidas}
                </span>
              )}
            </button>

            {/* Notification Panel */}
            {panelOpen && (
              <div className="fixed inset-0 z-50" onClick={() => setPanelOpen(false)}>
                <div className="absolute top-12 right-2 w-80 max-w-[calc(100vw-16px)] rounded-xl shadow-2xl border max-h-[70vh] flex flex-col"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <h3 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Notificaciones</h3>
                    <div className="flex items-center gap-1">
                      {notis.length > 0 && (
                        <button onClick={eliminarTodas} className="p-1 rounded hover:opacity-70" style={{ color: "var(--color-danger, #EF4444)" }} title="Eliminar todas">
                          <Trash2 size={13} />
                        </button>
                      )}
                      {noLeidas > 0 && (
                        <button onClick={marcarTodasLeidas} className="p-1 rounded" style={{ color: "var(--muted-foreground)" }} title="Marcar todas como leídas">
                          <CheckCheck size={14} />
                        </button>
                      )}
                      <button onClick={() => setPanelOpen(false)} className="p-1 rounded" style={{ color: "var(--muted-foreground)" }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notis.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Sin notificaciones</p>
                      </div>
                    ) : (
                      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                        {notis.map((n) => (
                          <div
                            key={n.id}
                            className="px-4 py-3 transition-colors group"
                            style={{
                              background: n.leida ? "transparent" : "color-mix(in srgb, var(--primary) 4%, transparent)",
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !n.leida && marcarLeida(n.id)}>
                                <p className="text-xs font-bold" style={{ color: "var(--foreground)" }}>{n.titulo}</p>
                                <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{n.mensaje}</p>
                                <p className="text-[9px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                                  {new Date(n.createdAt).toLocaleString("es-BO")}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                <button
                                  onClick={() => eliminarNotificacion(n.id)}
                                  className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ color: "var(--color-danger, #EF4444)" }}
                                  title="Eliminar notificación"
                                >
                                  <Trash2 size={12} />
                                </button>
                                {!n.leida && (
                                  <div className="w-2 h-2 rounded-full"
                                    style={{ background: "var(--primary)" }}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--muted-foreground)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--foreground)"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}
            title={dark ? "Modo claro" : "Modo oscuro"}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--muted-foreground)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--destructive)"; e.currentTarget.style.background = "color-mix(in srgb, var(--destructive) 10%, transparent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-16"
        style={{ background: "var(--background)" }}
      >
        <Outlet />
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
            {navItems.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to || location.pathname.startsWith(to + "/");
              return (
                <NavLink
                  key={to}
                  to={to}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all relative"
                  style={{ color: isActive ? "var(--primary)" : "var(--muted-foreground)" }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--foreground)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "var(--muted-foreground)"; }}
                >
                  {isActive && (
                    <div className="absolute -top-px left-1/4 right-1/4 h-0.5 rounded-b-full"
                      style={{ background: "var(--primary)" }}
                    />
                  )}
                  <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-medium">{label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
      <Toaster />

      {/* Floating Guide Button */}
      <motion.button
        onClick={() => setGuideOpen(true)}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.1 }}
        className="fixed z-30 w-10 h-10 rounded-full flex items-center justify-center shadow-lg cursor-pointer border-0"
        style={{
          background: "linear-gradient(135deg, #F4B400, #EAA300)",
          color: "#1E293B",
          boxShadow: "0 2px 12px rgba(244, 180, 0, 0.4)",
          bottom: "80px",
          left: "16px",
        }}
        title="Guía de uso"
      >
        <HelpCircle size={18} />
      </motion.button>

      {guideOpen && (
        <GuideModal steps={mobileGuideSteps} onClose={() => setGuideOpen(false)} variant="mobile" />
      )}
    </div>
  );
};

