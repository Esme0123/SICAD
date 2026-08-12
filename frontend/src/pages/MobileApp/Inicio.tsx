import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import { Clock, CalendarDays, CheckCircle2, AlertCircle, FileText, Calendar, Scan, Loader2, CheckCircle, XCircle, AlertTriangle, Repeat } from "lucide-react";
import { UCBLogo } from "@/components/common/UCBLogo";

const API = import.meta.env.VITE_API_URL;

export const MobileInicio: React.FC = () => {
  const { user, isAuthenticated } = useEmployeeAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [reemplazosPendientes, setReemplazosPendientes] = useState(0);
  const attendanceData = location.state?.attendanceData || null;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (location.state?.showSuccessModal) {
      setShowSuccess(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(() => setShowSuccess(false), 3000);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      setShowNotifPrompt(false);
      return;
    }
    const prompted = sessionStorage.getItem('notifications_prompted');
    if (!prompted && Notification.permission === 'default') {
      setShowNotifPrompt(true);
    }
  }, []);

  const fetchReemplazosPendientes = useCallback(async () => {
    if (!user || !isAuthenticated) return;
    try {
      const token = localStorage.getItem("sicad_emp_token");
      const res = await fetch(`${API}/reemplazos/mis-solicitudes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const recibidas = json.data?.recibidas || [];
      setReemplazosPendientes(recibidas.filter((s) => s.estado === "PENDIENTE").length);
    } catch {
      setReemplazosPendientes(0);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    fetchReemplazosPendientes();
    const onFocus = () => fetchReemplazosPendientes();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchReemplazosPendientes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return <Navigate replace to="/app/login" />;
  }

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  })();

  const handleDismissNotif = () => {
    localStorage.setItem("notif_dismissed", "true");
    setShowNotifPrompt(false);
  };

  const handleAcceptNotif = async () => {
    if (!('Notification' in window)) {
      setShowNotifPrompt(false);
      return;
    }

    if (Notification.permission === 'denied') {
      alert(
        '📱 Las notificaciones están desactivadas en los ajustes de tu teléfono.\n\n' +
        'Para activarlas:\n' +
        '1. Ve a los Ajustes / Configuración de tu teléfono.\n' +
        '2. Entra en "Aplicaciones" > Selecciona esta PWA (SICAD).\n' +
        '3. Ve a "Permisos" > "Notificaciones" y selecciona PERMITIR.'
      );
      sessionStorage.setItem('notifications_prompted', 'true');
      setShowNotifPrompt(false);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('Permiso PWA obtenido:', permission);
      if (permission === 'granted' && 'serviceWorker' in navigator) {
        try {
          const { suscribirPush } = await import('@/utils/notifications.utils');
          await suscribirPush();
        } catch {}
      }
    } catch (error) {
      console.error('Error al pedir permiso en PWA:', error);
    } finally {
      sessionStorage.setItem('notifications_prompted', 'true');
      setShowNotifPrompt(false);
    }
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="rounded-2xl p-8 text-center max-w-xs mx-4" style={{ background: "var(--card)", color: "var(--card-foreground)" }}>
              <CheckCircle size={56} className="mx-auto mb-4 text-emerald-500" />
              <p className="text-lg font-bold">¡Asistencia registrada!</p>
              <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>Tu marcación se ha guardado correctamente.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showNotifPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-2 p-3 rounded-xl flex items-center gap-3"
          style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}
        >
          <p className="text-xs flex-1">Activa las notificaciones para recibir alertas de tus marcaciones.</p>
          <button onClick={handleAcceptNotif} className="text-xs font-bold px-2.5 py-1.5 rounded-lg cursor-pointer" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>Activar</button>
          <button onClick={handleDismissNotif} className="text-xs px-2 py-1.5 rounded-lg text-muted-foreground cursor-pointer">Ahora no</button>
        </motion.div>
      )}

      {/* Aviso flotante: solicitudes de reemplazo pendientes */}
      <AnimatePresence>
        {reemplazosPendientes > 0 && (
          <motion.button
            key="reemp-banner"
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            onClick={() => navigate("/app/reemplazos")}
            whileTap={{ scale: 0.97 }}
            className="mx-4 mt-2 w-[calc(100%-2rem)] rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer text-left shadow-lg"
            style={{
              background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 55%, #FCD34D 100%)",
              color: "#451A03",
              border: "1px solid rgba(217,119,6,0.4)",
              boxShadow: "0 6px 22px rgba(245,158,11,0.35)",
            }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,255,255,0.28)" }}
            >
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black leading-tight">
                ⚠️ Tienes {reemplazosPendientes === 1 ? "1 solicitud" : `${reemplazosPendientes} solicitudes`} de reemplazo pendiente{reemplazosPendientes === 1 ? "" : "s"}
              </p>
              <p className="text-[11px] font-semibold mt-0.5 opacity-75 flex items-center gap-1">
                <Repeat size={11} /> Toca para revisar y responder
              </p>
            </div>
            <AlertCircle size={18} className="shrink-0 opacity-70" />
          </motion.button>
        )}
      </AnimatePresence>

    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4"
    >
      <div
        onClick={() => navigate('/app/perfil')}
        className="relative overflow-hidden rounded-2xl p-5 cursor-pointer hover:opacity-90 transition-opacity"
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--secondary, #7C3AED)) 100%)",
          color: "var(--primary-foreground)",
        }}
      >
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10"
          style={{ background: "var(--primary-foreground)" }}
        />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-10"
          style={{ background: "var(--primary-foreground)" }}
        />
        <div className="flex items-center justify-between relative">
          <div>
            <p className="text-lg font-bold">{greeting},</p>
            <p className="text-2xl font-black mt-0.5">{user?.nombre || "Empleado"}</p>
          </div>
          <UCBLogo size={48} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-4 text-primary-foreground/80 text-sm relative">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} />
            {now.toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            {now.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {user && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">Información General</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 border"
              style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
            >
              <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>CÓDIGO</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{user?.codigo}</p>
            </div>
            <div className="rounded-xl p-3 border"
              style={{
                background: user?.activo
                  ? "color-mix(in srgb, var(--color-success, #10B981) 8%, transparent)"
                  : "color-mix(in srgb, var(--color-danger, #EF4444) 8%, transparent)",
                borderColor: user?.activo
                  ? "color-mix(in srgb, var(--color-success, #10B981) 20%, transparent)"
                  : "color-mix(in srgb, var(--color-danger, #EF4444) 20%, transparent)",
              }}
            >
              <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>ESTADO</p>
              <p className={`text-sm font-bold mt-0.5 flex items-center gap-1 ${
                user?.activo ? "text-[var(--color-success,#10B981)]" : "text-[var(--color-danger,#EF4444)]"
              }`}>
                {user?.activo ? (
                  <><CheckCircle2 size={12} /> Activo</>
                ) : (
                  <><AlertCircle size={12} /> Inactivo</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="text-sm font-bold text-foreground mb-4">Acceso Rápido</h3>
        <div className="grid grid-cols-3 gap-3">
          <motion.button
            onClick={() => navigate("/app/horarios")}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            className="flex flex-col items-center gap-3 rounded-xl p-4 transition-all cursor-pointer border"
            style={{
              background: "color-mix(in srgb, var(--primary) 6%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
            }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
            >
              <Calendar size={20} style={{ color: "var(--primary)" }} />
            </div>
            <span className="text-[10px] font-semibold text-foreground leading-tight text-center">Horarios</span>
          </motion.button>
          <motion.button
            data-tour="qr-btn"
            onClick={() => navigate("/app/escaner")}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            className="flex flex-col items-center gap-3 rounded-xl p-4 transition-all cursor-pointer border-0 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)",
              boxShadow: "0 4px 20px rgba(5, 150, 105, 0.35), 0 0 0 1px rgba(16, 185, 129, 0.15)",
            }}
          >
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-20"
              style={{ background: "rgba(255,255,255,0.3)" }}
            />
            <div className="absolute -bottom-3 -left-3 w-10 h-10 rounded-full opacity-20"
              style={{ background: "rgba(255,255,255,0.3)" }}
            />
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <Scan size={20} style={{ color: "#fff" }} />
            </div>
            <span className="text-[10px] font-semibold leading-tight text-center" style={{ color: "#fff" }}>Escanear QR</span>
            <motion.div
              className="absolute inset-0 rounded-xl"
              style={{ boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.5)" }}
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(5, 150, 105, 0.4)",
                  "0 0 0 10px rgba(5, 150, 105, 0)",
                  "0 0 0 0 rgba(5, 150, 105, 0)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.button>
          <motion.button
            onClick={() => navigate("/app/permisos")}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            className="flex flex-col items-center gap-3 rounded-xl p-4 transition-all cursor-pointer border"
            style={{
              background: "color-mix(in srgb, var(--color-secondary, #7C3AED) 6%, transparent)",
              borderColor: "color-mix(in srgb, var(--color-secondary, #7C3AED) 15%, transparent)",
            }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--color-secondary, #7C3AED) 15%, transparent)" }}
            >
              <FileText size={20} style={{ color: "var(--color-secondary, #7C3AED)" }} />
            </div>
            <span className="text-[10px] font-semibold text-foreground leading-tight text-center">Permisos</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
    </div>
  );
};
