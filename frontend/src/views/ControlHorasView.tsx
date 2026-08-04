import React, { useState, useMemo, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  FileText,
  FileSpreadsheet,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarRange,
  X,
} from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { SearchAutocomplete } from "@/components/common/SearchAutocomplete";
import { Progress } from "@/components/ui/progress";
import { card } from "@/utils/card";
import { COLORS } from "@/theme/colors";
import api from "@/services/api";
import {
  getCumplimientoSemanal,
  CumplimientoSemanalEmpleado,
  CumplimientoSemanalResumen,
  EstadoCumplimiento,
  DesgloseDiario,
} from "@/services/attendance.service";
import { getGestionesAcademicas } from "@/services/schedules.service";
import { obtenerPeriodoActual } from "@/utils/periodo.utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";

interface ControlHorasViewProps {
  dark: boolean;
}

const BO_TIMEZONE = "America/La_Paz";
const CORP_BLUE: [number, number, number] = [15, 76, 151];
const CORP_ARGB = "FF0F4C97";

function boNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: BO_TIMEZONE }));
}

function boDateTime(): string {
  return new Date().toLocaleString("es-BO", {
    timeZone: BO_TIMEZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function doisDigit(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${doisDigit(d.getMonth() + 1)}-${doisDigit(d.getDate())}`;
}

/** Devuelve las semanas del mes, delimitadas por el primer y último día del mes. */
function getSemanasDelMes(year: number, monthZeroBased: number) {
  const semanas: Array<{ id: string; label: string; fechaInicio: string; fechaFin: string }> = [];
  const primerDiaMes = new Date(year, monthZeroBased, 1);
  const ultimoDiaMes = new Date(year, monthZeroBased + 1, 0);

  let curr = new Date(primerDiaMes);

  while (curr <= ultimoDiaMes) {
    const inicioSemana = new Date(curr);

    // Calcular el domingo de la semana actual
    const dayOfWeek = curr.getDay(); // 0 = Domingo, 1 = Lunes...
    const diasHastaDomingo = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

    const finSemana = new Date(curr);
    finSemana.setDate(curr.getDate() + diasHastaDomingo);

    // Ajustar el fin de semana para no sobrepasar el último día del mes
    const finEfectivo = finSemana > ultimoDiaMes ? new Date(ultimoDiaMes) : finSemana;

    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const labelFmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

    semanas.push({
      id: `semana-${semanas.length + 1}`,
      label: `Semana ${semanas.length + 1} (${labelFmt(inicioSemana)} - ${labelFmt(finEfectivo)})`,
      fechaInicio: fmt(inicioSemana),
      fechaFin: fmt(finEfectivo),
    });

    // La siguiente semana comienza al día siguiente del fin efectivo de esta semana
    curr = new Date(finEfectivo);
    curr.setDate(curr.getDate() + 1);
  }

  return semanas;
}

/** Extrae el año (YYYY) de un periodo académico, ej. "2-2026" / "Verano 2026". */
function yearFromPeriod(periodo: string): number {
  const m = periodo.match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : boNow().getFullYear();
}

/** id de la semana (del arreglo) que contiene la fecha de hoy, o la primera. */
function semanaActualId(semanas: ReturnType<typeof getSemanasDelMes>): string {
  const hoy = fmtDate(boNow());
  const found = semanas.find((s) => hoy >= s.fechaInicio && hoy <= s.fechaFin);
  return found?.id || semanas[0]?.id || "";
}

/** Devuelve los 7 días (Lunes a Domingo) de la semana cuya fechaInicio se indica. */

/** Color hex de la barra de progreso según el porcentaje (para texto/acentos). */
function progressColor(pct: number): string {
  if (pct > 100) return "#0EA5E9"; // Azul — Superado
  if (pct >= 100) return "#16A34A"; // Verde — Cumplido
  if (pct >= 60) return "#F59E0B"; // Amarillo — En Progreso
  return "#DC2626"; // Rojo — En Riesgo
}

/** Color de la barra de progreso según el porcentaje (clases Tailwind estáticas). */
function progressClass(pct: number): string {
  if (pct > 100) return "[&_[data-slot=progress-indicator]]:bg-[#0EA5E9]"; // Azul — Superado
  if (pct >= 100) return "[&_[data-slot=progress-indicator]]:bg-[#16A34A]"; // Verde — Cumplido
  if (pct >= 60) return "[&_[data-slot=progress-indicator]]:bg-[#F59E0B]"; // Amarillo — En Progreso
  return "[&_[data-slot=progress-indicator]]:bg-[#DC2626]"; // Rojo — En Riesgo
}

async function getInstitutionName(): Promise<string> {
  try {
    const res = await api.get<{ ok: boolean; data: { nombreInstitucion: string } }>("/configuracion");
    if (res.data.ok && res.data.data?.nombreInstitucion) return res.data.data.nombreInstitucion;
  } catch {}
  return "SICAD";
}

function addFooter(doc: jsPDF, pageCount: number) {
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: "right" }
    );
  }
}

export const ControlHorasView: React.FC<ControlHorasViewProps> = ({ dark }) => {
  const [rows, setRows] = useState<CumplimientoSemanalEmpleado[]>([]);
  const [resumen, setResumen] = useState<CumplimientoSemanalResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [horasFiltro, setHorasFiltro] = useState<string>("todas");
  const [estadoFiltro, setEstadoFiltro] = useState<"Todos" | EstadoCumplimiento>("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  // ── Jerarquía Periodo ➔ Mes ➔ Semana ──
  const hoy = boNow();
  const [gestiones, setGestiones] = useState<Array<{ nombre: string }>>([]);
  const [periodo, setPeriodo] = useState<string>(obtenerPeriodoActual());
  const [mesSel, setMesSel] = useState<number>(hoy.getMonth());
  const [semanaId, setSemanaId] = useState<string>("");

  const year = useMemo(() => yearFromPeriod(periodo), [periodo]);

  const semanas = useMemo(() => getSemanasDelMes(year, mesSel), [year, mesSel]);

  const semanaSeleccionada = useMemo(
    () => semanas.find((s) => s.id === semanaId) || semanas[semanas.length - 1],
    [semanas, semanaId]
  );

  // ── Detalle diario (drawer) ──
  const [empleadoDetalle, setEmpleadoDetalle] = useState<CumplimientoSemanalEmpleado | null>(null);

  // Cargar periodos académicos y fijar la semana por defecto (la actual del mes)
  useEffect(() => {
    getGestionesAcademicas()
      .then((g) => {
        const nombres = g.map((x) => ({ nombre: x.nombre }));
        if (nombres.length > 0) setGestiones(nombres);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setSemanaId((cur) => cur && semanas.some((s) => s.id === cur) ? cur : semanaActualId(semanas));
  }, [semanas]);

  useEffect(() => {
    if (!semanaSeleccionada) return;
    setLoading(true);
    getCumplimientoSemanal({
      fechaInicio: semanaSeleccionada.fechaInicio,
      fechaFin: semanaSeleccionada.fechaFin,
      horasContratadas: horasFiltro,
      periodoAcademico: periodo,
    })
      .then((res) => {
        setRows(res.data);
        setResumen(res.resumen);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [semanaSeleccionada?.id, horasFiltro, periodo]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter(
      (e) =>
        (estadoFiltro === "Todos" || e.estadoCumplimiento === estadoFiltro) &&
        (q === "" ||
          e.nombre.toLowerCase().includes(q) ||
          e.codigo.toLowerCase().includes(q) ||
          e.ci.toLowerCase().includes(q))
    );
  }, [rows, estadoFiltro, searchQuery]);

  // Ítems para el buscador autocompletado (nombre, código y CI)
  const searchItems = useMemo(
    () =>
      rows.map((e) => ({
        name: e.nombre,
        code: e.codigo,
        ci: e.ci,
      })),
    [rows]
  );

  const renderStatusBadge = (estado: EstadoCumplimiento) => {
    let style = { bg: "", text: "", dot: "" };
    if (estado === "Cumplido" || estado === "Superado") {
      style = dark
        ? { bg: "bg-green-500/10", text: "text-green-400", dot: "bg-green-400" }
        : { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
    } else if (estado === "En Progreso") {
      style = dark
        ? { bg: "bg-yellow-500/15", text: "text-yellow-400", dot: "bg-yellow-400" }
        : { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" };
    } else if (estado === "En Riesgo") {
      style = dark
        ? { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" }
        : { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
        {estado}
      </span>
    );
  };

  const renderKpi = (
    label: string,
    value: string | number,
    sub: string,
    color: string,
    icon: React.ReactNode
  ) => (
    <div className={`flex items-center gap-4 rounded-2xl border p-4 ${dark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"}`}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}1A`, color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-[11px] font-medium uppercase tracking-wide ${dark ? "text-white/40" : "text-slate-400"}`}>{label}</p>
        <p className={`text-xl font-bold truncate ${dark ? "text-white" : "text-slate-800"}`}>{value}</p>
        <p className={`text-[11px] truncate ${dark ? "text-white/40" : "text-slate-400"}`}>{sub}</p>
      </div>
    </div>
  );

  const exportPDF = async () => {
    if (filteredRows.length === 0 || !semanaSeleccionada) return;
    setExporting("pdf");
    try {
      const institutionName = await getInstitutionName();
      const doc = new jsPDF("landscape");

      doc.setFontSize(20);
      doc.setTextColor(CORP_BLUE[0], CORP_BLUE[1], CORP_BLUE[2]);
      doc.text(institutionName, 14, 18);
      doc.setFontSize(13);
      doc.setTextColor(40);
      doc.text("Control de Horas — Cumplimiento Semanal", 14, 27);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Semana: ${semanaSeleccionada.label}  |  Generado: ${boDateTime()}${searchQuery ? `  |  Filtro: ${searchQuery}` : ""}`, 14, 34);

      doc.setFontSize(10);
      doc.setTextColor(CORP_BLUE[0], CORP_BLUE[1], CORP_BLUE[2]);
      doc.text("Resumen General de la Semana", 14, 44);

      const kpiRows = [
        ["Total Empleados", String(resumen?.totalEmpleados ?? 0)],
        ["Cumplidos (>=100%)", String(resumen?.cumplidos ?? 0)],
        ["En Progreso", String(resumen?.enProgreso ?? 0)],
        ["En Riesgo", String(resumen?.enRiesgo ?? 0)],
        ["Promedio de Horas Semanales", String(resumen?.promedioHoras ?? 0)],
      ];
      autoTable(doc, {
        startY: 48,
        head: [["Indicador", "Valor"]],
        body: kpiRows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: CORP_BLUE, textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        margin: { bottom: 10 },
      });

      let lastY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(10);
      doc.setTextColor(CORP_BLUE[0], CORP_BLUE[1], CORP_BLUE[2]);
      doc.text("Cumplimiento por Empleado", 14, lastY);

      const columns = ["Empleado", "Código", "CI", "Horas Contratadas", "Horas Trabajadas", "% Cumplimiento", "Estado"];
      const body = filteredRows.map((e) => [
        e.nombre,
        e.codigo,
        e.ci,
        `${e.horasContratadas} hrs`,
        `${e.horasTrabajadas} hrs`,
        `${e.porcentajeCumplimiento}%`,
        e.estadoCumplimiento,
      ]);

      autoTable(doc, {
        startY: lastY + 4,
        head: [columns],
        body,
        styles: { fontSize: 8 },
        headStyles: { fillColor: CORP_BLUE, textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        margin: { top: 38, bottom: 20 },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 6) {
            const estado = data.cell.raw as string;
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.halign = "center";
            if (estado === "Cumplido" || estado === "Superado") data.cell.styles.textColor = [22, 163, 74];
            else if (estado === "En Progreso") data.cell.styles.textColor = [245, 158, 11];
            else data.cell.styles.textColor = [220, 38, 38];
          }
        },
      });

      const pageCount = doc.getNumberOfPages();
      addFooter(doc, pageCount);
      const filename = `Control_Horas_${periodo}_sem${semanaSeleccionada.id.replace("semana-", "")}_${semanaSeleccionada.fechaInicio}`;
      doc.save(`${filename}.pdf`);
    } catch (error) {
      console.error("[ControlHoras.exportPDF]", error);
    } finally {
      setExporting(null);
    }
  };

  const exportExcel = async () => {
    if (filteredRows.length === 0 || !semanaSeleccionada) return;
    setExporting("excel");
    try {
      const institutionName = await getInstitutionName();
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Cumplimiento Semanal");

      const columns = ["Empleado", "Código", "CI", "Horas Contratadas", "Horas Trabajadas", "% Cumplimiento", "Estado"];
      const totalCols = columns.length;

      ws.mergeCells(1, 1, 1, totalCols);
      const titleCell = ws.getCell(1, 1);
      titleCell.value = institutionName;
      titleCell.font = { name: "Calibri", size: 18, bold: true, color: { argb: CORP_ARGB } };
      titleCell.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(1).height = 32;

      ws.mergeCells(2, 1, 2, totalCols);
      const subtitleCell = ws.getCell(2, 1);
      subtitleCell.value = `Control de Horas — Cumplimiento Semanal (${semanaSeleccionada.label})`;
      subtitleCell.font = { name: "Calibri", size: 12, color: { argb: "FF333333" } };

      ws.mergeCells(3, 1, 3, totalCols);
      const dateCell = ws.getCell(3, 1);
      dateCell.value = `Generado: ${boDateTime()}`;
      dateCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF888888" } };

      const resumenStart = 5;
      const resumenData = [
        ["Total Empleados", String(resumen?.totalEmpleados ?? 0)],
        ["Cumplidos (>=100%)", String(resumen?.cumplidos ?? 0)],
        ["En Progreso", String(resumen?.enProgreso ?? 0)],
        ["En Riesgo", String(resumen?.enRiesgo ?? 0)],
        ["Promedio de Horas Semanales", String(resumen?.promedioHoras ?? 0)],
      ];
      const resumenHeader = ws.getRow(resumenStart);
      ["Indicador", "Valor"].forEach((v, i) => {
        const cell = resumenHeader.getCell(i + 1);
        cell.value = v;
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORP_ARGB } };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      resumenData.forEach((row, i) => {
        const r = ws.getRow(resumenStart + 1 + i);
        r.getCell(1).value = row[0];
        r.getCell(2).value = row[1];
        [1, 2].forEach((c) => {
          const cell = r.getCell(c);
          cell.font = { name: "Calibri", size: 10 };
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        });
      });

      const tableStart = resumenStart + resumenData.length + 2;
      const headerRow = ws.getRow(tableStart);
      columns.forEach((col, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = col;
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORP_ARGB } };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      headerRow.height = 22;

      filteredRows.forEach((e, i) => {
        const row = ws.getRow(tableStart + 1 + i);
        row.getCell(1).value = e.nombre;
        row.getCell(2).value = e.codigo;
        row.getCell(3).value = e.ci;
        row.getCell(4).value = e.horasContratadas;
        row.getCell(5).value = e.horasTrabajadas;
        row.getCell(6).value = e.porcentajeCumplimiento;
        row.getCell(7).value = e.estadoCumplimiento;

        [1, 2, 3, 4, 5, 6, 7].forEach((c) => {
          const cell = row.getCell(c);
          cell.font = { name: "Calibri", size: 10 };
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          cell.alignment = { horizontal: c >= 4 && c <= 6 ? "center" : "left", vertical: "middle" };
        });

        const estadoCell = row.getCell(7);
        const pct = e.porcentajeCumplimiento;
        let fill = "FFDC2626";
        if (pct >= 100) fill = "FF16A34A";
        else if (pct >= 60) fill = "FFF59E0B";
        estadoCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
        estadoCell.alignment = { horizontal: "center", vertical: "middle" };

        const barCol = 8;
        row.getCell(barCol).value = `${e.porcentajeCumplimiento}%`;
        row.getCell(barCol).font = { name: "Calibri", size: 9, color: { argb: "FF666666" } };
        row.getCell(barCol).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(barCol).border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });

      const barStart = tableStart + 1;
      const barEnd = tableStart + filteredRows.length;
      ws.addConditionalFormatting({
        ref: `H${barStart}:H${barEnd}`,
        rules: [
          {
            type: "dataBar",
            cfvo: [{ type: "num", value: 0 }, { type: "num", value: 120 }],
            color: { argb: "FF0F4C97" },
          },
        ],
      });

      const barHeader = ws.getRow(tableStart).getCell(8);
      barHeader.value = "Avance";
      barHeader.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      barHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORP_ARGB } };
      barHeader.alignment = { horizontal: "center", vertical: "middle" };
      barHeader.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

      ws.getColumn(1).width = 30;
      ws.getColumn(2).width = 14;
      ws.getColumn(3).width = 14;
      ws.getColumn(4).width = 18;
      ws.getColumn(5).width = 18;
      ws.getColumn(6).width = 16;
      ws.getColumn(7).width = 16;
      ws.getColumn(8).width = 20;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const filename = `Control_Horas_${periodo}_semana_${semanaSeleccionada.id.replace("semana-", "")}_${semanaSeleccionada.fechaInicio}`;
      saveAs(blob, `${filename}.xlsx`);
    } catch (error) {
      console.error("[ControlHoras.exportExcel]", error);
    } finally {
      setExporting(null);
    }
  };

  const SELECT_CLASSES = `pl-3 pr-8 py-2 rounded-xl border text-xs outline-none appearance-none cursor-pointer transition-all ${dark
    ? "bg-slate-800 border-slate-700 text-gray-100"
    : "bg-white border-gray-300 text-gray-900"}`;

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}>
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className={`text-xl font-bold ${dark ? "text-white" : "text-slate-800"}`}>Control de Horas</h1>
          <p className={`text-sm mt-0.5 ${dark ? "text-white/40" : "text-slate-400"}`}>
            Avance semanal acumulado por empleado (20h / 40h contratadas)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportPDF}
            disabled={exporting !== null || filteredRows.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-md"
            style={{ background: "#DC2626" }}
          >
            {exporting === "pdf" ? <Clock className="animate-spin" size={14} /> : <FileText size={14} />}
            Exportar PDF
          </button>
          <button
            onClick={exportExcel}
            disabled={exporting !== null || filteredRows.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-md"
            style={{ background: "#16A34A" }}
          >
            {exporting === "excel" ? <Clock className="animate-spin" size={14} /> : <FileSpreadsheet size={14} />}
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Filtros jerárquicos */}
      <div className={card(dark, "overflow-hidden mb-5")}>
        <div className="flex flex-wrap items-center gap-3 p-5">
          <span className={`flex items-center gap-1.5 text-xs font-semibold ${dark ? "text-white/40" : "text-slate-400"}`}>
            <CalendarRange size={13} /> Periodo
          </span>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className={SELECT_CLASSES}
          >
            {(gestiones.length ? gestiones : [{ nombre: obtenerPeriodoActual() }]).map((g) => (
              <option key={g.nombre} value={g.nombre} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">
                {g.nombre}
              </option>
            ))}
          </select>

          <span className={`flex items-center gap-1.5 text-xs font-semibold ${dark ? "text-white/40" : "text-slate-400"}`}>
            Mes
          </span>
          <select
            value={mesSel}
            onChange={(e) => setMesSel(parseInt(e.target.value, 10))}
            className={SELECT_CLASSES}
          >
            {[
              "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
              "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
            ].map((mes, i) => (
              <option key={mes} value={i} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">
                {mes} {year}
              </option>
            ))}
          </select>

          <span className={`flex items-center gap-1.5 text-xs font-semibold ${dark ? "text-white/40" : "text-slate-400"}`}>
            <CalendarRange size={13} /> Semana
          </span>
          <select
            value={semanaId}
            onChange={(e) => setSemanaId(e.target.value)}
            className={`${SELECT_CLASSES} min-w-[210px]`}
          >
            {semanas.map((s) => (
              <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">
                {s.label}
              </option>
            ))}
          </select>

          {/* Filtro por horas contratadas */}
          <div className="relative">
            <select
              value={horasFiltro}
              onChange={(e) => setHorasFiltro(e.target.value)}
              className={SELECT_CLASSES}
            >
              <option value="todas" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Horas: Todas</option>
              <option value="20" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Horas: 20 hrs</option>
              <option value="40" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Horas: 40 hrs</option>
            </select>
          </div>

          {/* Filtro por estado */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            {([
              { value: "Todos", label: "Todos" },
              { value: "En Riesgo", label: "En Riesgo 🔴" },
              { value: "En Progreso", label: "En Progreso 🟡" },
              { value: "Cumplido", label: "Cumplido 🟢" },
              { value: "Superado", label: "Superado 🔵" },
            ] as const).map((opcion) => (
              <button
                key={opcion.value}
                onClick={() => setEstadoFiltro(opcion.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  estadoFiltro === opcion.value
                    ? "bg-primary text-white shadow-sm"
                    : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {opcion.label}
              </button>
            ))}
          </div>

          {/* Buscador con autocompletado */}
          <div className="relative ml-auto w-full md:w-72">
            <SearchAutocomplete
              items={searchItems}
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              onSelect={(item) => setSearchQuery(item.name)}
              placeholder="Buscar por nombre, código o CI..."
              dark={dark}
              maxSuggestions={6}
            />
          </div>
        </div>
      </div>

      {/* KPIs superiores */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-5">
        {renderKpi("Periodo", periodo, semanas.length ? `${semanas.length} semanas` : "", COLORS.primary, <CalendarRange size={20} />)}
        {renderKpi("Total Empleados", resumen?.totalEmpleados ?? 0, semanaSeleccionada?.label ?? "", COLORS.primary, <Users size={20} />)}
        {renderKpi("Cumplidos", resumen?.cumplidos ?? 0, ">= 100%", COLORS.success, <CheckCircle2 size={20} />)}
        {renderKpi("En Progreso", resumen?.enProgreso ?? 0, "60% – 99%", COLORS.warning, <TrendingUp size={20} />)}
        {renderKpi("En Riesgo", resumen?.enRiesgo ?? 0, "< 60%", COLORS.danger, <AlertTriangle size={20} />)}
      </div>

      {/* Tabla de cumplimiento */}
      <div className={card(dark, "overflow-hidden")}>
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full">
            <thead>
              <tr className={dark ? "bg-white/3" : "bg-slate-50/80"}>
                {["Empleado", "Código", "CI", "Horas Contratadas", "Horas Trabajadas", "Avance", "Estado"].map((c) => (
                  <th key={c} className={`px-5 py-3 text-left text-xs font-semibold tracking-wide ${dark ? "text-white/30" : "text-slate-400"}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={`px-5 py-8 text-center text-sm ${dark ? "text-white/40" : "text-slate-500"}`}>
                    Cargando cumplimiento semanal...
                  </td>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((e) => {
                  const color = progressColor(e.porcentajeCumplimiento);
                  const barValue = Math.min(e.porcentajeCumplimiento, 100);
                  return (
                    <tr
                      key={e.id}
                      onClick={() => setEmpleadoDetalle(e)}
                      className={`border-t transition-colors cursor-pointer ${dark ? "border-white/6 hover:bg-primary/10" : "border-slate-100 hover:bg-primary/5"}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={e.nombre} size={30} bg={COLORS.primary} />
                          <span className={`text-sm font-medium ${dark ? "text-white" : "text-slate-800"}`}>{e.nombre}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-mono font-bold ${dark ? "text-primary" : "text-primary"}`}>{e.codigo}</span>
                      </td>
                      <td className={`px-5 py-3.5 text-sm ${dark ? "text-white/60" : "text-slate-500"}`}>{e.ci}</td>
                      <td className={`px-5 py-3.5 text-sm ${dark ? "text-white/60" : "text-slate-500"}`}>{e.horasContratadas} hrs</td>
                      <td className={`px-5 py-3.5 text-sm font-semibold ${dark ? "text-white" : "text-slate-700"}`}>{e.horasTrabajadas.toFixed(1)} hrs</td>
                      <td className="px-5 py-3.5 w-56">
                        <div className="flex items-center gap-3">
                          <Progress value={barValue} className={`h-2.5 ${progressClass(e.porcentajeCumplimiento)}`} />
                          <span className="text-xs font-bold whitespace-nowrap w-20 text-right" style={{ color }}>
                            {e.porcentajeCumplimiento.toFixed(1)}%
                          </span>
                        </div>
                        <p className={`text-[11px] mt-0.5 ${dark ? "text-white/40" : "text-slate-400"}`}>
                          {e.horasTrabajadas.toFixed(1)} / {e.horasContratadas.toFixed(1)} hrs
                        </p>
                      </td>
                      <td className="px-5 py-3.5">{renderStatusBadge(e.estadoCumplimiento)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className={`px-5 py-8 text-center text-sm ${dark ? "text-white/40" : "text-slate-500"}`}>
                    No se encontraron empleados con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3 border-t ${dark ? "border-white/8" : "border-slate-100"}`}>
          <p className={`text-xs ${dark ? "text-white/40" : "text-slate-500"}`}>
            Mostrando {filteredRows.length} de {resumen?.totalEmpleados ?? 0} empleados · Promedio semanal: {resumen?.promedioHoras ?? 0} h
            <span className="ml-2">· Haz clic en una fila para ver el desglose diario</span>
          </p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>{"< 60%"}</span>
            <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>60–99%</span>
            <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>100%</span>
            <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>{"Superado (>100%)"}</span>
          </div>
        </div>
      </div>

      {/* Drawer de desglose diario por empleado */}
      <Drawer open={!!empleadoDetalle} onOpenChange={(open) => { if (!open) setEmpleadoDetalle(null); }}>
        <DrawerContent className={dark ? "bg-[#0F172A] text-white" : "bg-white text-slate-800"}>
          <DrawerHeader className="border-b" >
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-3">
                {empleadoDetalle && (
                  <>
                    <Avatar name={empleadoDetalle.nombre} size={36} bg={COLORS.primary} />
                    <div className="leading-tight">
                      <p className="text-base font-bold">{empleadoDetalle.nombre}</p>
                      <p className="text-xs font-mono text-primary">{empleadoDetalle.codigo} · CI {empleadoDetalle.ci || "—"}</p>
                    </div>
                  </>
                )}
              </DrawerTitle>
              <DrawerClose asChild>
                <button className={`p-2 rounded-lg cursor-pointer transition-colors ${dark ? "hover:bg-white/10 text-white" : "hover:bg-slate-100 text-slate-500"}`}>
                  <X size={18} />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
            {semanaSeleccionada && (
              <p className={`text-xs mb-3 ${dark ? "text-white/40" : "text-slate-400"}`}>
                {semanaSeleccionada.label} · {periodo}
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={dark ? "bg-white/5" : "bg-slate-50"}>
                    {["Día", "Hora Entrada", "Hora Salida", "Subtotal del día", "Acumulado"].map((c) => (
                      <th key={c} className={`px-4 py-2.5 text-left text-xs font-semibold ${dark ? "text-white/30" : "text-slate-400"}`}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(empleadoDetalle?.desgloseDiario || []).map((dd: DesgloseDiario, idx) => (
                    <tr key={dd.fecha} className={`border-t ${dark ? "border-white/8" : "border-slate-100"}`}>
                      <td className={`px-4 py-3 text-sm font-medium ${dark ? "text-white" : "text-slate-700"}`}>
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold mr-2 ${dark ? "bg-white/10" : "bg-slate-100"}`}>{idx + 1}</span>
                        <span className="capitalize">{dd.diaNombre}</span>
                        {dd.turnosCount > 1 && (
                          <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {dd.turnosCount} turnos
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-sm font-mono ${dark ? "text-green-400" : "text-green-700"}`}>
                        {dd.horaEntrada || "—"}
                      </td>
                      <td className={`px-4 py-3 text-sm font-mono ${dark ? "text-red-400" : "text-red-600"}`}>
                        {dd.horaSalida || "—"}
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${dark ? "text-white" : "text-slate-700"}`}>
                        {dd.subtotalHoras.toFixed(2)} hrs
                      </td>
                      <td className={`px-4 py-3 text-sm ${dark ? "text-white/60" : "text-slate-500"}`}>
                        {dd.acumuladoHoras.toFixed(2)} hrs
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`mt-4 flex items-center justify-between rounded-xl p-4 ${dark ? "bg-white/5" : "bg-slate-50"}`}>
              <div>
                <p className={`text-xs ${dark ? "text-white/40" : "text-slate-400"}`}>Total semanal</p>
                <p className={`text-2xl font-bold ${dark ? "text-white" : "text-slate-800"}`}>
                  {empleadoDetalle ? empleadoDetalle.horasTrabajadas.toFixed(1) : "0.0"} / {empleadoDetalle?.horasContratadas.toFixed(1)} hrs
                </p>
              </div>
              {empleadoDetalle && (
                <div className="text-right">
                  <p className={`text-xs ${dark ? "text-white/40" : "text-slate-400"}`}>Cumplimiento</p>
                  <p className="text-2xl font-bold" style={{ color: progressColor(empleadoDetalle.porcentajeCumplimiento) }}>
                    {empleadoDetalle.porcentajeCumplimiento.toFixed(1)}%
                  </p>
                  {renderStatusBadge(empleadoDetalle.estadoCumplimiento)}
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};