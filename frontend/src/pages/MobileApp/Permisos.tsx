import React, { useState } from "react";
import { FileText, Plus, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface Permiso {
  id: number;
  fecha: string;
  motivo: string;
  estado: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  tipoPermiso: { nombre: string };
  createdAt: string;
}

// Placeholder: se conectará con el backend de permisos en un próximo sprint

export const MobilePermisos: React.FC = () => {
  const [permisos] = useState<Permiso[]>([]);
  const [loading] = useState(false);

  const estadoIcon = (estado: Permiso["estado"]) => {
    switch (estado) {
      case "APROBADO": return <CheckCircle2 size={16} className="text-success" />;
      case "RECHAZADO": return <XCircle size={16} className="text-destructive" />;
      default: return <AlertCircle size={16} className="text-warning" />;
    }
  };

  const estadoLabel = (estado: Permiso["estado"]) => {
    switch (estado) {
      case "APROBADO": return "Aprobado";
      case "RECHAZADO": return "Rechazado";
      default: return "Pendiente";
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Mis Permisos</h2>
        <button className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity">
          <Plus size={14} />
          Nuevo
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-32 mb-2" />
              <div className="h-3 bg-muted rounded w-48" />
            </div>
          ))}
        </div>
      ) : permisos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <FileText size={24} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Sin permisos registrados</p>
            <p className="text-xs text-muted-foreground mt-1">Solicita un permiso usando el botón "Nuevo"</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {permisos.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{p.tipoPermiso.nombre}</p>
                  <p className="text-xs text-muted-foreground">{p.motivo}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(p.fecha).toLocaleDateString("es-BO")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium">
                  {estadoIcon(p.estado)}
                  <span>{estadoLabel(p.estado)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
