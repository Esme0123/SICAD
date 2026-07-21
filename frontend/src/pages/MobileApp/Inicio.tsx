import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import { Clock, CalendarDays, CheckCircle2, AlertCircle, FileText, Calendar } from "lucide-react";

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
    <div className="p-4 space-y-4">
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
        <p className="text-lg font-bold relative">{greeting},</p>
        <p className="text-2xl font-black mt-0.5 relative">{user?.nombre || "Empleado"}</p>
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
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/app/horarios")}
            className="flex flex-col items-center gap-3 rounded-xl p-5 transition-all active:scale-[0.97] cursor-pointer border"
            style={{
              background: "color-mix(in srgb, var(--primary) 6%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
            }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
            >
              <Calendar size={24} style={{ color: "var(--primary)" }} />
            </div>
            <span className="text-xs font-semibold text-foreground">Mis Horarios</span>
          </button>
          <button
            onClick={() => navigate("/app/permisos")}
            className="flex flex-col items-center gap-3 rounded-xl p-5 transition-all active:scale-[0.97] cursor-pointer border"
            style={{
              background: "color-mix(in srgb, var(--color-secondary, #7C3AED) 6%, transparent)",
              borderColor: "color-mix(in srgb, var(--color-secondary, #7C3AED) 15%, transparent)",
            }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--color-secondary, #7C3AED) 15%, transparent)" }}
            >
              <FileText size={24} style={{ color: "var(--color-secondary, #7C3AED)" }} />
            </div>
            <span className="text-xs font-semibold text-foreground">Mis Permisos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
