import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "motion/react";
import { Repeat, Plus, Clock, Calendar, X, Send, AlertCircle, CheckCircle2, XCircle, Users, User, FileText, Info } from "lucide-react";
import { toast } from "sonner";
import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";

const API = import.meta.env.VITE_API_URL;

type Estado = "PENDIENTE" | "ACEPTADO" | "RECHAZADO";
type VistA = "enviadas" | "recibidas";
type Filtro = "todas" | Estado;

interface Bloque {
  id: number;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  duracion: number;
}

interface EmpleadoRef {
  id: number;
  nombre: string;
  codigo?: string;
  ci?: string;
}

interface SolicitudReemplazo {
  id: number;
  solicitanteId: number;
  reemplazanteId?: number | null;
  esAbierta: boolean;
  fecha: string;
  bloques: Bloque[];
  horasTotales: number;
  comentario?: string | null;
  estado: Estado;
  fechaRespuesta?: string | null;
  createdAt: string;
  solicitante?: EmpleadoRef;
  reemplazante?: EmpleadoRef | null;
}

const estadoConfig: Record<Estado, { icon: React.ElementType; label: string; bg: string; border: string }> = {
  PENDIENTE: { icon: AlertCircle, label: "Pendiente", bg: "#FBBF24", border: "#F59E0B" },
  ACEPTADO: { icon: CheckCircle2, label: "Aceptado", bg: "#34D399", border: "#10B981" },
  RECHAZADO: { icon: XCircle, label: "Rechazado", bg: "#F87171", border: "#EF4444" },
};

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

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

