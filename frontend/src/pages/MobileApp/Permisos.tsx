import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import {
  FileText, Plus, Clock, CheckCircle2, XCircle, AlertCircle,
  Calendar, ChevronLeft, ChevronRight, X, Upload, Send,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const BO_TZ = "America/La_Paz";

type Filtro = "hoy" | "semana" | "mes" | "periodo";

interface PermisoBackend {
  id: number;
  usuarioId: number;
  tipoPermisoId: number;
  fecha: string;
  motivo: string;
  estado: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  revisadoPor?: number | null;
  fechaRevision?: string | null;
  createdAt: string;
  tipoPermiso?: { nombre: string };
  periodos?: { periodo: { id: number; nombre: string; horaInicio: string; horaFin: string } }[];
}

interface PeriodoCatalogo {
  id: number;
  nombre: string;
  horaInicio: string;
  horaFin: string;
}

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MOTIVOS_PREDEFINIDOS = [
  "Motivos de Salud",
  "Asuntos Personales",
  "Trámite Académico",
  "Calamidad Doméstica",
];

const estadoIcon: Record<string, React.ReactNode> = {
  APROBADO:  <CheckCircle2 size={16} className="text-success" />,
  RECHAZADO: <XCircle size={16} className="text-destructive" />,
  PENDIENTE: <AlertCircle size={16} className="text-warning" />,
};

const estadoLabel: Record<string, string> = {
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  PENDIENTE: "Pendiente",
};

const estadoBg: Record<string, string> = {
  APROBADO: "bg-success/10 text-success",
  RECHAZADO: "bg-destructive/10 text-destructive",
  PENDIENTE: "bg-warning/10 text-warning",
};

const filtrosIcon: Record<Filtro, React.ElementType> = {
  hoy: Clock, semana: Calendar, mes: ChevronLeft, periodo: FileText,
};

const filtrosLabel: Record<Filtro, string> = {
  hoy: "Hoy", semana: "Semana", mes: "Mes", periodo: "Periodo",
};

function boDate(date?: Date): Date {
  const d = date || new Date();
  return new Date(d.toLocaleString("en-US", { timeZone: BO_TZ }));
}

function fmtDateISO(d: Date): string {
  const b = boDate(d);
  return `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, "0")}-${String(b.getDate()).padStart(2, "0")}`;
}

async function apiGet(path: string) {
  const token = localStorage.getItem("sicad_emp_token");
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.message || "Error de API");
  return json;
}

async function apiPost(path: string, body: unknown) {
  const token = localStorage.getItem("sicad_emp_token");
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.message || "Error de API");
  return json;
}

