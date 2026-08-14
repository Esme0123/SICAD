import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, Filter, Search, Download, ChevronDown, File, FileSpreadsheet, FileText, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/common/Avatar";
import { card } from "@/utils/card";
import { COLORS } from "@/theme/colors";
import { getAttendanceHistory, editarAsistenciaAdmin, eliminarAsistenciaAdmin, AttendanceRecord } from "@/services/attendance.service";
import { getPeriods, Periodo } from "@/services/schedules.service";
import { exportToExcel, exportToPDF } from "@/utils/export.utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuthStore } from "@/hooks/useAuthStore";

interface HistoryViewProps {
  dark: boolean;
}

function toMinute(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** True si `container` (rango "HH:mm–HH:mm") contiene o es igual a `block`. */
function periodContains(container: string, block: string): boolean {
  if (container === block) return true;
  const c = container.split("–").map(s => s.trim());
  const b = block.split("–").map(s => s.trim());
  if (c.length < 2 || b.length < 2) return false;
  return toMinute(c[0]) <= toMinute(b[0]) && toMinute(c[1]) >= toMinute(b[1]);
}

// Determina el periodo según el mes de la fecha (DD/MM/YYYY o YYYY-MM-DD)
function getPeriodoByDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.includes("/") ? dateStr.split("/") : dateStr.split("-");
  let day: number, month: number, year: number;

  if (parts[0].length === 4) {
    [year, month, day] = parts.map(Number);
  } else {
    [day, month, year] = parts.map(Number);
  }

  if (!month || !year) return "";

  if (month === 1) return `Verano ${year}`;
  if (month >= 2 && month <= 6) return `1-${year}`;
  if (month === 7) return `Invierno ${year}`;
  return `2-${year}`; // Meses 8 a 12 (Agosto - Diciembre)
}

// Obtiene el periodo académico de la fecha actual de Bolivia
function obtenerPeriodoActual(): string {
  const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" }));
  const month = hoy.getMonth() + 1;
  const year = hoy.getFullYear();

  if (month === 1) return `Verano ${year}`;
  if (month >= 2 && month <= 6) return `1-${year}`;
  if (month === 7) return `Invierno ${year}`;
  return `2-${year}`;
}

/** Normaliza "7:05" / "07:05 AM" / "—" a "HH:mm" para inputs de tipo time. */
function normalizeToHHmm(v: string | null | undefined): string {
  if (!v || v === "—") return "";
  const match = String(v).match(/(\d{1,2}):(\d{2})/);
  if (!match) return "";
  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
}

interface ModalEditarAsistenciaProps {
  dark: boolean;
  record: AttendanceRecord;
  saving: boolean;
  onClose: () => void;
  onSave: (horaEntrada: string, horaSalida: string, motivo: string) => void;
  onDelete: () => void;
}