async function apiPut(path: string) {
  const token = localStorage.getItem("sicad_emp_token");
  const res = await fetch(`${API}${path}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.message || "Error de API");
  return json;
}

export const MobileReemplazos: React.FC = () => {
  const { user } = useEmployeeAuth();

  const [vista, setVista] = useState<VistA>("recibidas");
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const [enviadas, setEnviadas] = useState<SolicitudReemplazo[]>([]);
  const [recibidas, setRecibidas] = useState<SolicitudReemplazo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState<SolicitudReemplazo | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const json = await apiGet("/reemplazos/mis-solicitudes");
      setEnviadas(json.data?.enviadas || []);
      setRecibidas(json.data?.recibidas || []);
    } catch {
      setEnviadas([]);
      setRecibidas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSolicitudes(); }, [fetchSolicitudes]);

  useRefetchOnFocus(fetchSolicitudes);

  const listaActual = vista === "enviadas" ? enviadas : recibidas;

  const conteos = useMemo(() => {
    const build = (list: SolicitudReemplazo[]) => ({
      total: list.length,
      PENDIENTE: list.filter((s) => s.estado === "PENDIENTE").length,
      ACEPTADO: list.filter((s) => s.estado === "ACEPTADO").length,
      RECHAZADO: list.filter((s) => s.estado === "RECHAZADO").length,
    });
    return {
      enviadas: build(enviadas),
      recibidas: build(recibidas),
      actual: build(listaActual),
    };
  }, [enviadas, recibidas, listaActual]);

  const visibles = useMemo(
    () => (filtro === "todas" ? listaActual : listaActual.filter((s) => s.estado === filtro)),
    [listaActual, filtro]
  );

  const kpis: { key: Filtro; label: string; value: number; cls: string; ring: string }[] = [
    {
      key: "todas",
      label: "TOTAL",
      value: conteos.actual.total,
      cls: "bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-100",
      ring: "ring-slate-400",
    },
    {
      key: "PENDIENTE",
      label: "PENDIENTES",
      value: conteos.actual.PENDIENTE,
      cls: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-400",
      ring: "ring-amber-400",
    },
    {
      key: "ACEPTADO",
      label: "ACEPTADOS",
      value: conteos.actual.ACEPTADO,
      cls: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-400",
      ring: "ring-emerald-400",
    },
    {
      key: "RECHAZADO",
      label: "RECHAZADOS",
      value: conteos.actual.RECHAZADO,
      cls: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-400",
      ring: "ring-rose-400",
    },
  ];

  const handleAceptar = async (s: SolicitudReemplazo) => {
    setActingId(s.id);
    try {
      await apiPut(`/reemplazos/${s.id}/aceptar`);
      toast.success("¡Reemplazo aceptado!", { position: "bottom-center", duration: 4000 });
      fetchSolicitudes();
    } catch (err: any) {
      toast.error(err?.message || "Error al aceptar el reemplazo.", { position: "bottom-center", duration: 4000 });
    } finally {
      setActingId(null);
    }
  };

  const handleRechazar = async (s: SolicitudReemplazo) => {
    setActingId(s.id);
    try {
      await apiPut(`/reemplazos/${s.id}/rechazar`);
      toast.success("Solicitud rechazada", { position: "bottom-center", duration: 4000 });
      fetchSolicitudes();
    } catch (err: any) {
      toast.error(err?.message || "Error al rechazar el reemplazo.", { position: "bottom-center", duration: 4000 });
    } finally {
      setActingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 pb-24 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Reemplazos</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <Plus size={14} /> Solicitar
        </button>
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
        Pide que un compañero cubra tus bloques en una fecha concreta. Al aceptar tu solicitud,
        el reemplazante podrá marcar tu horario y tú figurarás como justificado.
      </p>

      {/* Selector de sub-vistas */}
      <div className="flex gap-1.5">
        {(
          [
            { key: "recibidas", label: "Recibidas", extra: conteos.recibidas.PENDIENTE },
            { key: "enviadas", label: "Enviadas", extra: 0 },
          ] as const
        ).map(({ key, label, extra }) => {
          const isActive = vista === key;
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.96 }}
              onClick={() => { setVista(key); setFiltro("todas"); }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex-1 justify-center relative"
              style={{
                background: isActive ? "var(--primary)" : "var(--card)",
                color: isActive ? "var(--primary-foreground)" : "var(--foreground)",
                border: isActive ? "none" : "1px solid var(--border)",
              }}
            >
              {key === "recibidas" ? <Users size={14} /> : <User size={14} />}
              <span>{label}</span>
              {isActive && extra > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: "var(--color-danger, #EF4444)", color: "#fff" }}
                >
                  {extra}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* KPIs */}
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
            <Repeat size={24} style={{ color: "var(--muted-foreground)" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {vista === "recibidas" ? "Sin solicitudes recibidas" : "No has enviado solicitudes"}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            {vista === "recibidas"
              ? "Cuando un compañero te pida reemplazo, aparecerá aquí."
              : "Usa el botón \"Solicitar\" para pedir un reemplazo."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibles.map((s) => {
            const cfg = estadoConfig[s.estado] || estadoConfig.PENDIENTE;
            const Icon = cfg.icon;
            const puedeResponder = vista === "recibidas" && s.estado === "PENDIENTE" && s.solicitanteId !== user?.id;
            return (
              <div key={s.id}
                className="bg-card border rounded-xl p-4 transition-all relative overflow-hidden"
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
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="text-sm font-semibold capitalize" style={{ color: "var(--foreground)" }}>
                      {formatDateSafe(s.fecha)}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                      <span className="flex items-center gap-1">
                        <User size={10} />
                        <b className="text-foreground">{s.solicitante?.nombre || `#${s.solicitanteId}`}</b>
                      </span>
                      {s.esAbierta ? (
                        <span className="flex items-center gap-1">
                          <Users size={10} />
                          Petición abierta
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Repeat size={10} />
                          Para: <b className="text-foreground">{s.reemplazante?.nombre || `#${s.reemplazanteId}`}</b>
                        </span>
                      )}
                    </div>

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

                    {s.comentario && (
                      <p className="text-[11px] truncate" style={{ color: "var(--muted-foreground)" }}>{s.comentario}</p>
                    )}

                    {s.estado === "ACEPTADO" && s.reemplazante && (
                      <p className="text-[11px] flex items-center gap-1" style={{ color: "var(--color-success, #10B981)" }}>
                        <Repeat size={10} />
                        Reemplazado por <b>{s.reemplazante.nombre}</b>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: `${cfg.bg}20`, color: cfg.border, border: `1px solid ${cfg.bg}40` }}
                    >
                      <Icon size={10} />
                      <span>{cfg.label}</span>
                    </span>
                    {puedeResponder && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleAceptar(s)}
                          disabled={actingId === s.id}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all disabled:opacity-50"
                          style={{ background: "var(--color-success, #10B981)" }}
                        >
                          {actingId === s.id ? "..." : "Aceptar"}
                        </button>
                        <button
                          onClick={() => handleRechazar(s)}
                          disabled={actingId === s.id}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all disabled:opacity-50"
                          style={{ background: "var(--color-danger, #EF4444)" }}
                        >
                          {actingId === s.id ? "..." : "Rechazar"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setDetail(s)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all"
                  style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
                >
                  <Info size={11} />
                  Ver detalle
                </button>
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
// MODAL NUEVA SOLICITUD DE REEMPLAZO
// =============================================================

interface NuevaSolicitudModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const NuevaSolicitudModal: React.FC<NuevaSolicitudModalProps> = ({ onClose, onSuccess }) => {
  const [fecha, setFecha] = useState(todayISO);
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [tipo, setTipo] = useState<"abierta" | "especifico">("abierta");
  const [empleados, setEmpleados] = useState<EmpleadoRef[]>([]);
  const [reemplazanteId, setReemplazanteId] = useState<number | "">("");
  const [comentario, setComentario] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hoy = useMemo(() => todayISO(), []);

  const fetchBloques = useCallback(async (f: string) => {
    if (!f) {
      setBloques([]);
      setSelected([]);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    setSelected([]);
    try {
      const res = await apiGet(`/reemplazos/bloques?fecha=${f}`);
      setBloques(res.data || []);
    } catch {
      setBloques([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchBloques(fecha); }, [fecha, fetchBloques]);

  useEffect(() => {
    apiGet("/reemplazos/empleados")
      .then((res) => setEmpleados(res.data || []))
      .catch(() => setEmpleados([]));
  }, []);

  const toggleBloque = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const seleccionados = bloques.filter((b) => selected.includes(b.id));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await apiPost("/reemplazos/solicitar", {
        fecha,
        bloques: seleccionados.map((b) => ({ id: b.id, nombre: b.nombre, horaInicio: b.horaInicio, horaFin: b.horaFin, duracion: b.duracion })),
        esAbierta: tipo === "abierta",
        reemplazanteId: tipo === "especifico" && reemplazanteId ? Number(reemplazanteId) : undefined,
        comentario: comentario || undefined,
      });
      toast.success("Solicitud de reemplazo enviada", { position: "bottom-center", duration: 4000 });
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

  const puedeEnviar =
    !!fecha && seleccionados.length > 0 && (tipo === "abierta" || reemplazanteId !== "");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b shrink-0 border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Solicitar Reemplazo</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 dark:text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 flex-1 min-h-0">
          <div>
            <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">Fecha del reemplazo</label>
            <input
              type="date"
              value={fecha}
              min={hoy}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-medium border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700"
            />
          </div>

          {loaded && bloques.length === 0 ? (
            <p className="text-xs py-2 px-3 rounded-xl text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20">
              No tienes bloques programados para esta fecha.
            </p>
          ) : bloques.length > 0 ? (
            <div>
              <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">
                Bloques a cubrir
              </label>
              <div className="space-y-1.5">
                {bloques.map((b) => {
                  const sel = selected.includes(b.id);
                  return (
                    <button key={b.id} onClick={() => toggleBloque(b.id)}
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
                      <span className="font-mono text-xs font-bold">{b.horaInicio} - {b.horaFin}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{b.nombre}</span>
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
                {seleccionados.length} bloque(s)
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold mb-1.5 block text-slate-500 dark:text-slate-400">Tipo de petición</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTipo("abierta")}
                className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  tipo === "abierta"
                    ? "bg-primary/10 dark:bg-primary/20 border-primary text-slate-900 dark:text-slate-100"
                    : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <Users size={16} />
                Petición Abierta
                <span className="font-normal text-[9px] opacity-70">Todos los compañeros</span>
              </button>
              <button
                onClick={() => setTipo("especifico")}
                className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  tipo === "especifico"
                    ? "bg-primary/10 dark:bg-primary/20 border-primary text-slate-900 dark:text-slate-100"
                    : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <User size={16} />
                Empleado Específico
                <span className="font-normal text-[9px] opacity-70">Seleccionar compañero</span>
              </button>
            </div>
          </div>

          {tipo === "especifico" && (
            <div>
              <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">
                Selecciona el empleado
              </label>
              <select
                value={reemplazanteId}
                onChange={(e) => setReemplazanteId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full appearance-none rounded-xl px-4 py-2.5 text-sm font-medium border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700"
              >
                <option value="">— Sin seleccionar —</option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre} {e.codigo ? `(${e.codigo})` : ""}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">
              Comentario <span className="font-normal">(opcional)</span>
            </label>
            <textarea value={comentario} onChange={(e) => setComentario(e.target.value)}
              rows={3} placeholder="Explica el motivo del reemplazo..."
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
// MODAL DETALLE DE SOLICITUD DE REEMPLAZO
// =============================================================

interface DetalleSolicitudModalProps {
  solicitud: SolicitudReemplazo;
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
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Detalle del Reemplazo</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 dark:text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 flex-1 min-h-0" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Solicitud de Reemplazo</p>
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
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                <User size={14} className="text-slate-400" />
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Solicitante</p>
                  <p className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">
                    {solicitud.solicitante?.nombre || `#${solicitud.solicitanteId}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                {solicitud.esAbierta ? <Users size={14} className="text-slate-400" /> : <Repeat size={14} className="text-slate-400" />}
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Reemplazante</p>
                  <p className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">
                    {solicitud.reemplazante?.nombre || (solicitud.esAbierta ? "Petición abierta" : "—")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Calendar size={14} />
              <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                {formatDateSafe(solicitud.fecha)}
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold mb-1.5 text-slate-500 dark:text-slate-400">
                Bloques a cubrir ({(solicitud.bloques || []).length})
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
                <Clock size={14} className="text-primary" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Horas totales: {formatHours(solicitud.horasTotales)}
                </span>
              </div>
            )}

            {solicitud.comentario && (
              <div>
                <p className="text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">Comentario</p>
                <p className="text-sm text-slate-900 dark:text-slate-100">{solicitud.comentario}</p>
              </div>
            )}

            {solicitud.estado === "ACEPTADO" && solicitud.reemplazante && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40">
                <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-green-600 dark:text-green-400">Reemplazo aceptado</p>
                  <p className="text-xs mt-0.5 text-green-500 dark:text-green-300">
                    {solicitud.reemplazante.nombre} cubrirá tus bloques. Podrá marcar tu horario en esa fecha.
                  </p>
                </div>
              </div>
            )}

            {solicitud.estado === "RECHAZADO" && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
                <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">Reemplazo no disponible</p>
                  <p className="text-xs mt-0.5 text-red-500 dark:text-red-300">
                    La solicitud fue rechazada o cancelada.
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

export default MobileReemplazos;