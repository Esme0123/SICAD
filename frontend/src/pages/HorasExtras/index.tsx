import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  X,
  Eye,
  Zap,
} from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { COLORS } from "@/theme/colors";
import { card } from "@/utils/card";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";
import {
  getSolicitudesAdmin,
  aprobarSolicitud,
  rechazarSolicitud,
  SolicitudHorasExtras,
} from "@/services/horasExtras.service";

interface HorasExtrasViewProps {
  dark: boolean;
}

const STATUS_MAP: Record<string, { label: string; color: string; darkColor: string }> = {
  PENDIENTE: { label: "Pendiente", color: "text-yellow-500", darkColor: "text-yellow-400" },
  APROBADO: { label: "Aprobado", color: "text-green-600", darkColor: "text-green-400" },
  RECHAZADO: { label: "Rechazado", color: "text-red-600", darkColor: "text-red-400" },
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  PENDIENTE: AlertCircle,
  APROBADO: CheckCircle2,
  RECHAZADO: XCircle,
};

function formatHours(minutes: number): string {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m} min`;
  return `${h}h ${m} min`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    const [year, month, day] = iso.split("T")[0].split("-").map(Number);
    if (!year || !month || !day) return "—";
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  } catch {
    return "—";
  }
}

export const HorasExtrasView: React.FC<HorasExtrasViewProps> = ({ dark }) => {
  const [solicitudes, setSolicitudes] = useState<SolicitudHorasExtras[]>([]);
  const [filterEstado, setFilterEstado] = useState("");
  const [filterFecha, setFilterFecha] = useState("");
  const [filterEmp, setFilterEmp] = useState("");
  const [loadingAction, setLoadingAction] = useState<number | null>(null);
  const currentUser = useAuthStore((s) => s.user);

  const [detail, setDetail] = useState<SolicitudHorasExtras | null>(null);
  const [rejecting, setRejecting] = useState<SolicitudHorasExtras | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState("");

  const loadData = async () => {
    try {
      const list = await getSolicitudesAdmin();
      setSolicitudes(list);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useRefetchOnFocus(loadData);

  const filtered = useMemo(() => {
    return solicitudes.filter((s) => {
      const q = filterEmp.toLowerCase();
      const nombre = s.empleado?.nombre || "";
      const codigo = s.empleado?.codigo || "";
      const ci = s.empleado?.ci || "";
      const matchEmp =
        !filterEmp || nombre.toLowerCase().includes(q) || codigo.toLowerCase().includes(q) || ci.includes(q);
      const matchFecha = !filterFecha || (s.fecha && s.fecha.split("T")[0] === filterFecha);
      const matchEstado = !filterEstado || s.estado === filterEstado;
      return matchEmp && matchFecha && matchEstado;
    });
  }, [solicitudes, filterEmp, filterFecha, filterEstado]);

  const refresh = async () => {
    const list = await getSolicitudesAdmin();
    setSolicitudes(list);
  };

  const handleAprobar = async (id: number) => {
    setLoadingAction(id);
    try {
      await aprobarSolicitud(id, currentUser?.id ? parseInt(currentUser.id) : undefined);
      await refresh();
      setDetail(null);
    } catch (error) {
      console.error("Error al aprobar:", error);
      alert("Ocurrió un error al aprobar la solicitud.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRechazar = async (id: number) => {
    setLoadingAction(id);
    try {
      await rechazarSolicitud(id, rejectMotivo || undefined, currentUser?.id ? parseInt(currentUser.id) : undefined);
      setRejectMotivo("");
      setRejecting(null);
      setDetail(null);
      await refresh();
    } catch (error) {
      console.error("Error al rechazar:", error);
      alert("Ocurrió un error al rechazar la solicitud.");
    } finally {
      setLoadingAction(null);
    }
  };

  const renderEstado = (estado: string) => {
    const st = STATUS_MAP[estado];
    const Icon = STATUS_ICONS[estado] || AlertCircle;
    if (!st) return estado;
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${dark ? st.darkColor : st.color}`}>
        <Icon size={16} /> {st.label}
      </span>
    );
  };

  const badgeBg = (estado: string) =>
    estado === "APROBADO"
      ? "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30"
      : estado === "RECHAZADO"
        ? "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30"
        : "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30";

  const inputCls = `pl-9 pr-4 py-2 rounded-xl border text-sm outline-none transition-all cursor-pointer accent-primary ${
    dark
      ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
      : "bg-white border-slate-200 text-slate-800 focus:border-blue-600/50 shadow-xs"
  }`;

  const selectCls = `pl-9 pr-8 py-2 rounded-xl text-sm border outline-none appearance-none cursor-pointer transition-all ${
    dark ? "bg-slate-800 border-slate-700 text-gray-100" : "bg-white border-gray-300 text-gray-900"
  }`;

  return (
    <div className="flex-1 overflow-y-auto p-6 relative" style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}>
      <div className={card(dark, "overflow-hidden")}>
        <div className={`flex flex-wrap items-center justify-between gap-4 p-5 border-b ${dark ? "border-white/8" : "border-slate-100"}`}>
          <div>
            <h2 className={`text-lg font-bold ${dark ? "text-white" : "text-slate-800"}`}>
              Horas Extras / Recuperación de Horas
            </h2>
            <p className={`text-xs mt-0.5 ${dark ? "text-white/40" : "text-slate-400"}`}>
              Solicitudes de empleados que necesitan recuperar u horas extra.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Filter size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
              <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className={selectCls}>
                <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Todos los estados</option>
                {Object.entries(STATUS_MAP).map(([k, v]) => (
                  <option key={k} value={k} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">{v.label}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <CalendarIcon size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
              <input type="date" value={filterFecha} onChange={(e) => setFilterFecha(e.target.value)} className={inputCls} style={{ accentColor: "#0F4C97" }} />
            </div>
            <input
              value={filterEmp}
              onChange={(e) => setFilterEmp(e.target.value)}
              placeholder="Buscar empleado..."
              className={`pl-4 pr-4 py-2 rounded-xl border text-sm outline-none transition-all ${dark ? "bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-blue-500/60" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-600/50 shadow-xs"}`}
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full">
            <thead>
              <tr className={dark ? "bg-white/3" : "bg-slate-50/80"}>
                {["Empleado", "CI", "Fecha", "Bloques Solicitados", "Horas Totales", "Observación", "Estado", "Acciones"].map((c) => (
                  <th key={c} className={`px-5 py-3 text-left text-xs font-semibold tracking-wide ${dark ? "text-white/30" : "text-slate-400"}`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((s) => (
                  <tr key={s.id} className={`border-t transition-colors ${dark ? "border-white/6 hover:bg-white/3" : "border-slate-100 hover:bg-primary/5"}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.empleado?.nombre || ""} size={32} bg={COLORS.primary} />
                        <div>
                          <span className={`text-sm font-medium ${dark ? "text-white" : "text-slate-800"}`}>{s.empleado?.nombre}</span>
                          <span className={`block text-xs font-mono ${dark ? "text-white/40" : "text-slate-400"}`}>{s.empleado?.codigo}</span>
                        </div>
                      </div>
                    </td>
                    <td className={`px-5 py-4 text-sm font-mono ${dark ? "text-white/70" : "text-slate-600"}`}>{s.empleado?.ci}</td>
                    <td className={`px-5 py-4 text-sm font-medium ${dark ? "text-white/70" : "text-slate-600"}`}>{formatDate(s.fecha)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {(s.bloques as Array<{ nombre?: string; horaInicio?: string; horaFin?: string }>)?.map((b, i) => (
                          <span key={i} className={`px-2 py-1 rounded text-xs font-mono font-medium ${dark ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-700"}`}>
                            <Clock size={11} className="inline mr-1 opacity-60" />
                            {b.horaInicio}–{b.horaFin}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={`px-5 py-4 text-sm font-semibold ${dark ? "text-white" : "text-slate-700"}`}>{formatHours(s.horasTotales)}</td>
                    <td className={`px-5 py-4 text-sm max-w-[200px] truncate ${dark ? "text-white/50" : "text-slate-500"}`}>{s.observacion || "—"}</td>
                    <td className="px-5 py-4">{renderEstado(s.estado)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDetail(s)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          style={{ color: dark ? "#93C5FD" : "#3B82F6", background: dark ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.08)" }}
                        >
                          <Eye size={14} className="inline mr-1" />
                          Detalle
                        </button>
                        {s.estado === "PENDIENTE" && (
                          <>
                            <button
                              onClick={() => handleAprobar(s.id)}
                              disabled={loadingAction === s.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                            >
                              {loadingAction === s.id ? "..." : "Aprobar"}
                            </button>
                            <button
                              onClick={() => { setRejecting(s); setRejectMotivo(""); }}
                              disabled={loadingAction === s.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className={`px-5 py-12 text-center text-sm ${dark ? "text-white/40" : "text-slate-500"}`}>
                    No se encontraron solicitudes de horas extras.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}
        >
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${dark ? "bg-[#1E293B] border border-white/10" : "bg-white"}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${dark ? "border-white/10" : "border-slate-100"}`}>
              <h3 className={`text-lg font-bold ${dark ? "text-white" : "text-slate-800"}`}>Detalle de la Solicitud</h3>
              <button onClick={() => setDetail(null)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${dark ? "text-white/50 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}>
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-base font-bold ${dark ? "text-white" : "text-slate-800"}`}>Recuperación de Horas</p>
                  <p className={`text-xs mt-0.5 ${dark ? "text-white/50" : "text-slate-400"}`}>ID #{detail.id}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${badgeBg(detail.estado)}`}>
                  {detail.estado === "APROBADO" ? <CheckCircle2 size={14} /> : detail.estado === "RECHAZADO" ? <XCircle size={14} /> : <AlertCircle size={14} />}
                  {STATUS_MAP[detail.estado]?.label || detail.estado}
                </span>
              </div>

              <div className={`flex items-center gap-3 p-3 rounded-xl border ${dark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                <Avatar name={detail.empleado?.nombre || ""} size={34} bg={COLORS.primary} />
                <div>
                  <p className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-800"}`}>{detail.empleado?.nombre}</p>
                  <p className={`text-xs ${dark ? "text-white/50" : "text-slate-500"}`}>
                    {detail.empleado?.codigo && `Código: ${detail.empleado.codigo}`}
                    {detail.empleado?.codigo && detail.empleado?.ci && " • "}
                    {detail.empleado?.ci && `CI: ${detail.empleado.ci}`}
                  </p>
                </div>
              </div>

              <div>
                <p className={`text-xs font-medium mb-1 ${dark ? "text-white/50" : "text-slate-400"}`}>Fecha</p>
                <p className={`text-sm font-medium ${dark ? "text-white/80" : "text-slate-700"}`}>{formatDate(detail.fecha)}</p>
              </div>

              <div>
                <p className={`text-xs font-medium mb-1.5 ${dark ? "text-white/50" : "text-slate-400"}`}>
                  Bloques Seleccionados ({(detail.bloques as unknown[]).length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {(detail.bloques as Array<{ id?: number | string; nombre?: string; horaInicio?: string; horaFin?: string }>).map((b, i) => (
                    <span key={i} className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border ${dark ? "bg-white/5 border-white/10 text-white/70" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                      <Clock size={11} className="inline mr-1 opacity-60" />
                      {b.nombre ? `${b.nombre}: ` : ""}{b.horaInicio}–{b.horaFin}
                    </span>
                  ))}
                </div>
              </div>

              <div className={`p-3 rounded-xl flex items-center gap-2 ${dark ? "bg-primary/10 text-white" : "bg-primary/5 text-slate-800"}`}>
                <Zap size={16} style={{ color: COLORS.primary }} />
                <span className="text-sm font-semibold">Horas totales: {formatHours(detail.horasTotales)}</span>
              </div>

              <div>
                <p className={`text-xs font-medium mb-1 ${dark ? "text-white/50" : "text-slate-400"}`}>Observación del Empleado</p>
                <div className={`p-3 rounded-lg text-sm ${dark ? "bg-white/5 text-white/70 border border-white/10" : "bg-slate-50 text-slate-600 border border-slate-200"}`}>
                  {detail.observacion || <span className="italic opacity-60">Sin observación</span>}
                </div>
              </div>

              {detail.motivoRechazo && (
                <div>
                  <p className={`text-xs font-medium mb-1 ${dark ? "text-white/50" : "text-slate-400"}`}>Motivo del Rechazo</p>
                  <div className={`p-3 rounded-lg text-sm border ${dark ? "bg-red-500/10 text-red-200 border-red-500/20" : "bg-red-50 text-red-600 border-red-100"}`}>
                    {detail.motivoRechazo}
                  </div>
                </div>
              )}

              <div className={`p-3 rounded-lg ${dark ? "bg-white/5 border border-white/10" : "bg-slate-50 border border-slate-200"}`}>
                <p className={`text-xs ${dark ? "text-white/40" : "text-slate-400"}`}>Solicitado: {new Date(detail.createdAt).toLocaleString("es-BO")}</p>
                {detail.fechaRespuesta && (
                  <p className={`text-xs mt-1 ${dark ? "text-white/40" : "text-slate-400"}`}>Respondido: {new Date(detail.fechaRespuesta).toLocaleString("es-BO")}</p>
                )}
              </div>
            </div>

            <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0 ${dark ? "border-white/10" : "border-slate-100"}`}>
              <button onClick={() => setDetail(null)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${dark ? "text-white/70 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"}`}>
                Cerrar
              </button>
              {detail.estado === "PENDIENTE" && (
                <>
                  <button
                    onClick={() => handleAprobar(detail.id)}
                    disabled={loadingAction === detail.id}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {loadingAction === detail.id ? "..." : "Aprobar"}
                  </button>
                  <button
                    onClick={() => { setRejecting(detail); setRejectMotivo(""); }}
                    disabled={loadingAction === detail.id}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    Rechazar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {rejecting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setRejecting(null); }}
        >
          <div className={`w-full max-w-md rounded-2xl shadow-2xl ${dark ? "bg-[#1E293B] border border-white/10" : "bg-white"}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${dark ? "border-white/10" : "border-slate-100"}`}>
              <h3 className={`text-lg font-bold ${dark ? "text-white" : "text-slate-800"}`}>Rechazar Solicitud</h3>
              <button onClick={() => setRejecting(null)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${dark ? "text-white/50 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className={`text-sm mb-2 ${dark ? "text-white/60" : "text-slate-600"}`}>
                {rejecting.empleado?.nombre} • {formatDate(rejecting.fecha)} • {formatHours(rejecting.horasTotales)}
              </p>
              <label className={`block text-xs font-medium mb-1.5 ${dark ? "text-white/60" : "text-slate-500"}`}>
                Motivo del rechazo (opcional)
              </label>
              <textarea
                value={rejectMotivo}
                onChange={(e) => setRejectMotivo(e.target.value)}
                rows={3}
                placeholder="Indica el motivo por el que se rechaza la solicitud..."
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none resize-none ${dark ? "bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-red-500/60" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-red-500/60"}`}
              />
            </div>
            <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0 ${dark ? "border-white/10" : "border-slate-100"}`}>
              <button onClick={() => setRejecting(null)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${dark ? "text-white/70 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"}`}>
                Cancelar
              </button>
              <button
                onClick={() => handleRechazar(rejecting.id)}
                disabled={loadingAction === rejecting.id}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {loadingAction === rejecting.id ? "..." : "Confirmar Rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};