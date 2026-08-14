import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import { motion } from "motion/react";
import {
  Clock, CheckCircle2, AlertTriangle, FileText, Download,
  ChevronLeft, ChevronRight, CalendarDays, List,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const API = import.meta.env.VITE_API_URL;
const BO_TZ = "America/La_Paz";
const TOLERANCIA_MINUTOS = 10;

type Filtro = "hoy" | "semana" | "mes" | "periodo";

interface Marcacion {
  id: number;
  fecha: string;
  fechaLegible: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  estado: "Puntual" | "Tardanza" | "Justificado" | "Ausente" | "FERIADO" | "Salida" | "Fuera de horario";
  periodo: string | null;
  periodoHorario: string | null;
  observacion: string | null;
  minutosRetraso: number | null;
  salidaOmitida: boolean;
}

interface HistorialResponse {
  ok: boolean;
  data: Marcacion[];
  resumen: { total: number; puntual: number; tardanza: number; justificado: number; ausente: number };
}

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const filtrosIcon: Record<Filtro, React.ElementType> = {
  hoy: Clock, semana: CalendarDays, mes: List, periodo: FileText,
};
const filtrosLabel: Record<Filtro, string> = {
  hoy: "Hoy", semana: "Semana", mes: "Mes", periodo: "Periodo",
};

const estadoConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  Puntual: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30" },
  Tardanza: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30" },
  Justificado: { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30" },
  Ausente: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30" },
  FERIADO: { icon: CalendarDays, color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30" },
  Feriado: { icon: CalendarDays, color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30" },
};

function boDate(date?: Date): Date {
  const d = date || new Date();
  return new Date(d.toLocaleString("en-US", { timeZone: BO_TZ }));
}

function fmtDateISO(d: Date): string {
  const b = boDate(d);
  return `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, "0")}-${String(b.getDate()).padStart(2, "0")}`;
}

/**
  function formatHora(d: Date | null): string {
  if (!d) return null;
  const b = boDate(d);
  return b.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
}**/

/** Convierte "YYYY-MM-DD" a Date LOCAL evitando el desfase UTC.
 *  new Date("2026-07-22") se interpreta como UTC 00:00 y en Bolivia
 *  (-4h) se convierte en 21 de julio. Con esta función el día NO cambia. */
function parseLocalDate(fechaStr: string): Date | null {
  if (!fechaStr) return null;
  const [year, month, day] = fechaStr.split('T')[0].split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatearFechaLocal(fechaStr: string, options?: Intl.DateTimeFormatOptions): string {
  const d = parseLocalDate(fechaStr);
  if (!d) return '';
  return d.toLocaleDateString('es-BO', options || {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
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

function boDateTime(): string {
  return new Date().toLocaleString("es-BO", {
    timeZone: BO_TZ,
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
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

async function getInstitutionName(): Promise<string> {
  try {
    const res = await fetch(`${API}/configuracion`);
    const json = await res.json();
    if (json.ok && json.data?.nombreInstitucion) return json.data.nombreInstitucion;
  } catch { }
  return "SICAD - Centro de Cómputo";
}

export const MobileHistorial: React.FC = () => {
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
  const [data, setData] = useState<Marcacion[]>([]);
  const [, setResumen] = useState<HistorialResponse["resumen"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);

  const dataFiltrada = useMemo(() => {
    if (!filtroEstado) return data;
    return data.filter((m) => m.estado === filtroEstado);
  }, [data, filtroEstado]);

  const resumenEfectivo = useMemo(() => {
    const counts = { total: data.length, puntual: 0, tardanza: 0, justificado: 0, ausente: 0, feriado: 0 };
    data.forEach((m) => {
      if (m.estado === "FERIADO") { counts.feriado++; return; }
      const esTardanzaReal = m.estado === "Tardanza" && (m.minutosRetraso ?? 0) > TOLERANCIA_MINUTOS;
      const estadoEfectivo = esTardanzaReal ? "Tardanza" : (m.estado === "Tardanza" ? "Puntual" : m.estado);
      if (estadoEfectivo === "Puntual") counts.puntual++;
      else if (estadoEfectivo === "Tardanza") counts.tardanza++;
      else if (estadoEfectivo === "Justificado") counts.justificado++;
      else if (estadoEfectivo === "Ausente") counts.ausente++;
    });
    return counts;
  }, [data]);

  // Load periodos academicos once
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

  const buildUrl = useCallback(() => {
    const hoyB = boDate();
    const fmtISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    switch (filtro) {
      case "hoy": {
        const hoyStr = fmtISO(hoyB);
        return `/asistencia/mi-historial?fechaInicio=${hoyStr}&fechaFin=${hoyStr}`;
      }
      case "semana": {
        const dia = hoyB.getDay();
        const diffLun = dia === 0 ? -6 : 1 - dia;
        const lun = new Date(hoyB.getFullYear(), hoyB.getMonth(), hoyB.getDate() + diffLun);
        const dom = new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + 6);
        return `/asistencia/mi-historial?fechaInicio=${fmtISO(lun)}&fechaFin=${fmtISO(dom)}`;
      }
      case "mes":
        return `/asistencia/mi-historial?mes=${mes}&anio=${anio}`;
      case "periodo": {
        if (!selectedPeriodo) return `/asistencia/mi-historial?mes=${mes}&anio=${anio}`;
        const dr = periodoDateRange(selectedPeriodo);
        if (!dr) return `/asistencia/mi-historial?periodoAcademico=${encodeURIComponent(selectedPeriodo)}`;
        return `/asistencia/mi-historial?fechaInicio=${dr.inicio}&fechaFin=${dr.fin}&periodoAcademico=${encodeURIComponent(selectedPeriodo)}`;
      }
      default:
        return `/asistencia/mi-historial`;
    }
  }, [filtro, mes, anio, selectedPeriodo]);

  const fetchHistorial = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const json = await apiGet(buildUrl());
      if (json.ok) {
        setData(json.data);
        setResumen(json.resumen);
      }
    } catch (err) {
      console.error("Error al cargar historial:", err);
    } finally {
      setLoading(false);
    }
  }, [user, buildUrl]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  const cambiarMes = (delta: number) => {
    let nm = mes + delta;
    let ny = anio;
    if (nm < 1) { nm = 12; ny--; }
    if (nm > 12) { nm = 1; ny++; }
    setMes(nm);
    setAnio(ny);
  };

  // ── Export PDF ──
  const handleExportPDF = async () => {
    if (!user) return;
    setExporting("pdf");
    try {
      const inst = await getInstitutionName();
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.setTextColor(15, 76, 151);
      doc.text(inst, 14, 16);

      doc.setFontSize(13);
      doc.setTextColor(40);
      doc.text("Historial de Marcaciones", 14, 24);

      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `Empleado: ${user.nombre}  |  Código: ${user.codigo}  |  CI: ${user.ci || "—"}  |  Filtro: ${filtrosLabel[filtro]}`,
        14, 31
      );
      doc.text(`Generado: ${boDateTime()}`, 14, 37);

      const headers = ["Fecha", "Hora Entrada", "Hora Salida", "Estado", "Periodo"];
      const body = data.map((m) => [
        formatearFechaLocal(m.fecha, { day: "2-digit", month: "short", year: "numeric" }),
        m.horaEntrada || "—",
        m.horaSalida || (m.salidaOmitida ? "Autom." : "—"),
        m.estado,
        m.periodoHorario || m.periodo || "—",
      ]);

      autoTable(doc, {
        startY: 41,
        head: [headers],
        body,
        styles: { fontSize: 7 },
        headStyles: {
          fillColor: [15, 76, 151],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        didParseCell: (data_) => {
          if (data_.section === "body" && data_.column.index === 3) {
            const txt = String(data_.cell.text[0] || "");
            if (txt === "Puntual") {
              data_.cell.styles.textColor = [22, 163, 74];
              data_.cell.styles.fontStyle = "bold";
            } else if (txt === "Tardanza") {
              data_.cell.styles.textColor = [245, 158, 11];
              data_.cell.styles.fontStyle = "bold";
            }
          }
        },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        margin: { top: 41, bottom: 20 },
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(140);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.getWidth() - 14,
          doc.internal.pageSize.getHeight() - 10,
          { align: "right" }
        );
      }
      doc.save(`Historial_Marcaciones_${user.nombre.replace(/\s/g, "_")}.pdf`);
    } catch (err) {
      console.error("Error PDF:", err);
    } finally {
      setExporting(null);
    }
  };

  // ── Export Excel ──
  const handleExportExcel = async () => {
    if (!user) return;
    setExporting("excel");
    try {
      const inst = await getInstitutionName();
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Historial");

      const totalCols = 6;
      const BLUE = "FF0F4C97";

      ws.mergeCells(1, 1, 1, totalCols);
      const t = ws.getCell(1, 1);
      t.value = inst;
      t.font = { name: "Calibri", size: 16, bold: true, color: { argb: BLUE } };
      t.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(1).height = 28;

      ws.mergeCells(2, 1, 2, totalCols);
      const s = ws.getCell(2, 1);
      s.value = `Historial de Marcaciones — ${filtrosLabel[filtro]}`;
      s.font = { name: "Calibri", size: 12, color: { argb: "FF333333" } };

      ws.mergeCells(3, 1, 3, totalCols);
      const e = ws.getCell(3, 1);
      e.value = `Empleado: ${user.nombre}  |  Código: ${user.codigo}  |  CI: ${user.ci || "—"}`;
      e.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF888888" } };

      ws.mergeCells(4, 1, 4, totalCols);
      const g = ws.getCell(4, 1);
      g.value = `Generado: ${boDateTime()}`;
      g.font = { name: "Calibri", size: 9, color: { argb: "FFAAAAAA" } };

      const hr = ws.getRow(6);
      const cols = ["Fecha", "Entrada", "Salida", "Estado", "Periodo"];
      cols.forEach((c, i) => {
        const cell = hr.getCell(i + 1);
        cell.value = c;
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });
      hr.height = 22;

      data.forEach((m, i) => {
        const r = ws.getRow(i + 7);
        const vals = [
          formatearFechaLocal(m.fecha, { day: "2-digit", month: "short", year: "numeric" }),
          m.horaEntrada || "—",
          m.horaSalida || (m.salidaOmitida ? "Automática" : "—"),
          m.estado,
          m.periodoHorario || m.periodo || "—",
        ];
        vals.forEach((v, j) => {
          const cell = r.getCell(j + 1);
          cell.value = v;
          cell.font = { name: "Calibri", size: 10 };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          if (j === 3 && v === "Puntual") {
            cell.font = { ...cell.font, bold: true, color: { argb: "FF16A34A" } };
          } else if (j === 3 && v === "Tardanza") {
            cell.font = { ...cell.font, bold: true, color: { argb: "FFF59E0B" } };
          }
        });
      });

      ws.getColumn(1).width = 22;
      ws.getColumn(2).width = 14;
      ws.getColumn(3).width = 14;
      ws.getColumn(4).width = 14;
      ws.getColumn(5).width = 18;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `Historial_Marcaciones_${user.nombre.replace(/\s/g, "_")}.xlsx`);
    } catch (err) {
      console.error("Error Excel:", err);
    } finally {
      setExporting(null);
    }
  };

  const showNav = filtro === "mes";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 pb-24 space-y-4"
    >
      {/* Header + Export */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
          Historial
        </h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportPDF}
            disabled={exporting !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            <Download size={14} />
            {exporting === "pdf" ? "..." : "PDF"}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            <Download size={14} />
            {exporting === "excel" ? "..." : "Excel"}
          </button>
        </div>
      </div>

      {/* Filtros tabs */}
      <div className="flex gap-1.5">
        {(Object.keys(filtrosLabel) as Filtro[]).map((key) => {
          const Icon = filtrosIcon[key];
          const isActive = filtro === key;
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setFiltro(key); if (key === "periodo" && !selectedPeriodo && periodosAcademicos.length > 0) setSelectedPeriodo(obtenerPeriodoActivo(periodosAcademicos)); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-1 justify-center"
              style={{
                background: isActive ? "var(--primary)" : "var(--card)",
                color: isActive ? "var(--primary-foreground)" : "var(--foreground)",
                border: isActive ? "none" : "1px solid var(--border)",
                boxShadow: isActive ? "0 2px 8px color-mix(in srgb, var(--primary) 25%, transparent)" : "none",
              }}
            >
              <Icon size={14} />
              <span>{filtrosLabel[key]}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Sub-filtros contextuales */}
      {filtro === "mes" && (
        <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
          <button onClick={() => cambiarMes(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" style={{ color: "var(--muted-foreground)" }}>
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{meses[mes - 1]} {anio}</span>
          </div>
          <button onClick={() => cambiarMes(1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" style={{ color: "var(--muted-foreground)" }}>
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {filtro === "periodo" && (
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

      {/* KPIs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl p-3 text-center border animate-pulse" style={{ borderColor: "var(--border)" }}>
              <div className="h-6 bg-muted rounded w-8 mx-auto mb-1" />
              <div className="h-3 bg-muted rounded w-12 mx-auto" />
            </div>
          ))
        ) : resumenEfectivo ? (
          [
            { key: null, label: "Total", value: resumenEfectivo.total, cls: "bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-100", ring: "ring-slate-400" },
            { key: "Puntual", label: "Puntual", value: resumenEfectivo.puntual, cls: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-400", ring: "ring-emerald-400" },
            { key: "Tardanza", label: "Atrasos", value: resumenEfectivo.tardanza, cls: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-400", ring: "ring-amber-400" },
            { key: "Justificado", label: "Justif.", value: resumenEfectivo.justificado, cls: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-400", ring: "ring-blue-400" },
            { key: "Ausente", label: "Ausente", value: resumenEfectivo.ausente, cls: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-400", ring: "ring-rose-400" },
            { key: "FERIADO", label: "Feriado", value: resumenEfectivo.feriado, cls: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/60 dark:border-purple-800 dark:text-purple-400", ring: "ring-purple-400" },
          ].map((s) => {
            const isActive = s.key !== null && filtroEstado === s.key;
            return (
              <button key={s.label}
                onClick={() => {
                  if (s.key === null) { setFiltroEstado(null); return; }
                  setFiltroEstado((prev) => (prev === s.key ? null : s.key));
                }}
                className={`rounded-xl p-3 text-center border shadow-lg transition-all cursor-pointer ${s.cls} ${isActive ? `ring-2 ${s.ring} scale-105` : ""}`}
              >
                <p className="text-2xl font-extrabold tracking-tight">{s.value}</p>
                <p className="text-[10px] font-semibold mt-1 opacity-80">{s.label}</p>
              </button>
            );
          })
        ) : null}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-40 mb-3" />
              <div className="h-3 bg-muted rounded w-28" />
            </div>
          ))}
        </div>
      ) : dataFiltrada.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
            <Clock size={24} style={{ color: "var(--muted-foreground)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Sin registros</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              {filtroEstado ? `No hay registros con estado "${filtroEstado}"` : 'No hay marcaciones en este período'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtroEstado && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
                Mostrando {dataFiltrada.length} de {data.length} registros
              </span>
              <button onClick={() => setFiltroEstado(null)}
                className="text-[10px] font-medium px-2 py-1 rounded-lg transition-colors"
                style={{ color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
              >
                Limpiar filtro
              </button>
            </div>
          )}
          {dataFiltrada.map((m) => {
            // Un retraso solo se considera "Tardanza" si supera los minutos de tolerancia
            const esTardanzaReal = m.estado === "Tardanza" && (m.minutosRetraso ?? 0) > TOLERANCIA_MINUTOS;
            const estadoEfectivo = esTardanzaReal ? "Tardanza" : (m.estado === "Tardanza" ? "Puntual" : m.estado);
            const cfg = estadoConfig[estadoEfectivo] || estadoConfig.Puntual;
            const Icon = cfg.icon;
            const estadoLabel = estadoEfectivo === "FERIADO" ? "Feriado" : estadoEfectivo;
            const f = parseLocalDate(m.fecha);
            const hoyBool = m.fecha === hoy;

            const borderClr = estadoEfectivo === "Puntual" ? "#10B981" :
              estadoEfectivo === "Tardanza" ? "#F59E0B" :
                estadoEfectivo === "Ausente" ? "#EF4444" :
                  estadoEfectivo === "FERIADO" ? "#A855F7" :
                    "#3B82F6";

            const bgGlow = estadoEfectivo === "Puntual" ? "#10B98108" :
              estadoEfectivo === "Tardanza" ? "#F59E0B08" :
                estadoEfectivo === "Ausente" ? "#EF444408" :
                  estadoEfectivo === "FERIADO" ? "#A855F708" :
                    "#3B82F608";

            const tardanzaMin = esTardanzaReal ? m.minutosRetraso : null;

            return (
              <div
                key={m.id}
                className="relative rounded-xl p-4 border overflow-hidden transition-all"
                style={{
                  background: `linear-gradient(135deg, ${bgGlow}, transparent)`,
                  borderColor: `${borderClr}30`,
                  boxShadow: `0 2px 12px ${borderClr}10`,
                }}
              >
                <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                  style={{ background: borderClr }}
                />
                <div className="flex items-start justify-between mb-2 pl-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                      {f ? f.toLocaleDateString("es-BO", {
                        weekday: "long", day: "numeric", month: "long",
                      }) : m.fecha}</p>
                    {hoyBool && (
                      <span className="text-[10px] font-semibold ml-1.5 px-1.5 py-0.5 rounded"
                        style={{ background: `${borderClr}20`, color: borderClr }}
                      >
                        Hoy
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ml-2 border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                    <Icon size={10} />
                    <span>{estadoLabel}</span>
                  </div>
                </div>

                <div className="pl-2">
                  {m.estado !== "Ausente" && m.estado !== "Justificado" && m.estado !== "FERIADO" ? (
                    <div className="flex items-center gap-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
                        <span className="font-mono font-semibold" style={{ color: "var(--foreground)" }}>
                          {m.horaEntrada || "--:--"}
                        </span>
                        {tardanzaMin !== null ? (
                          <span className="text-amber-400 font-semibold">(+{tardanzaMin} min. retraso)</span>
                        ) : (
                          <span className="opacity-60">entrada</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#EF4444" }} />
                        <span className="font-mono font-semibold" style={{ color: "var(--foreground)" }}>
                          {m.horaSalida || (m.salidaOmitida ? "Automática" : "--:--")}
                        </span>
                        <span className="opacity-60">salida</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-medium" style={{ color: borderClr }}>
                      {m.estado === "Justificado"
                        ? `✓ ${m.observacion}`
                        : m.estado === "FERIADO"
                          ? <><CalendarDays size={12} className="inline mr-1.5 -mt-0.5" />{m.observacion}</>
                          : `✗ ${m.observacion}`}
                    </div>
                  )}

                  {m.periodo && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Clock size={10} style={{ color: "var(--muted-foreground)" }} />
                      <span className="text-[10px] font-mono" style={{ color: "var(--muted-foreground)" }}>
                        {m.periodo}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default MobileHistorial;