export const MobilePermisos: React.FC = () => {
  const { user } = useEmployeeAuth();

  const ahora = useMemo(() => boDate(), []);
  const hoy = useMemo(() => fmtDateISO(ahora), [ahora]);

  // ── Filter state ──
  const [filtro, setFiltro] = useState<Filtro>("hoy");
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [periodosAcademicos, setPeriodosAcademicos] = useState<string[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState("");

  // ── Data state ──
  const [permisos, setPermisos] = useState<PermisoBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Load academic periods
  useEffect(() => {
    if (!user) return;
    apiGet(`/horarios/periodos-academicos?usuarioId=${user.id}`)
      .then((res) => {
        const pa = res.data || [];
        setPeriodosAcademicos(pa);
        if (pa.length > 0 && !selectedPeriodo) setSelectedPeriodo(pa[0]);
      })
      .catch(console.error);
  }, [user]);

  const buildUrl = useCallback(() => {
    switch (filtro) {
      case "hoy": {
        const d = fmtDateISO(boDate());
        return `/permisos/mis-permisos?fechaInicio=${d}&fechaFin=${d}`;
      }
      case "semana": {
        const b = boDate();
        const dia = b.getDay();
        const diffLun = dia === 0 ? -6 : 1 - dia;
        const lun = new Date(b);
        lun.setDate(b.getDate() + diffLun);
        const sab = new Date(lun);
        sab.setDate(lun.getDate() + 5);
        return `/permisos/mis-permisos?fechaInicio=${fmtDateISO(lun)}&fechaFin=${fmtDateISO(sab)}`;
      }
      case "mes":
        return `/permisos/mis-permisos?mes=${mes}&anio=${anio}`;
      case "periodo":
        return `/permisos/mis-permisos`;
      default:
        return `/permisos/mis-permisos`;
    }
  }, [filtro, mes, anio]);

  const fetchPermisos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const json = await apiGet(buildUrl());
      if (json.ok) setPermisos(json.data || []);
    } catch (err) {
      console.error("Error al cargar permisos:", err);
      setPermisos([]);
    } finally {
      setLoading(false);
    }
  }, [user, buildUrl]);

  useEffect(() => {
    fetchPermisos();
  }, [fetchPermisos]);

  const cambiarMes = (delta: number) => {
    let nm = mes + delta;
    let ny = anio;
    if (nm < 1) { nm = 12; ny--; }
    if (nm > 12) { nm = 1; ny++; }
    setMes(nm);
    setAnio(ny);
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
          Mis Permisos
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <Plus size={14} />
          Nuevo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5">
        {(Object.keys(filtrosLabel) as Filtro[]).map((key) => {
          const Icon = filtrosIcon[key];
          const isActive = filtro === key;
          return (
            <button
              key={key}
              onClick={() => { setFiltro(key); if (key === "periodo" && !selectedPeriodo && periodosAcademicos.length > 0) setSelectedPeriodo(periodosAcademicos[0]); }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-1 justify-center"
              style={{
                background: isActive ? "var(--primary)" : "var(--card)",
                color: isActive ? "var(--primary-foreground)" : "var(--foreground)",
                border: isActive ? "none" : "1px solid var(--border)",
              }}
            >
              <Icon size={13} />
              <span>{filtrosLabel[key]}</span>
            </button>
          );
        })}
      </div>

      {filtro === "mes" && (
        <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
          <button onClick={() => cambiarMes(-1)} className="p-1.5 rounded-lg" style={{ color: "var(--muted-foreground)" }}>
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{meses[mes - 1]} {anio}</span>
          <button onClick={() => cambiarMes(1)} className="p-1.5 rounded-lg" style={{ color: "var(--muted-foreground)" }}>
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {filtro === "periodo" && periodosAcademicos.length > 0 && (
        <select
          value={selectedPeriodo}
          onChange={(e) => setSelectedPeriodo(e.target.value)}
          className="w-full appearance-none rounded-xl px-4 py-3 text-sm font-medium border"
          style={{ background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}
        >
          {periodosAcademicos.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-32 mb-2" />
              <div className="h-3 bg-muted rounded w-48 mb-2" />
              <div className="h-3 bg-muted rounded w-24" />
            </div>
          ))}
        </div>
      ) : permisos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
            <FileText size={24} style={{ color: "var(--muted-foreground)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Sin permisos registrados</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Solicita un permiso usando el botón "Nuevo"</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {permisos.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    {p.tipoPermiso?.nombre || "Permiso"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{p.motivo}</p>
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(p.fecha + "T00:00:00").toLocaleDateString("es-BO")}
                    </span>
                    {p.periodos && p.periodos.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {p.periodos.length} periodo(s)
                      </span>
                    )}
                  </div>
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ml-2 ${estadoBg[p.estado] || ""}`}>
                  {estadoIcon[p.estado]}
                  <span>{estadoLabel[p.estado]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuevo Permiso */}
      {modalOpen && (
        <NuevoPermisoModal
          user={user}
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setModalOpen(false); fetchPermisos(); }}
        />
      )}
    </div>
  );
};

// =============================================================
// MODAL NUEVO PERMISO
// =============================================================

interface NuevoPermisoModalProps {
  user: { id: number; nombre: string; codigo: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const NuevoPermisoModal: React.FC<NuevoPermisoModalProps> = ({ user, onClose, onSuccess }) => {
  const [fecha, setFecha] = useState(fmtDateISO(new Date()));
  const [periodosDisponibles, setPeriodosDisponibles] = useState<PeriodoCatalogo[]>([]);
  const [selectedPeriodos, setSelectedPeriodos] = useState<number[]>([]);
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [tipoPermisos, setTipoPermisos] = useState<{ id: number; nombre: string }[]>([]);

  // Load tipoPermisos
  useEffect(() => {
    apiGet("/permisos/tipos")
      .then((res) => setTipoPermisos(res.data || []))
      .catch(console.error);
  }, []);

  // Fetch periods for selected date
  useEffect(() => {
    if (!user || !fecha) return;
    const d = new Date(fecha + "T12:00:00");
    const diaSemana = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"][d.getDay()];
    if (diaSemana === "Domingo") {
      setPeriodosDisponibles([]);
      setSelectedPeriodos([]);
      return;
    }
    apiGet(`/horarios/${user.id}?fechaInicio=${fecha}&fechaFin=${fecha}`)
      .then((res) => {
        const asignados: PeriodoCatalogo[] = (res.data || [])
          .filter((h: any) => h.diaSemana === diaSemana && h.periodo)
          .map((h: any) => h.periodo);
        setPeriodosDisponibles(asignados);
        setSelectedPeriodos([]);
      })
      .catch(() => {
        setPeriodosDisponibles([]);
        setSelectedPeriodos([]);
      });
  }, [user, fecha]);

  // Also fetch all catalog periods for the day if no assignments exist
  useEffect(() => {
    if (!user || !fecha || periodosDisponibles.length > 0) return;
    const d = new Date(fecha + "T12:00:00");
    const diaSemana = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"][d.getDay()];
    if (diaSemana === "Domingo") return;
    apiGet("/horarios/periodos")
      .then((res) => {
        setPeriodosDisponibles(res.data || []);
      })
      .catch(console.error);
  }, [fecha, periodosDisponibles.length, user]);

  const togglePeriodo = (id: number) => {
    setSelectedPeriodos((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!user || !motivo || selectedPeriodos.length === 0) return;
    setSubmitting(true);
    try {
      await apiPost("/permisos", {
        usuarioId: user.id,
        tipoPermisoNombre: motivo,
        fecha,
        motivo: detalle || motivo,
        periodosIds: selectedPeriodos,
      });
      onSuccess();
    } catch (err) {
      console.error("Error al crear permiso:", err);
      alert("Error al crear el permiso. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const esFinde = (() => {
    if (!fecha) return false;
    const d = new Date(fecha + "T12:00:00");
    return d.getDay() === 0;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--card)" }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Nuevo Permiso</h2>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "var(--muted-foreground)" }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Empleado (fijo) */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--muted-foreground)" }}>Empleado</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm"
              style={{ background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                {user?.nombre?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.nombre || "—"}</p>
                <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{user?.codigo || "—"}</p>
              </div>
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--muted-foreground)" }}>Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-medium border"
              style={{ background: "var(--input-background)", color: "var(--foreground)", borderColor: "var(--border)" }}
            />
          </div>

          {/* Periodos */}
          {esFinde ? (
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>No hay periodos disponibles los domingos.</p>
          ) : periodosDisponibles.length > 0 ? (
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--muted-foreground)" }}>Periodos a cubrir</label>
              <div className="space-y-1.5">
                {periodosDisponibles.map((p) => {
                  const sel = selectedPeriodos.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePeriodo(p.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border transition-all"
                      style={{
                        background: sel ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "var(--input-background)",
                        borderColor: sel ? "var(--primary)" : "var(--border)",
                        color: "var(--foreground)",
                      }}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all`}
                        style={{
                          borderColor: sel ? "var(--primary)" : "var(--muted-foreground)",
                          background: sel ? "var(--primary)" : "transparent",
                        }}
                      >
                        {sel && <div className="w-2 h-2 rounded-[1px]" style={{ background: "var(--primary-foreground)" }} />}
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-mono text-xs font-bold">{p.horaInicio} - {p.horaFin}</span>
                        <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{p.nombre}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs py-2" style={{ color: "var(--muted-foreground)" }}>
              Selecciona una fecha para ver los periodos disponibles...
            </p>
          )}

          {/* Motivo */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--muted-foreground)" }}>Motivo del Permiso</label>
            <div className="grid grid-cols-2 gap-2">
              {MOTIVOS_PREDEFINIDOS.map((m) => {
                const sel = motivo === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMotivo(m)}
                    className="px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all"
                    style={{
                      background: sel ? "var(--primary)" : "var(--input-background)",
                      color: sel ? "var(--primary-foreground)" : "var(--foreground)",
                      borderColor: sel ? "var(--primary)" : "var(--border)",
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalle */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--muted-foreground)" }}>
              Detalle / Observación <span className="font-normal" style={{ color: "var(--muted-foreground)" }}>(opcional)</span>
            </label>
            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              rows={3}
              placeholder="Escribe una explicación..."
              className="w-full rounded-xl px-4 py-2.5 text-sm border resize-none"
              style={{ background: "var(--input-background)", color: "var(--foreground)", borderColor: "var(--border)" }}
            />
          </div>

          {/* Adjunto */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--muted-foreground)" }}>
              Adjuntar archivo <span className="font-normal" style={{ color: "var(--muted-foreground)" }}>(opcional)</span>
            </label>
            <label
              className="flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer text-sm"
              style={{ background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <Upload size={16} style={{ color: "var(--muted-foreground)" }} />
              <span className="flex-1 truncate">
                {archivo ? archivo.name : "Seleccionar archivo..."}
              </span>
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              />
              {archivo && (
                <button onClick={(e) => { e.preventDefault(); setArchivo(null); }} style={{ color: "var(--destructive)" }}>
                  <X size={14} />
                </button>
              )}
            </label>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !motivo || selectedPeriodos.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            <Send size={16} />
            {submitting ? "Enviando..." : "Enviar Solicitud"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobilePermisos;