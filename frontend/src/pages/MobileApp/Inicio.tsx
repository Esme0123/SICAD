import React, { useState, useEffect } from "react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import { Clock, CalendarDays, CheckCircle2, AlertCircle, FileText } from "lucide-react";

export const MobileInicio: React.FC = () => {
  const { user } = useEmployeeAuth();
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
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl p-5">
        <p className="text-lg font-bold">{greeting},</p>
        <p className="text-2xl font-black mt-0.5">{user?.nombre || "Empleado"}</p>
        <div className="flex items-center gap-3 mt-4 text-primary-foreground/80 text-sm">
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
            <div className="bg-muted rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Código</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{user.codigo}</p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Estado</p>
              <p className={`text-sm font-bold mt-0.5 flex items-center gap-1 ${user.activo ? "text-success" : "text-destructive"}`}>
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
        <h3 className="text-sm font-bold text-foreground mb-3">Acceso Rápido</h3>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="/app/horarios"
            className="flex flex-col items-center gap-2 bg-muted rounded-xl p-4 hover:bg-muted/80 transition-colors"
          >
            <CalendarDays size={24} className="text-primary" />
            <span className="text-xs font-medium text-foreground">Mis Horarios</span>
          </a>
          <a
            href="/app/permisos"
            className="flex flex-col items-center gap-2 bg-muted rounded-xl p-4 hover:bg-muted/80 transition-colors"
          >
            <FileText size={24} className="text-primary" />
            <span className="text-xs font-medium text-foreground">Mis Permisos</span>
          </a>
        </div>
      </div>
    </div>
  );
};
