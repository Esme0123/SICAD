import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import {
  FileText, Plus, Clock, CheckCircle2, XCircle, AlertCircle,
  Calendar, ChevronLeft, ChevronRight, X, Upload, Send, Eye,
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
  observacion?: string | null;
  adjuntoUrl?: string | null;
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

const estadoConfig: Record<string, { icon: React.ElementType; label: string; bg: string; border: string }> = {
  PENDIENTE:  { icon: AlertCircle,  label: "En Revisión",  bg: "#FBBF24", border: "#F59E0B" },
  APROBADO:   { icon: CheckCircle2, label: "Aprobado",    bg: "#34D399", border: "#10B981" },
  RECHAZADO:  { icon: XCircle,      label: "Rechazado",   bg: "#F87171", border: "#EF4444" },
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
  const [filtro, setFiltro] = useState<Filtro>("hoy");
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [periodosAcademicos, setPeriodosAcademicos] = useState<string[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState("");
  const [permisos, setPermisos] = useState<PermisoBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailPermiso, setDetailPermiso] = useState<PermisoBackend | null>(null);

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
    } catch {
      setPermisos([]);
    } finally {
      setLoading(false);
    }
  }, [user, buildUrl]);

  useEffect(() => { fetchPermisos(); }, [fetchPermisos]);

  const cambiarMes = (delta: number) => {
    let nm = mes + delta, ny = anio;
    if (nm < 1) { nm = 12; ny--; }
    if (nm > 12) { nm = 1; ny++; }
    setMes(nm); setAnio(ny);
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Mis Permisos</h1>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <Plus size={14} /> Nuevo
        </button>
      </div>

      <div className="flex gap-1.5">
        {(Object.keys(filtrosLabel) as Filtro[]).map((key) => {
          const Icon = filtrosIcon[key];
          const isActive = filtro === key;
          return (
            <button key={key} onClick={() => setFiltro(key)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-1 justify-center"
              style={{
                background: isActive ? "var(--primary)" : "var(--card)",
                color: isActive ? "var(--primary-foreground)" : "var(--foreground)",
                border: isActive ? "none" : "1px solid var(--border)",
              }}
            >
              <Icon size={13} /> <span>{filtrosLabel[key]}</span>
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
        <select value={selectedPeriodo} onChange={(e) => setSelectedPeriodo(e.target.value)}
          className="w-full appearance-none rounded-xl px-4 py-3 text-sm font-medium border"
          style={{ background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}
        >
          {periodosAcademicos.map((p) => (<option key={p} value={p}>{p}</option>))}
        </select>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-card border border-border rounded-xl p-4">
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
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Sin permisos registrados</p>
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Solicita un permiso usando el botón "Nuevo"</p>
        </div>
      ) : (
        <div className="space-y-2">
          {permisos.map((p) => {
            const cfg = estadoConfig[p.estado] || estadoConfig.PENDIENTE;
            const Icon = cfg.icon;
            return (
              <div key={p.id} onClick={() => setDetailPermiso(p)}
                className="bg-card border rounded-xl p-4 cursor-pointer transition-all hover:opacity-80 relative overflow-hidden"
                style={{
                  borderColor: p.estado === 'PENDIENTE'
                    ? "color-mix(in srgb, var(--color-warning, #F59E0B) 30%, transparent)"
                    : "var(--border)",
                }}
              >
                {p.estado === 'PENDIENTE' && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                    style={{ background: "var(--color-warning, #F59E0B)" }}
                  />
                )}
                <div className="flex items-start justify-between pl-1">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      {p.tipoPermiso?.nombre || "Permiso"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{p.motivo}</p>
                    <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatDateSafe(p.fecha)}
                      </span>
                      {p.periodos && p.periodos.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {p.periodos.length} periodo(s)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ml-2"
                    style={{ background: `${cfg.bg}20`, color: cfg.border, border: `1px solid ${cfg.bg}40` }}
                  >
                    <Icon size={10} />
                    <span>{cfg.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <NuevoPermisoModal
          user={user}
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setModalOpen(false); fetchPermisos(); }}
        />
      )}

      {detailPermiso && (
        <DetallePermisoModal
          permiso={detailPermiso}
          onClose={() => setDetailPermiso(null)}
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
  const [periodosLoaded, setPeriodosLoaded] = useState(false);
  const [selectedPeriodos, setSelectedPeriodos] = useState<number[]>([]);
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPeriodos = useCallback(async (f: string) => {
    if (!user || !f) return;
    setPeriodosLoaded(false);
    setSelectedPeriodos([]);
    const d = new Date(f + "T12:00:00");
    const diaSemana = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"][d.getDay()];
    if (diaSemana === "Domingo") {
      setPeriodosDisponibles([]);
      setPeriodosLoaded(true);
      return;
    }
    try {
      const res = await apiGet(`/horarios/${user.id}`);
      const asignados: PeriodoCatalogo[] = (res.data || [])
        .filter((h: any) => h.diaSemana === diaSemana && h.periodo)
        .map((h: any) => h.periodo);
      setPeriodosDisponibles(asignados);
    } catch {
      setPeriodosDisponibles([]);
    } finally {
      setPeriodosLoaded(true);
    }
  }, [user]);

  useEffect(() => { fetchPeriodos(fecha); }, [fecha, fetchPeriodos]);

  const togglePeriodo = (id: number) => {
    setSelectedPeriodos((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!user || !motivo || selectedPeriodos.length === 0) return;
    setSubmitting(true);
    try {
      if (archivo) {
        const formData = new FormData();
        formData.append("usuarioId", String(user.id));
        formData.append("tipoPermisoNombre", motivo);
        formData.append("fecha", fecha);
        formData.append("motivo", detalle || motivo);
        formData.append("periodosIds", JSON.stringify(selectedPeriodos));
        formData.append("observacion", detalle || "");
        formData.append("archivo", archivo);

        const token = localStorage.getItem("sicad_emp_token");
        const res = await fetch(`${API}/permisos`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.message || "Error de API");
      } else {
        await apiPost("/permisos", {
          usuarioId: user.id,
          tipoPermisoNombre: motivo,
          fecha,
          motivo: detalle || motivo,
          observacion: detalle || "",
          periodosIds: selectedPeriodos,
        });
      }
      onSuccess();
    } catch (err: any) {
      alert(err?.message || "Error al crear el permiso. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const esFinde = (() => {
    if (!fecha) return false;
    return new Date(fecha + "T12:00:00").getDay() === 0;
  })();

  const puedeEnviar = !!motivo && selectedPeriodos.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between p-4 border-b shrink-0 border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Nuevo Permiso</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 dark:text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          <div>
            <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">Empleado</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold bg-primary text-white">
                {user?.nombre?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.nombre || "—"}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{user?.codigo || "—"}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-medium border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700"
            />
          </div>

          {esFinde ? (
            <p className="text-xs py-2 px-3 rounded-xl text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/50">
              No hay periodos disponibles los domingos.
            </p>
          ) : periodosLoaded && periodosDisponibles.length === 0 ? (
            <p className="text-xs py-2 px-3 rounded-xl text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20">
              Sin periodos asignados para esta fecha. Selecciona otro día.
            </p>
          ) : periodosDisponibles.length > 0 ? (
            <div>
              <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">Periodos a cubrir</label>
              <div className="space-y-1.5">
                {periodosDisponibles.map((p) => {
                  const sel = selectedPeriodos.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => togglePeriodo(p.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border transition-all ${
                        sel
                          ? "bg-primary/10 dark:bg-primary/20 border-primary text-slate-900 dark:text-slate-100"
                          : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        sel ? "border-primary bg-primary" : "border-slate-400 dark:border-slate-500 bg-transparent"
                      }`}>
                        {sel && <div className="w-2 h-2 rounded-[1px] bg-white" />}
                      </div>
                      <span className="font-mono text-xs font-bold">{p.horaInicio} - {p.horaFin}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{p.nombre}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs py-2 text-slate-500 dark:text-slate-400">
              Cargando periodos...
            </p>
          )}

          <div>
            <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">Motivo del Permiso</label>
            <div className="grid grid-cols-2 gap-2">
              {MOTIVOS_PREDEFINIDOS.map((m) => {
                const sel = motivo === m;
                return (
                  <button key={m} onClick={() => setMotivo(m)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      sel
                        ? "bg-primary text-white border-primary"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">
              Detalle / Observación <span className="font-normal">(opcional)</span>
            </label>
            <textarea value={detalle} onChange={(e) => setDetalle(e.target.value)}
              rows={3} placeholder="Escribe una explicación..."
              className="w-full rounded-xl px-4 py-2.5 text-sm border resize-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">
              Adjuntar archivo <span className="font-normal">(opcional)</span>
            </label>
            <label className="flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
              <Upload size={16} className="text-slate-500 dark:text-slate-400" />
              <span className="flex-1 truncate">{archivo ? archivo.name : "Seleccionar archivo..."}</span>
              <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              />
              {archivo && (
                <button onClick={(e) => { e.preventDefault(); setArchivo(null); }} className="text-red-500 dark:text-red-400">
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-4 border-t shrink-0 flex gap-3 border-slate-200 dark:border-slate-700">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-bold border transition-all bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={submitting || !puedeEnviar}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 bg-primary text-white"
          >
            <Send size={16} />
            {submitting ? "Enviando..." : "Enviar Solicitud"}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================
// MODAL DETALLE DE PERMISO
// =============================================================

interface DetallePermisoModalProps {
  permiso: PermisoBackend;
  onClose: () => void;
}

function formatDateSafe(dateStr: string | undefined | null, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-BO", options);
  } catch {
    return "—";
  }
}

function formatDateTimeSafe(dateStr: string | undefined | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("es-BO");
  } catch {
    return "—";
  }
}

const DetallePermisoModal: React.FC<DetallePermisoModalProps> = ({ permiso, onClose }) => {
  const cfg = estadoConfig[permiso.estado] || estadoConfig.PENDIENTE;
  const Icon = cfg.icon;
  const API_URL = import.meta.env.VITE_API_URL;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between p-4 border-b shrink-0 border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Detalle del Permiso</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 dark:text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {permiso.tipoPermiso?.nombre || "Permiso"}
              </p>
              <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">
                ID #{permiso.id}
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: `${cfg.bg}20`, color: cfg.border }}
            >
              <Icon size={14} />
              <span>{cfg.label}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Calendar size={14} />
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {formatDateSafe(permiso.fecha, {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Motivo</p>
              <p className="text-sm text-slate-900 dark:text-slate-100">{permiso.motivo}</p>
            </div>

            {permiso.observacion && (
              <div>
                <p className="text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Observación</p>
                <p className="text-sm text-slate-900 dark:text-slate-100">{permiso.observacion}</p>
              </div>
            )}

            {permiso.adjuntoUrl && (
              <div>
                <p className="text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Archivo Adjunto</p>
                <a href={`${API_URL}${permiso.adjuntoUrl}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-primary"
                >
                  <Upload size={14} />
                  Ver archivo adjunto
                </a>
              </div>
            )}

            {permiso.periodos && permiso.periodos.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1.5 text-slate-500 dark:text-slate-400">
                  Periodos afectados ({permiso.periodos.length})
                </p>
                <div className="space-y-1">
                  {permiso.periodos.map((pp) => (
                    <div key={pp.periodo.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                    >
                      <Clock size={12} className="text-slate-500 dark:text-slate-400" />
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {pp.periodo.horaInicio} - {pp.periodo.horaFin}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">{pp.periodo.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {permiso.fechaRevision && (
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Revisado: {formatDateTimeSafe(permiso.fechaRevision)}
              </div>
            )}

            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Solicitado: {formatDateTimeSafe(permiso.createdAt)}
            </div>
          </div>

          <button onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-bold border transition-all bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobilePermisos;