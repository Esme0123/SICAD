import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Users, Clock, Activity, Check, AlertTriangle, FileText, LogOut, XCircle } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { card } from "@/utils/card";

// ── Tipos de marcación ────────────────────────────────────────
type MarkType = "entrada" | "atraso" | "permiso" | "salida" | "ausente";

interface SuccessLocationState {
  markType?: MarkType;
  employeeName?: string;
  period?: string;
}

interface MarkConfig {
  label:       string;
  description: string;
  icon:        React.ReactNode;
  gradient:    string;
  shadow:      string;
  iconColor:   string;
}

const MARK_CONFIG: Record<MarkType, MarkConfig> = {
  entrada: {
    label:       "¡Asistencia registrada!",
    description: "Entrada registrada correctamente",
    icon:        <Check size={48} strokeWidth={2.5} />,
    gradient:    "linear-gradient(135deg, var(--color-success), #4ADE80)",
    shadow:      "rgba(22,163,74,0.3)",
    iconColor:   "text-white",
  },
  atraso: {
    label:       "Entrada con atraso",
    description: "El registro fue procesado con observación de tardanza",
    icon:        <AlertTriangle size={48} strokeWidth={2.5} />,
    gradient:    "linear-gradient(135deg, var(--color-warning), #FCD34D)",
    shadow:      "rgba(245,158,11,0.3)",
    iconColor:   "text-white",
  },
  permiso: {
    label:       "Permiso registrado",
    description: "La asistencia fue registrada con permiso autorizado",
    icon:        <FileText size={48} strokeWidth={2.5} />,
    gradient:    "linear-gradient(135deg, var(--color-primary), #60A5FA)",
    shadow:      "rgba(15,76,151,0.3)",
    iconColor:   "text-white",
  },
  salida: {
    label:       "¡Salida registrada!",
    description: "Salida registrada correctamente",
    icon:        <LogOut size={48} strokeWidth={2.5} />,
    gradient:    "linear-gradient(135deg, var(--color-success), #4ADE80)",
    shadow:      "rgba(22,163,74,0.3)",
    iconColor:   "text-white",
  },
  ausente: {
    label:       "Marcado como ausente",
    description: "No se encontró asistencia para el periodo actual",
    icon:        <XCircle size={48} strokeWidth={2.5} />,
    gradient:    "linear-gradient(135deg, var(--color-danger), #F87171)",
    shadow:      "rgba(220,38,38,0.3)",
    iconColor:   "text-white",
  },
};

interface SuccessViewProps {
  dark: boolean;
}

export const SuccessView: React.FC<SuccessViewProps> = ({ dark }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const state     = (location.state as SuccessLocationState) ?? {};

  const markType     = state.markType     ?? "entrada";
  const employeeName = state.employeeName ?? "Ana Flores Mendoza";
  const period       = state.period       ?? "10:15 – 11:15";

  const cfg = MARK_CONFIG[markType];

  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          navigate("/attendance/qr");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [navigate]);

  return (
    <div
      className="flex-1 flex items-center justify-center p-6"
      style={{ background: dark ? "var(--background)" : "var(--background)" }}
    >
      <motion.div
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className={`${card(dark)} p-12 flex flex-col items-center gap-7 shadow-2xl`}
        style={{ maxWidth: 440 }}
      >
        {/* Ícono principal — color según tipo de marcación */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 350 }}
          className={`w-24 h-24 rounded-full flex items-center justify-center ${cfg.iconColor}`}
          style={{
            background: cfg.gradient,
            boxShadow: `0 12px 40px ${cfg.shadow}`,
          }}
        >
          {cfg.icon}
        </motion.div>

        {/* Título y descripción */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-center"
        >
          <h2 className={`text-2xl font-bold mb-2 ${dark ? "text-white" : "text-slate-900"}`}>
            {cfg.label}
          </h2>
          <p className={`text-sm ${dark ? "text-white/40" : "text-slate-500"}`}>
            {cfg.description}
          </p>
        </motion.div>

        {/* Detalles del registro */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className={`w-full rounded-2xl p-5 ${dark ? "bg-white/5" : "bg-slate-50"}`}
        >
          <div className="space-y-3.5">
            {[
              { label: "Empleado", value: employeeName,                              icon: <Users    size={14} /> },
              { label: "Periodo",  value: period,                                    icon: <Clock    size={14} /> },
              { label: "Tipo",     value: markType.charAt(0).toUpperCase() + markType.slice(1), icon: <Activity size={14} /> },
              { label: "Hora",     value: new Date().toLocaleTimeString("es-BO"),   icon: <Clock    size={14} /> },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-primary">{item.icon}</span>
                <span className={`text-xs flex-1 ${dark ? "text-white/40" : "text-slate-500"}`}>
                  {item.label}
                </span>
                <span className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-800"}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Botón y cuenta regresiva */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center gap-2"
        >
          <button
            onClick={() => navigate("/attendance/qr")}
            className="px-8 py-3 rounded-xl text-white text-sm font-semibold bg-primary hover:opacity-90 transition-all cursor-pointer shadow-md"
          >
            Volver al QR
          </button>
          <p className={`text-xs ${dark ? "text-white/25" : "text-slate-400"}`}>
            Redirigiendo automáticamente en {countdown}s...
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};