function ModalEditarAsistencia({ dark, record, saving, onClose, onSave, onDelete }: ModalEditarAsistenciaProps) {
  const [horaEntrada, setHoraEntrada] = useState(normalizeToHHmm(record.horaEntrada));
  const [horaSalida, setHoraSalida] = useState(normalizeToHHmm(record.horaSalida));
  const [motivo, setMotivo] = useState("");

  const fieldCls = `w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all ${dark
    ? "bg-white/5 border-white/10 text-white focus:border-primary/60"
    : "bg-slate-50 border-slate-200 text-slate-800 focus:border-primary/50 focus:bg-white"}`;

  const labelCls = `block text-xs font-semibold mb-1.5 ${dark ? "text-white/60" : "text-slate-500"}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className={`w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${dark ? "bg-[#1E293B] border border-white/10" : "bg-white"}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${dark ? "border-white/10" : "border-slate-100"}`}>
          <h3 className={`text-lg font-bold ${dark ? "text-white" : "text-slate-800"}`}>Editar Marcación</h3>
          <button onClick={onClose} disabled={saving} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${dark ? "text-white/50 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className={`flex items-center gap-3 p-3 rounded-xl ${dark ? "bg-white/5 border border-white/10" : "bg-slate-50 border border-slate-100"}`}>
            <Avatar name={record.name} size={38} bg={COLORS.primary} />
            <div className="min-w-0">
              <p className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-slate-800"}`}>{record.name}</p>
              <p className={`text-xs mt-0.5 ${dark ? "text-white/50" : "text-slate-500"}`}>
                CI: {record.ci || "—"} · {record.code}
              </p>
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-3 ${dark ? "text-white/60" : "text-slate-600"}`}>
            <div className={`p-3 rounded-xl text-center ${dark ? "bg-white/5" : "bg-slate-50"}`}>
              <p className="text-[10px] uppercase tracking-wide font-semibold opacity-60">Fecha</p>
              <p className="text-sm font-semibold mt-1">{record.date}</p>
            </div>
            <div className={`p-3 rounded-xl text-center ${dark ? "bg-white/5" : "bg-slate-50"}`}>
              <p className="text-[10px] uppercase tracking-wide font-semibold opacity-60">Periodo</p>
              <p className="text-sm font-semibold mt-1">{record.period || "—"}</p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Hora de Entrada</label>
            <input
              type="time"
              value={horaEntrada}
              onChange={(e) => setHoraEntrada(e.target.value)}
              className={fieldCls}
            />
          </div>

          <div>
            <label className={labelCls}>Hora de Salida</label>
            <input
              type="time"
              value={horaSalida}
              onChange={(e) => setHoraSalida(e.target.value)}
              className={fieldCls}
            />
            <p className={`text-[11px] mt-1 ${dark ? "text-white/35" : "text-slate-400"}`}>
              Si la dejás vacía se eliminará la marcación de salida.
            </p>
          </div>

          <div>
            <label className={labelCls}>Motivo de la Corrección</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Describí la contingencia o justificación de la corrección..."
              className={`${fieldCls} resize-none`}
            />
          </div>
        </div>

        <div className={`flex items-center justify-end gap-2 px-6 py-4 border-t flex-shrink-0 ${dark ? "border-white/10" : "border-slate-100"}`}>
          <button
            onClick={onDelete}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-500/40 transition-colors cursor-pointer disabled:opacity-50 hover:bg-red-500/10"
          >
            <span className="inline-flex items-center gap-1.5"><Trash2 size={15} /> Eliminar Marcación</span>
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${dark ? "border-white/10 text-white/70 hover:bg-white/10" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(horaEntrada, horaSalida, motivo)}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: COLORS.primary }}
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ModalConfirmarEliminacionProps {
  dark: boolean;
  record: AttendanceRecord;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ModalConfirmarEliminacion({ dark, record, deleting, onCancel, onConfirm }: ModalConfirmarEliminacionProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !deleting) onCancel(); }}
    >
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl ${dark ? "bg-[#1E293B] border border-white/10" : "bg-white"}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${dark ? "border-white/10" : "border-slate-100"}`}>
          <h3 className={`text-lg font-bold ${dark ? "text-white" : "text-slate-800"}`}>Eliminar Marcación</h3>
          <button onClick={onCancel} disabled={deleting} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${dark ? "text-white/50 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className={`flex items-start gap-3 p-3 rounded-xl ${dark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-100"}`}>
            <Trash2 size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className={`text-sm leading-relaxed ${dark ? "text-white" : "text-slate-700"}`}>
              ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
            </p>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-xl ${dark ? "bg-white/5 border border-white/10" : "bg-slate-50 border border-slate-100"}`}>
            <Avatar name={record.name} size={32} bg={COLORS.primary} />
            <div className="min-w-0">
              <p className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-slate-800"}`}>{record.name}</p>
              <p className={`text-xs mt-0.5 ${dark ? "text-white/50" : "text-slate-500"}`}>
                {record.code} · {record.date} · {record.period || "—"}
              </p>
            </div>
          </div>
        </div>

        <div className={`flex items-center justify-end gap-2 px-6 py-4 border-t flex-shrink-0 ${dark ? "border-white/10" : "border-slate-100"}`}>
          <button
            onClick={onCancel}
            disabled={deleting}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${dark ? "border-white/10 text-white/70 hover:bg-white/10" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:bg-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#DC2626" }}
          >
            {deleting ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export const HistoryView: React.FC<HistoryViewProps> = ({ dark }) => {
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [periodOptions, setPeriodOptions] = useState<Periodo[]>([]);
  const [quickDateFilter, setQuickDateFilter] = useState<"todos" | "hoy" | "semana" | "mes">("todos");
  const [academicPeriodFilter, setAcademicPeriodFilter] = useState<string>(obtenerPeriodoActual());
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 30;
  const searchRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = (currentUser?.role || "").toUpperCase() === "ADMIN";
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<AttendanceRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [attendanceData, periodsData] = await Promise.all([
        getAttendanceHistory(),
        getPeriods(),
      ]);
      setRows(attendanceData);
      setPeriodOptions(periodsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const uniqueStatuses = useMemo(() => Array.from(new Set(rows.map(r => r.status))), [rows]);

  const uniqueEmployees = useMemo(
    () => Array.from(new Map(rows.map(item => [item.code, item])).values()),
    [rows]
  );

  const suggestions = searchQuery.trim()
    ? uniqueEmployees.filter(
        emp =>
          emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.ci.includes(searchQuery)
      ).slice(0, 5)
    : [];

  // ── Consolidación de filas para soportar jornadas discontinuas / puentes ──
  const consolidatedRows = useMemo(() => {
    const groups: Record<string, AttendanceRecord[]> = {};

    // 1. Agrupar por código de empleado, fecha Y período/bloque de horario
    rows.forEach(row => {
      const key = `${row.code}_${row.date}_${row.period || 'bloque_unico'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    const mergedList: AttendanceRecord[] = [];

    Object.values(groups).forEach(group => {
      const computedAcademicPeriod = getPeriodoByDate(group[0].date);

      if (group.length === 1) {
        mergedList.push({
          ...group[0],
          academicPeriod: computedAcademicPeriod,
        });
        return;
      }

      // Ordenar los registros cronológicamente para no cruzar horas de entrada/salida
      const sortedGroup = [...group].sort((a, b) => {
        const hA = a.horaEntrada && a.horaEntrada !== "—" ? a.horaEntrada : "23:59";
        const hB = b.horaEntrada && b.horaEntrada !== "—" ? b.horaEntrada : "23:59";
        return hA.localeCompare(hB);
      });

      const primeraEntrada = sortedGroup.find(g => g.horaEntrada && g.horaEntrada !== "—")?.horaEntrada || group[0].horaEntrada;
      const ultimaSalida = [...sortedGroup].reverse().find(g => g.horaSalida && g.horaSalida !== "—")?.horaSalida || group[0].horaSalida;

      mergedList.push({
        ...sortedGroup[0],
        period: group[0].period,
        horaEntrada: primeraEntrada,
        horaSalida: ultimaSalida,
        academicPeriod: computedAcademicPeriod,
      });
    });

    return mergedList;
  }, [rows]);

  const filteredRows = useMemo(() => {
    // Fechas de referencia en hora de Bolivia (America/La_Paz)
    const hoyB = new Date(new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" }));
    const inicioHoy = new Date(hoyB.getFullYear(), hoyB.getMonth(), hoyB.getDate());
    const finHoy = new Date(hoyB.getFullYear(), hoyB.getMonth(), hoyB.getDate(), 23, 59, 59, 999);

    // Semana actual: Lunes 00:00 – Domingo 23:59 (hora Bolivia)
    const diaSem = hoyB.getDay();
    const diffLun = diaSem === 0 ? -6 : 1 - diaSem;
    const lunes = new Date(hoyB.getFullYear(), hoyB.getMonth(), hoyB.getDate() + diffLun);
    const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6, 23, 59, 59, 999);

    // Mes actual: 1ro 00:00 – último día 23:59 (hora Bolivia)
    const inicioMes = new Date(hoyB.getFullYear(), hoyB.getMonth(), 1);
    const finMes = new Date(hoyB.getFullYear(), hoyB.getMonth() + 1, 0, 23, 59, 59, 999);

    return consolidatedRows.filter(row => {
      // Filtro por fecha específica (Calendar)
      const matchDate = !filterDate || row.date === format(filterDate, "dd/MM/yyyy");

      // Filtro por Periodo Académico (ej: "2-2026", "Invierno 2026")
      const matchAcademicPeriod = !academicPeriodFilter ||
        row.academicPeriod === academicPeriodFilter ||
        getPeriodoByDate(row.date) === academicPeriodFilter;

      // Filtro por Horario (compatibilidad con rangos consolidados de jornada continua)
      const matchPeriod = filterPeriod === "" || periodContains(row.period || "", filterPeriod);

      // Filtro por Estado
      const matchStatus = filterStatus === "" || row.status === filterStatus;

      // Búsqueda por texto
      const matchEmployee = searchQuery === "" ||
        row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.ci.includes(searchQuery);

      // Filtros rápidos (Hoy / Esta Semana / Este Mes)
      let matchQuickDate = true;
      if (quickDateFilter !== "todos") {
        const [d, m, y] = row.date.split("/").map(Number);
        const rowD = new Date(y, m - 1, d);
        if (quickDateFilter === "hoy") {
          matchQuickDate = rowD >= inicioHoy && rowD <= finHoy;
        } else if (quickDateFilter === "semana") {
          matchQuickDate = rowD >= lunes && rowD <= domingo;
        } else if (quickDateFilter === "mes") {
          matchQuickDate = rowD >= inicioMes && rowD <= finMes;
        }
      }

      return matchDate && matchAcademicPeriod && matchPeriod && matchStatus && matchEmployee && matchQuickDate;
    });
  }, [consolidatedRows, filterDate, academicPeriodFilter, filterPeriod, filterStatus, searchQuery, quickDateFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDate, filterPeriod, filterStatus, quickDateFilter, academicPeriodFilter]);

  // ── Orden cronológico de periodos académicos (del más antiguo al más nuevo) ──
  const sortedAcademicPeriods = useMemo(() => {
    // Extraer periodos únicos disponibles en los datos
    const periodsSet = new Set<string>();
    rows.forEach(r => {
      const p = getPeriodoByDate(r.date);
      if (p) periodsSet.add(p);
    });

    const periodOrderWeight = (periodStr: string) => {
      const [name, yearStr] = periodStr.split(" ");
      let weight = 0;
      if (periodStr.startsWith("Verano")) weight = 1;
      else if (periodStr.startsWith("1-")) weight = 2;
      else if (periodStr.startsWith("Invierno")) weight = 3;
      else if (periodStr.startsWith("2-")) weight = 4;

      const year = parseInt(yearStr || periodStr.split("-")[1] || "0");
      return year * 10 + weight;
    };

    return Array.from(periodsSet).sort((a, b) => periodOrderWeight(a) - periodOrderWeight(b));
  }, [rows]);

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const renderStatusBadge = (status: string) => {
    let style = { bg: "", text: "", dot: "" };
    if (status === "Presente" || status === "Puntual") {
      style = dark
        ? { bg: "bg-green-500/10", text: "text-green-400", dot: "bg-green-400" }
        : { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
    } else if (status === "Atraso" || status === "Tardanza") {
      style = dark
        ? { bg: "bg-yellow-500/15", text: "text-yellow-400", dot: "bg-yellow-400" }
        : { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" };
    } else if (status === "Sin registro" || status === "Ausente") {
      style = dark
        ? { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" }
        : { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
    } else if (status === "Licencia") {
      style = dark
        ? { bg: "bg-primary/20", text: "text-primary", dot: "bg-primary" }
        : { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" };
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
        {status}
      </span>
    );
  };

  const exportExcel = () => {
    const data = filteredRows.map(r => ({
      Empleado: r.name,
      Código: r.code,
      CI: r.ci,
      Fecha: r.date,
      Periodo: r.period,
      'Hora Entrada': r.horaEntrada || '—',
      'Hora Salida': r.horaSalida || '—',
      Estado: r.status,
    }));
    const hoyLocal = new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/La_Paz" }).replace(/\//g, "-");
    exportToExcel(data, `asistencia_${hoyLocal}`, "Empleado");
  };

  const exportPDF = () => {
    const columns = ["Empleado", "Código", "CI", "Fecha", "Periodo", "Hora Entrada", "Hora Salida", "Estado"];
    const body = filteredRows.map(r => [r.name, r.code, r.ci, r.date, r.period, r.horaEntrada || '—', r.horaSalida || '—', r.status]);
    const hoyLocal = new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/La_Paz" }).replace(/\//g, "-");
    exportToPDF(body, columns, `asistencia_${hoyLocal}`, "Historial de Asistencia", 0);
  };

  const handleOpenEdit = (r: AttendanceRecord) => {
    setEditRecord(r);
  };

  const handleSaveEdit = async (horaEntrada: string, horaSalida: string, motivo: string) => {
    if (!editRecord) return;
    const motivoTrim = motivo.trim();
    if (!motivoTrim) {
      toast.error("Debés indicar el motivo de la corrección");
      return;
    }
    setSavingEdit(true);
    try {
      await editarAsistenciaAdmin(editRecord.id, {
        horaEntrada: horaEntrada || null,
        horaSalida: horaSalida || null,
        motivoEdicion: motivoTrim,
        motivo: motivoTrim,
      });
      toast.success("Marcación actualizada correctamente");
      setEditRecord(null);
      await loadData();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Error al editar la marcación";
      toast.error(message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteRecord) return;
    setDeletingRecord(true);
    try {
      await eliminarAsistenciaAdmin(deleteRecord.id);
      toast.success("Marcación eliminada correctamente");
      setDeleteRecord(null);
      setEditRecord(null);
      await loadData();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Error al eliminar la marcación";
      toast.error(message);
    } finally {
      setDeletingRecord(false);
    }
  };

  const handleDeleteFromEdit = () => {
    if (editRecord) {
      setDeleteRecord(editRecord);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}>
      <div className={card(dark, "overflow-hidden")}>
        <div className={`flex flex-wrap items-center gap-4 p-5 border-b ${dark ? "border-white/8" : "border-slate-100"}`}>
          <div className="relative w-full md:w-72" ref={searchRef}>
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
            <input
              type="text"
              placeholder="Buscar por nombre, CI o código..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none transition-all ${dark
                  ? "bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-primary/60"
                  : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-primary/50 focus:bg-white"
                }`}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className={`absolute z-30 w-full mt-1 rounded-xl border shadow-xl overflow-hidden ${dark ? "bg-[#1E293B] border-white/10" : "bg-white border-slate-200"}`}>
                {suggestions.map(emp => (
                  <div
                    key={emp.code}
                    onClick={() => { setSearchQuery(emp.name); setShowSuggestions(false); }}
                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors border-b last:border-b-0 ${dark
                        ? "hover:bg-primary/20 text-white border-white/5"
                        : "hover:bg-primary/10 text-slate-800 border-slate-50"
                      }`}
                  >
                    <div className="font-medium">{emp.name}</div>
                    <div className={`text-xs mt-0.5 ${dark ? "text-white/50" : "text-slate-500"}`}>
                      <span className="font-mono text-primary">{emp.code}</span>
                      {emp.ci && <span className="ml-2">CI: {emp.ci}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 flex-1">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${dark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-primary/30"}`}
                >
                  <CalendarIcon size={12} />
                  {filterDate ? format(filterDate, "dd/MM/yyyy") : "Todas las Fechas"}
                  <ChevronDown size={10} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={(date) => setFilterDate(date ?? undefined)}
                />
                {filterDate && (
                  <div className="border-t p-2">
                    <button
                      onClick={() => setFilterDate(undefined)}
                      className="w-full text-center text-xs font-medium text-red-500 hover:text-red-600 py-1 cursor-pointer"
                    >
                      Limpiar filtro
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <div className="relative">
              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"}`}>
                <Clock size={12} />
              </span>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className={`pl-7 pr-8 py-2 rounded-xl border text-xs outline-none appearance-none cursor-pointer transition-all ${dark ? "bg-slate-800 border-slate-700 text-gray-100" : "bg-white border-gray-300 text-gray-900"}`}
              >
                <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Todos los Periodos</option>
                {periodOptions.map(p => (
                  <option key={p.id} value={`${p.horaInicio}–${p.horaFin}`} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">
                    {p.horaInicio} – {p.horaFin}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"}`}>
                <Filter size={12} />
              </span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`pl-7 pr-8 py-2 rounded-xl border text-xs outline-none appearance-none cursor-pointer transition-all ${dark ? "bg-slate-800 border-slate-700 text-gray-100" : "bg-white border-gray-300 text-gray-900"}`}
              >
                <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Todos los Estados</option>
                {uniqueStatuses.map(s => <option key={s} value={s} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">{s}</option>)}
              </select>
            </div>
          </div>

          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 cursor-pointer shadow-md"
              style={{ background: COLORS.primary }}
            >
              <Download size={14} /> Exportar <ChevronDown size={14} />
            </button>
            {showExportMenu && (
              <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg border overflow-hidden z-20 ${dark ? "bg-[#1E293B] border-white/10" : "bg-white border-slate-200"}`}>
                <button onClick={() => { setShowExportMenu(false); exportPDF(); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${dark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-50"}`}>
                  <File size={16} className="text-red-500" /> Exportar a PDF
                </button>
                <button onClick={() => { setShowExportMenu(false); exportExcel(); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${dark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-50"}`}>
                  <FileSpreadsheet size={16} className="text-green-600" /> Exportar a Excel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={`flex flex-wrap items-center gap-3 px-5 py-3 border-b ${dark ? "border-white/8" : "border-slate-100"}`}>
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            {(["todos", "hoy", "semana", "mes"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => { setQuickDateFilter(mode); setFilterDate(undefined); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  quickDateFilter === mode
                    ? "bg-primary text-white shadow-sm"
                    : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {mode === "todos" ? "Todos" : mode === "hoy" ? "Hoy" : mode === "semana" ? "Esta Semana" : "Este Mes"}
              </button>
            ))}
          </div>

          <div className="relative">
            <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"}`}>
              <FileText size={12} />
            </span>
            <select
              value={academicPeriodFilter}
              onChange={(e) => setAcademicPeriodFilter(e.target.value)}
              className={`pl-7 pr-8 py-2 rounded-xl border text-xs outline-none appearance-none cursor-pointer transition-all ${dark ? "bg-slate-800 border-slate-700 text-gray-100" : "bg-white border-gray-300 text-gray-900"}`}
            >
              <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Todos los Periodos Académicos</option>
              {sortedAcademicPeriods.map(p => (
                <option key={p} value={p} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full">
            <thead>
              <tr className={dark ? "bg-white/3" : "bg-slate-50/80"}>
                {["Empleado", "Código", "CI", "Fecha", "Periodo", "Hora Entrada", "Hora Salida", "Estado", ...(isAdmin ? ["Acciones"] : [])].map(c => (
                  <th key={c} className={`px-5 py-3 text-left text-xs font-semibold tracking-wide ${dark ? "text-white/30" : "text-slate-400"}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8 + (isAdmin ? 1 : 0)} className={`px-5 py-8 text-center text-sm ${dark ? "text-white/40" : "text-slate-500"}`}>
                    Cargando historial...
                  </td>
                </tr>
              ) : filteredRows.length > 0 ? (
                paginatedRows.map((r, i) => (
                  <tr key={i} className={`border-t transition-colors ${dark ? "border-white/6 hover:bg-primary/10" : "border-slate-100 hover:bg-primary/5"}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.name} size={30} bg={COLORS.primary} />
                        <span className={`text-sm font-medium ${dark ? "text-white" : "text-slate-800"}`}>{r.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-mono font-bold ${dark ? "text-primary" : "text-primary"}`}>{r.code}</span>
                    </td>
                    <td className={`px-5 py-3.5 text-sm ${dark ? "text-white/60" : "text-slate-500"}`}>{r.ci}</td>
                    <td className={`px-5 py-3.5 text-sm ${dark ? "text-white/60" : "text-slate-500"}`}>{r.date}</td>
                    <td className={`px-5 py-3.5 text-sm font-mono ${dark ? "text-white/60" : "text-slate-500"}`}>{r.period}</td>
                    <td className={`px-5 py-3.5 text-sm font-mono font-semibold ${dark ? "text-green-400" : "text-green-700"}`}>{r.horaEntrada || "—"}</td>
                    <td className={`px-5 py-3.5 text-sm font-mono ${dark ? "text-red-400" : "text-red-600"}`}>{r.horaSalida || "—"}</td>
                    <td className="px-5 py-3.5">{renderStatusBadge(r.status)}</td>
                    {isAdmin && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(r)}
                            title="Editar horas de la marcación"
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${dark ? "text-white/50 hover:text-primary hover:bg-primary/15" : "text-slate-400 hover:text-primary hover:bg-primary/10"}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteRecord(r)}
                            title="Eliminar marcación"
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${dark ? "text-white/50 hover:text-red-400 hover:bg-red-500/15" : "text-slate-400 hover:text-red-600 hover:bg-red-500/10"}`}
                          >
                            <Trash2 size={15} className="text-red-500" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8 + (isAdmin ? 1 : 0)} className={`px-5 py-8 text-center text-sm ${dark ? "text-white/40" : "text-slate-500"}`}>
                    No se encontraron registros con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3 border-t ${dark ? "border-white/8" : "border-slate-100"}`}>
          <p className={`text-xs ${dark ? "text-white/40" : "text-slate-500"}`}>
            Mostrando {paginatedRows.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0} a {Math.min(currentPage * PAGE_SIZE, filteredRows.length)} de {filteredRows.length} registros
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border disabled:opacity-40 transition-colors cursor-pointer ${dark ? "border-white/10 text-white hover:bg-white/10" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
            >
              Anterior
            </button>

            <span className={`text-xs font-semibold px-2 ${dark ? "text-white" : "text-slate-700"}`}>
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border disabled:opacity-40 transition-colors cursor-pointer ${dark ? "border-white/10 text-white hover:bg-white/10" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {isAdmin && editRecord && (
        <ModalEditarAsistencia
          key={editRecord.id}
          dark={dark}
          record={editRecord}
          saving={savingEdit}
          onClose={() => setEditRecord(null)}
          onSave={handleSaveEdit}
          onDelete={handleDeleteFromEdit}
        />
      )}

      {isAdmin && deleteRecord && (
        <ModalConfirmarEliminacion
          dark={dark}
          record={deleteRecord}
          deleting={deletingRecord}
          onCancel={() => setDeleteRecord(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};
