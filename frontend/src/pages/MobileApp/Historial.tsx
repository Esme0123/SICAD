import React, { useState, useEffect, useCallback } from "react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertTriangle, FileText } from "lucide-react";

interface Marcacion {
  id: number;
  fecha: string;
  fechaLegible: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  estado: "Puntual" | "Tardanza" | "Justificado";
  periodo: string | null;
  observacion: string | null;
  salidaOmitida: boolean;
}

interface HistorialResponse {
  ok: boolean;
  data: Marcacion[];
  resumen: {
    total: number;
    puntual: number;
    tardanza: number;
    justificado: number;
  };
}

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const estadoConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Puntual:    { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  Tardanza:   { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  Justificado: { icon: FileText, color: "text-primary", bg: "bg-primary/10" },
};

export const MobileHistorial: React.FC = () => {
  const { user } = useEmployeeAuth();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [data, setData] = useState<Marcacion[]>([]);
  const [resumen, setResumen] = useState<HistorialResponse["resumen"] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHistorial = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("sicad_emp_token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/asistencia/mi-historial?mes=${mes}&anio=${anio}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json: HistorialResponse = await res.json();
      if (json.ok) {
        setData(json.data);
        setResumen(json.resumen);
      }
    } catch (err) {
      console.error("Error al cargar historial:", err);
    } finally {
      setLoading(false);
    }
  }, [user, mes, anio]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  const cambiarMes = (delta: number) => {
    let nuevoMes = mes + delta;
    let nuevoAnio = anio;
    if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio--; }
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++; }
    setMes(nuevoMes);
    setAnio(nuevoAnio);
  };

  const esMesActual = mes === now.getMonth() + 1 && anio === now.getFullYear();

  return (
    <div className="p-4 space-y-4">
      {/* Selector de mes */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
        <button
          onClick={() => cambiarMes(-1)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <span className="text-sm font-bold text-foreground">{meses[mes - 1]} {anio}</span>
          {esMesActual && (
            <span className="block text-[10px] text-muted-foreground font-medium">Mes actual</span>
          )}
        </div>
        <button
          onClick={() => cambiarMes(1)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Resumen */}
      {resumen && !loading && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Puntual", value: resumen.puntual, color: "text-success", bg: "bg-success/10" },
            { label: "Tardanza", value: resumen.tardanza, color: "text-warning", bg: "bg-warning/10" },
            { label: "Justif.", value: resumen.justificado, color: "text-primary", bg: "bg-primary/10" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className={`text-[10px] font-medium ${s.color}`}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista de marcaciones */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-40 mb-3" />
              <div className="h-3 bg-muted rounded w-28" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Clock size={24} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Sin registros</p>
            <p className="text-xs text-muted-foreground mt-1">
              No hay marcaciones en {meses[mes - 1].toLowerCase()} {anio}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((m) => {
            const cfg = estadoConfig[m.estado] || estadoConfig.Puntual;
            const Icon = cfg.icon;
            return (
              <div
                key={m.id}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">
                      {new Date(m.fecha + "T00:00:00").toLocaleDateString("es-BO", {
                        weekday: "long", day: "numeric", month: "long",
                      })}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.color} shrink-0 ml-2`}>
                    <Icon size={10} />
                    <span>{m.estado}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                    <span className="font-mono font-medium text-foreground">
                      {m.horaEntrada || "--:--"}
                    </span>
                    <span className="text-muted-foreground">entrada</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    <span className="font-mono font-medium text-foreground">
                      {m.horaSalida || (m.salidaOmitida ? "Automática" : "--:--")}
                    </span>
                    <span className="text-muted-foreground">salida</span>
                  </div>
                </div>

                {m.periodo && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <Clock size={10} className="text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-mono">{m.periodo}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
