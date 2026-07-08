import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Users, Clock, Activity, Check } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { card } from "@/utils/card";

interface SuccessViewProps {
  dark: boolean;
}

export const SuccessView: React.FC<SuccessViewProps> = ({ dark }) => {
  const navigate = useNavigate();
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
      style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}
    >
      <motion.div
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className={`${card(dark)} p-12 flex flex-col items-center gap-7 shadow-2xl`}
        style={{ maxWidth: 440 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 350 }}
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #2E7D32, #4CAF50)",
            boxShadow: "0 12px 40px rgba(46,125,50,0.3)",
          }}
        >
          <Check size={48} className="text-white" strokeWidth={2.5} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-center"
        >
          <h2 className={`text-2xl font-bold mb-2 ${dark ? "text-white" : "text-slate-900"}`}>
            ¡Asistencia registrada!
          </h2>
          <p className={`text-sm ${dark ? "text-white/40" : "text-slate-500"}`}>
            El registro fue procesado correctamente
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className={`w-full rounded-2xl p-5 ${dark ? "bg-white/5" : "bg-slate-50"}`}
        >
          <div className="space-y-3.5">
            {[
              { label: "Empleado", value: "Ana Flores Mendoza", icon: <Users size={14} /> },
              { label: "Periodo", value: "10:15 – 11:15", icon: <Clock size={14} /> },
              {
                label: "Hora",
                value: new Date().toLocaleTimeString("es-BO"),
                icon: <Activity size={14} />,
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[#6A1B9A]">{item.icon}</span>
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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center gap-2"
        >
          <button
            onClick={() => navigate("/attendance/qr")}
            className="px-8 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all cursor-pointer"
            style={{ background: "#6A1B9A" }}
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
