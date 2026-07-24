import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import { Clock, CalendarDays, CheckCircle2, AlertCircle, FileText, Calendar, Scan } from "lucide-react";
import { UCBLogo } from "@/components/common/UCBLogo";

export const MobileInicio: React.FC = () => {
  const { user } = useEmployeeAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4"
    >
      <div className="relative overflow-hidden rounded-2xl p-5"
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
              <p className="text-sm font-bold text-foreground mt-0.5">{user.codigo}</p>
            </div>
            <div className="rounded-xl p-3 border"
              style={{
                background: user.activo
                  ? "color-mix(in srgb, var(--color-success, #10B981) 8%, transparent)"
                  : "color-mix(in srgb, var(--color-danger, #EF4444) 8%, transparent)",
                borderColor: user.activo
                  ? "color-mix(in srgb, var(--color-success, #10B981) 20%, transparent)"
                  : "color-mix(in srgb, var(--color-danger, #EF4444) 20%, transparent)",
              }}
            >
              <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>ESTADO</p>
              <p className={`text-sm font-bold mt-0.5 flex items-center gap-1 ${
                user.activo ? "text-[var(--color-success,#10B981)]" : "text-[var(--color-danger,#EF4444)]"
              }`}>
                {user.activo ? (
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
  );
};
