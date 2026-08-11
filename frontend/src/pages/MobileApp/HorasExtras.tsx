import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "motion/react";
import { Zap, Plus, Clock, Calendar, X, Send, AlertCircle, CheckCircle2, XCircle, Info, CalendarDays, List, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";

const API = import.meta.env.VITE_API_URL;
const BO_TZ = "America/La_Paz";

type Estado = "PENDIENTE" | "APROBADO" | "RECHAZADO";
type Filtro = "todas" | Estado;

interface Bloque {
  id: number;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  duracion: number;
}

interface BloqueDisponible extends Bloque {
  estado: "LIBRE" | "ASIGNADO";
}

interface SolicitudHe {
  id: number;
  empleadoId: number;
  fecha: string;
  bloques: Bloque[];
  horasTotales: number;
  observacion?: string | null;
  estado: Estado;
  aprobadoPor?: number | null;
  motivoRechazo?: string | null;
  fechaRespuesta?: string | null;
  createdAt: string;
}

const estadoConfig: Record<Estado, { icon: React.ElementType; label: string; bg: string; border: string }> = {
  PENDIENTE: { icon: AlertCircle, label: "En Revisión", bg: "#FBBF24", border: "#F59E0B" },
  APROBADO: { icon: CheckCircle2, label: "Aprobado", bg: "#34D399", border: "#10B981" },
  RECHAZADO: { icon: XCircle, label: "Rechazado", bg: "#F87171", border: "#EF4444" },
};

type FiltroTemporal = "hoy" | "semana" | "mes" | "periodo";

const filtrosTemporales: Record<FiltroTemporal, { label: string; icon: React.ElementType }> = {
  hoy: { label: "Hoy", icon: Clock },
  semana: { label: "Semana", icon: CalendarDays },
  mes: { label: "Mes", icon: List },
  periodo: { label: "Periodo", icon: FileText },
};

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function enRango(fechaISO: string, inicio: string, fin: string): boolean {
  if (!fechaISO) return false;
  const d = fechaISO.split("T")[0];
  return d >= inicio && d <= fin;
}

function parsePeriod(value: string): { idx: number; year: number } | null {
  if (!value) return null;
  const trimmed = value.trim();

  let m = trimmed.match(/verano[\s\-_/]*(\d{4})/i);
  if (m) return { idx: 0, year: parseInt(m[1]) };

  m = trimmed.match(/invierno[\s\-_/]*(\d{4})/i);
  if (m) return { idx: 2, year: parseInt(m[1]) };

  m = trimmed.match(/(?:2|II)[\s\-_/]+(\d{4})/) || trimmed.match(/^2-(\d{4})$/);
  if (m) return { idx: 3, year: parseInt(m[2] || m[1]) };

  m = trimmed.match(/(?:1|I)[\s\-_/]+(\d{4})/) || trimmed.match(/^1-(\d{4})$/);
  if (m) return { idx: 1, year: parseInt(m[1]) };

  m = trimmed.match(/(\d{4})/);
  if (m) {
    const year = parseInt(m[1]);
    if (trimmed.includes("1")) return { idx: 1, year };
    if (trimmed.includes("2")) return { idx: 3, year };
    return { idx: 3, year };
  }

  return null;
}

function periodoDateRange(periodo: string): { inicio: string; fin: string } | null {
  const parsed = parsePeriod(periodo);
  if (!parsed) return null;
  const { idx, year } = parsed;
  switch (idx) {
    case 0: return { inicio: `${year}-01-01`, fin: `${year}-01-31` };
    case 1: return { inicio: `${year}-02-01`, fin: `${year}-06-30` };
    case 2: return { inicio: `${year}-07-01`, fin: `${year}-07-31` };
    case 3: return { inicio: `${year}-08-01`, fin: `${year}-12-31` };
    default: return null;
  }
}

function obtenerPeriodoActivo(periodos: string[]): string {
  if (!periodos || periodos.length === 0) return "";
  const hoy = boDate();
  const hoyISO = fmtDateISO(hoy);
  const y = hoy.getFullYear();
  const m = hoy.getMonth() + 1;

  for (const p of periodos) {
    const dr = periodoDateRange(p);
    if (dr && hoyISO >= dr.inicio && hoyISO <= dr.fin) {
      return p;
    }
  }

  let nombreEsperado = "";
  if (m === 1) nombreEsperado = `Verano ${y}`;
  else if (m >= 2 && m <= 6) nombreEsperado = `1-${y}`;
  else if (m === 7) nombreEsperado = `Invierno ${y}`;
  else nombreEsperado = `2-${y}`;

  const encontrado = periodos.find((p) => p.trim() === nombreEsperado || p.includes(nombreEsperado));
  if (encontrado) return encontrado;

  return periodos[0];
}

function boDate(date?: Date): Date {
  const d = date || new Date();
  return new Date(d.toLocaleString("en-US", { timeZone: BO_TZ }));
}

function fmtDateISO(d: Date): string {
  const b = boDate(d);
  return `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, "0")}-${String(b.getDate()).padStart(2, "0")}`;
}

function formatDateSafe(dateStr: string | undefined | null): string {
  if (!dateStr) return "—";
  try {
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    if (!year || !month || !day) return "—";
    return new Date(year, month - 1, day).toLocaleDateString("es-BO", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
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

function formatHours(minutes: number): string {
  if (!minutes || minutes <= 0) return "0h";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m} min`;
}

function esDomingo(iso: string): boolean {
  if (!iso) return false;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
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

export const MobileHorasExtras: React.FC = () => {
  const { user } = useEmployeeAuth();

  const ahora = useMemo(() => boDate(), []);
  const hoyISO = useMemo(() => fmtDateISO(ahora), [ahora]);

  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [filtroTemporal, setFiltroTemporal] = useState<FiltroTemporal>("hoy");
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [periodosAcademicos, setPeriodosAcademicos] = useState<string[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState("");

  const [solicitudes, setSolicitudes] = useState<SolicitudHe[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState<SolicitudHe | null>(null);

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const json = await apiGet("/horas-extras/mis-solicitudes");
      setSolicitudes(json.data || []);
    } catch {
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSolicitudes(); }, [fetchSolicitudes]);

  useRefetchOnFocus(fetchSolicitudes);

  useEffect(() => {
    if (!user) return;
    apiGet(`/horarios/periodos-academicos?usuarioId=${user.id}`)
      .then((res) => {
        const pa = res.data || [];
        setPeriodosAcademicos(pa);
        if (pa.length > 0 && !selectedPeriodo) setSelectedPeriodo((prev) => prev || obtenerPeriodoActivo(pa));
      })
      .catch(console.error);
  }, [user]);

  const rangoFiltro = useMemo((): { inicio: string; fin: string } | null => {
    switch (filtroTemporal) {
      case "hoy":
        return { inicio: hoyISO, fin: hoyISO };
      case "semana": {
        const dia = ahora.getDay();
        const diffLun = dia === 0 ? -6 : 1 - dia;
        const lun = new Date(ahora);
        lun.setDate(ahora.getDate() + diffLun);
        const dom = new Date(lun);
        dom.setDate(lun.getDate() + 6);
        return { inicio: fmtDateISO(lun), fin: fmtDateISO(dom) };
      }
      case "mes": {
        const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
        const ultimoDia = new Date(anio, mes, 0).getDate();
        const fin = `${anio}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
        return { inicio, fin };
      }
      case "periodo":
        return selectedPeriodo ? periodoDateRange(selectedPeriodo) : null;
      default:
        return null;
    }
  }, [filtroTemporal, hoyISO, ahora, mes, anio, selectedPeriodo]);

  const enRangoTemporal = useCallback(
    (fechaISO: string) => (rangoFiltro ? enRango(fechaISO, rangoFiltro.inicio, rangoFiltro.fin) : true),
    [rangoFiltro]
  );

  const solicitudesVisibles = useMemo(
    () => solicitudes.filter((s) => enRangoTemporal(s.fecha)),
    [solicitudes, enRangoTemporal]
  );

  const conteos = useMemo(() => ({
    total: solicitudesVisibles.length,
    PENDIENTE: solicitudesVisibles.filter((s) => s.estado === "PENDIENTE").length,
    APROBADO: solicitudesVisibles.filter((s) => s.estado === "APROBADO").length,
    RECHAZADO: solicitudesVisibles.filter((s) => s.estado === "RECHAZADO").length,
  }), [solicitudesVisibles]);

  const visibles = useMemo(
    () => (filtro === "todas" ? solicitudesVisibles : solicitudesVisibles.filter((s) => s.estado === filtro)),
    [solicitudesVisibles, filtro]
  );

  const kpis: { key: Filtro; label: string; value: number; cls: string; ring: string }[] = [
    {
      key: "todas",
      label: "TOTAL",
      value: conteos.total,
      cls: "bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-100",
      ring: "ring-slate-400",
    },
    {
      key: "PENDIENTE",
      label: "PENDIENTES",
      value: conteos.PENDIENTE,
      cls: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-400",
      ring: "ring-amber-400",
    },
    {
      key: "APROBADO",
      label: "APROBADAS",
      value: conteos.APROBADO,
      cls: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-400",
      ring: "ring-emerald-400",
    },
    {
      key: "RECHAZADO",
      label: "RECHAZADAS",
      value: conteos.RECHAZADO,
      cls: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-400",
      ring: "ring-rose-400",
    },
  ];

  const cambiarMes = (delta: number) => {
    let nm = mes + delta;
    let ny = anio;
    if (nm < 1) { nm = 12; ny--; }
    if (nm > 12) { nm = 1; ny++; }
    setMes(nm);
    setAnio(ny);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 pb-24 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Horas Extras</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <Plus size={14} /> Nueva
        </button>
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
        Solicita la recuperación de horas en una fecha específica seleccionando los bloques libres.
        Una vez aprobada, podrás marcar tu asistencia en esa fecha.
      </p>

      <div className="flex gap-1.5">
        {(Object.keys(filtrosTemporales) as FiltroTemporal[]).map((key) => {
          const Icon = filtrosTemporales[key].icon;
          const isActive = filtroTemporal === key;
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setFiltroTemporal(key); if (key === "periodo" && !selectedPeriodo && periodosAcademicos.length > 0) setSelectedPeriodo(obtenerPeriodoActivo(periodosAcademicos)); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-1 justify-center whitespace-nowrap"
              style={{
                background: isActive ? "var(--primary)" : "var(--card)",
                color: isActive ? "var(--primary-foreground)" : "var(--foreground)",
                border: isActive ? "none" : "1px solid var(--border)",
                boxShadow: isActive ? "0 2px 8px color-mix(in srgb, var(--primary) 25%, transparent)" : "none",
              }}
            >
              <Icon size={14} />
              <span>{filtrosTemporales[key].label}</span>
            </motion.button>
          );
        })}
      </div>

      {filtroTemporal === "mes" && (
        <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
          <button onClick={() => cambiarMes(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" style={{ color: "var(--muted-foreground)" }}>
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{meses[mes - 1]} {anio}</span>
          <button onClick={() => cambiarMes(1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" style={{ color: "var(--muted-foreground)" }}>
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {filtroTemporal === "periodo" && (
        <div className="relative">
          <select
            value={selectedPeriodo}
            onChange={(e) => setSelectedPeriodo(e.target.value)}
            className="w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm font-medium border transition-colors"
            style={{ background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}
          >
            {periodosAcademicos.length === 0 && <option value="">Sin periodos</option>}
            {periodosAcademicos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {kpis.map((k) => {
          const isActive = filtro === k.key;
          return (
            <motion.button
              key={k.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFiltro(k.key)}
              className={`rounded-xl p-3 text-center border transition-all cursor-pointer ${k.cls} ${isActive ? `ring-2 ${k.ring} scale-105` : ""}`}
            >
              <p className="text-2xl font-extrabold tracking-tight">{k.value}</p>
              <p className="text-[10px] font-semibold mt-1 opacity-80">{k.label}</p>
            </motion.button>
          );
        })}
      </div>

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
      ) : visibles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
            <Zap size={24} style={{ color: "var(--muted-foreground)" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Sin solicitudes</p>
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            Usa el botón "Nueva" para solicitar recuperar horas.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibles.map((s) => {
            const cfg = estadoConfig[s.estado] || estadoConfig.PENDIENTE;
            const Icon = cfg.icon;
            return (
              <div key={s.id} onClick={() => setDetail(s)}
                className="bg-card border rounded-xl p-4 cursor-pointer transition-all hover:opacity-80 relative overflow-hidden"
                style={{
                  borderColor: s.estado === 'PENDIENTE'
                    ? "color-mix(in srgb, var(--color-warning, #F59E0B) 30%, transparent)"
                    : "var(--border)",
                }}
              >
                {s.estado === 'PENDIENTE' && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                    style={{ background: "var(--color-warning, #F59E0B)" }}
                  />
                )}
                <div className="flex items-start justify-between pl-1">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-sm font-semibold capitalize" style={{ color: "var(--foreground)" }}>
                      {formatDateSafe(s.fecha)}
                    </p>
                    <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatHours(s.horasTotales)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {s.bloques?.length || 0} bloque(s)
                      </span>
                    </div>
                    {s.observacion && (
                      <p className="text-[11px] truncate" style={{ color: "var(--muted-foreground)" }}>{s.observacion}</p>
                    )}
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
        <NuevaSolicitudModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setModalOpen(false); fetchSolicitudes(); }}
        />
      )}

      {detail && <DetalleSolicitudModal solicitud={detail} onClose={() => setDetail(null)} />}
    </motion.div>
  );
};

// =============================================================
// MODAL NUEVA SOLICITUD
// =============================================================

interface NuevaSolicitudModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const NuevaSolicitudModal: React.FC<NuevaSolicitudModalProps> = ({ onClose, onSuccess }) => {
  const [fecha, setFecha] = useState(fmtDateISO(new Date()));
  const [bloques, setBloques] = useState<BloqueDisponible[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [observacion, setObservacion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hoy = useMemo(() => fmtDateISO(new Date()), []);

  const fetchBloques = useCallback(async (f: string) => {
    if (!f || esDomingo(f)) {
      setBloques([]);
      setSelected([]);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    setSelected([]);
    try {
      const res = await apiGet(`/horas-extras/bloques?fecha=${f}`);
      setBloques(res.data || []);
    } catch {
      setBloques([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchBloques(fecha); }, [fecha, fetchBloques]);

  const toggleBloque = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const seleccionados = bloques.filter((b) => selected.includes(b.id));

  const handleSubmit = async () => {
    if (!fecha || esDomingo(fecha) || seleccionados.length === 0) return;
    setSubmitting(true);
    try {
      await apiPost("/horas-extras/solicitar", {
        fecha,
        bloques: seleccionados.map((b) => ({ id: b.id, nombre: b.nombre, horaInicio: b.horaInicio, horaFin: b.horaFin, duracion: b.duracion })),
        observacion: observacion || undefined,
      });
      toast.success("Solicitud enviada correctamente", { position: "bottom-center", duration: 4000 });
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Error al enviar la solicitud. Intenta de nuevo.", {
        position: "bottom-center",
        duration: 4000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const puedeEnviar = !!fecha && !esDomingo(fecha) && seleccionados.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b shrink-0 border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Nueva Solicitud de Horas Extras</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 dark:text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 flex-1 min-h-0">
          <div>
            <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">Fecha</label>
            <input
              type="date"
              value={fecha}
              min={hoy}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-medium border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700"
            />
          </div>

          {esDomingo(fecha) ? (
            <p className="text-xs py-2 px-3 rounded-xl text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
              No se pueden solicitar horas extra los domingos.
            </p>
          ) : loaded && bloques.length === 0 ? (
            <p className="text-xs py-2 px-3 rounded-xl text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20">
              Sin bloques disponibles para esta fecha.
            </p>
          ) : bloques.length > 0 ? (
            <div>
              <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">
                Bloques a solicitar
              </label>
              <div className="space-y-1.5">
                {bloques.map((b) => {
                  const esLibre = b.estado === "LIBRE";
                  const sel = selected.includes(b.id);
                  return (
                    <button key={b.id} disabled={!esLibre} onClick={() => toggleBloque(b.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border transition-all ${
                        !esLibre
                          ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                          : sel
                            ? "bg-primary/10 dark:bg-primary/20 border-primary text-slate-900 dark:text-slate-100"
                            : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        !esLibre ? "border-slate-300 dark:border-slate-600" :
                        sel ? "border-primary bg-primary" : "border-slate-400 dark:border-slate-500 bg-transparent"
                      }`}>
                        {sel && <div className="w-2 h-2 rounded-[1px] bg-white" />}
                      </div>
                      <span className="font-mono text-xs font-bold">{b.horaInicio} - {b.horaFin}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{b.nombre}</span>
                      {!esLibre && <span className="ml-auto text-[9px] font-bold text-slate-400">OCUPADO</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs py-2 text-slate-500 dark:text-slate-400">Cargando bloques...</p>
          )}

          {seleccionados.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary/10 dark:bg-primary/20">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Total: {formatHours(seleccionados.reduce((acc, b) => acc + (b.duracion || 0), 0))}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {seleccionados.length} bloque(s) seleccionado(s)
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">
              Observación <span className="font-normal">(opcional)</span>
            </label>
            <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)}
              rows={3} placeholder="Motivo de la recuperación..."
              className="w-full rounded-xl px-4 py-2.5 text-sm border resize-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        <div className="p-4 border-t shrink-0 flex gap-3 border-slate-200 dark:border-slate-700" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
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
// MODAL DETALLE DE SOLICITUD
// =============================================================

interface DetalleSolicitudModalProps {
  solicitud: SolicitudHe;
  onClose: () => void;
}

const DetalleSolicitudModal: React.FC<DetalleSolicitudModalProps> = ({ solicitud, onClose }) => {
  const cfg = estadoConfig[solicitud.estado] || estadoConfig.PENDIENTE;
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b shrink-0 border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Detalle de la Solicitud</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 dark:text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 flex-1 min-h-0" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Recuperación de Horas</p>
              <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">ID #{solicitud.id}</p>
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
              <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                {formatDateSafe(solicitud.fecha)}
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold mb-1.5 text-slate-500 dark:text-slate-400">
                Bloques seleccionados ({(solicitud.bloques || []).length})
              </p>
              <div className="space-y-1">
                {(solicitud.bloques || []).map((b, i) => (
                  <div key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                  >
                    <Clock size={12} className="text-slate-500 dark:text-slate-400" />
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {b.horaInicio} - {b.horaFin}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{b.nombre}</span>
                  </div>
                ))}
              </div>
            </div>

            {(solicitud.bloques || []).length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 dark:bg-primary/20">
                <Zap size={14} className="text-primary" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Horas totales: {formatHours(solicitud.horasTotales)}
                </span>
              </div>
            )}

            {solicitud.observacion && (
              <div>
                <p className="text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Observación</p>
                <p className="text-sm text-slate-900 dark:text-slate-100">{solicitud.observacion}</p>
              </div>
            )}

            {solicitud.estado === "RECHAZADO" && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
                <Info size={14} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">Motivo del rechazo</p>
                  <p className="text-xs mt-0.5 text-red-500 dark:text-red-300">
                    {solicitud.motivoRechazo || "Sin motivo especificado"}
                  </p>
                </div>
              </div>
            )}

            {solicitud.estado === "APROBADO" && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40">
                <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-green-600 dark:text-green-400">Solicitud aprobada</p>
                  <p className="text-xs mt-0.5 text-green-500 dark:text-green-300">
                    Ya puedes marcar tu asistencia en esta fecha.
                  </p>
                </div>
              </div>
            )}

            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Solicitado: {formatDateTimeSafe(solicitud.createdAt)}
            </div>
            {solicitud.fechaRespuesta && (
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Respondido: {formatDateTimeSafe(solicitud.fechaRespuesta)}
              </div>
            )}
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

export default MobileHorasExtras;