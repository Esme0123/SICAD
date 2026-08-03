import React, { useState, useMemo, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  FileText,
  FileSpreadsheet,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarRange,
} from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { Progress } from "@/components/ui/progress";
import { card } from "@/utils/card";
import { COLORS } from "@/theme/colors";
import api from "@/services/api";
import {
  getCumplimientoSemanal,
  CumplimientoSemanalEmpleado,
  CumplimientoSemanalResumen,
  EstadoCumplimiento,
} from "@/services/attendance.service";

interface ControlHorasViewProps {
  dark: boolean;
}

const BO_TIMEZONE = "America/La_Paz";
const CORP_BLUE: [number, number, number] = [15, 76, 151];
const CORP_ARGB = "FF0F4C97";

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

/** Devuelve { lunes, domingo, label } de la semana según offset (0 = actual, -1 = anterior). */
function getWeekRange(offset: number) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: BO_TIMEZONE }));
  const diff = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff + offset * 7);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  return { monday, sunday, label: `${fmt(monday)} – ${fmt(sunday)}` };
}

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
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [horasFiltro, setHorasFiltro] = useState<"todas" | "20" | "40">("todas");
  const [estadoFiltro, setEstadoFiltro] = useState<"Todos" | EstadoCumplimiento>("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  const weekRange = useMemo(() => getWeekRange(semanaOffset), [semanaOffset]);

  useEffect(() => {
    setLoading(true);
    getCumplimientoSemanal(semanaOffset, horasFiltro)
      .then((res) => {
        setRows(res.data);
        setResumen(res.resumen);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [semanaOffset, horasFiltro]);

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
    if (filteredRows.length === 0) return;
    setExporting("pdf");
    try {
      const institutionName = await getInstitutionName();
      const doc = new jsPDF("landscape");

      // Encabezado institucional
      doc.setFontSize(20);
      doc.setTextColor(CORP_BLUE[0], CORP_BLUE[1], CORP_BLUE[2]);
      doc.text(institutionName, 14, 18);
      doc.setFontSize(13);
      doc.setTextColor(40);
      doc.text("Control de Horas — Cumplimiento Semanal", 14, 27);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Semana: ${weekRange.label}  |  Generado: ${boDateTime()}${searchQuery ? `  |  Filtro: ${searchQuery}` : ""}`, 14, 34);

      // Resumen general de la semana
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

      // Tabla detallada de cumplimiento por empleado
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
      const filename = `Control_Horas_Semana_${weekRange.label.replace(/\//g, "-").replace(/\s/g, "_")}`;
      doc.save(`${filename}.pdf`);
    } catch (error) {
      console.error("[ControlHoras.exportPDF]", error);
    } finally {
      setExporting(null);
    }
  };

  const exportExcel = async () => {
    if (filteredRows.length === 0) return;
    setExporting("excel");
    try {
      const institutionName = await getInstitutionName();
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Cumplimiento Semanal");

      const columns = ["Empleado", "Código", "CI", "Horas Contratadas", "Horas Trabajadas", "% Cumplimiento", "Estado"];
      const totalCols = columns.length;

      // Encabezado institucional
      ws.mergeCells(1, 1, 1, totalCols);
      const titleCell = ws.getCell(1, 1);
      titleCell.value = institutionName;
      titleCell.font = { name: "Calibri", size: 18, bold: true, color: { argb: CORP_ARGB } };
      titleCell.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(1).height = 32;

      ws.mergeCells(2, 1, 2, totalCols);
      const subtitleCell = ws.getCell(2, 1);
      subtitleCell.value = `Control de Horas — Cumplimiento Semanal (${weekRange.label})`;
      subtitleCell.font = { name: "Calibri", size: 12, color: { argb: "FF333333" } };

      ws.mergeCells(3, 1, 3, totalCols);
      const dateCell = ws.getCell(3, 1);
      dateCell.value = `Generado: ${boDateTime()}`;
      dateCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF888888" } };

      // Resumen general
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

      // Tabla detallada
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

        // Celda de estado con color semántico
        const estadoCell = row.getCell(7);
        const pct = e.porcentajeCumplimiento;
        let fill = "FFDC2626";
        if (pct >= 100) fill = "FF16A34A";
        else if (pct >= 60) fill = "FFF59E0B";
        estadoCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
        estadoCell.alignment = { horizontal: "center", vertical: "middle" };

        // Barra de estado: columna de celdas proporcionales al porcentaje
        const barCol = 8;
        row.getCell(barCol).value = `${e.porcentajeCumplimiento}%`;
        row.getCell(barCol).font = { name: "Calibri", size: 9, color: { argb: "FF666666" } };
        row.getCell(barCol).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(barCol).border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });

      // Barra de progreso visual (columna extra) con gradiente por porcentaje
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

      // Encabezado de la columna de barra
      const barHeader = ws.getRow(tableStart).getCell(8);
      barHeader.value = "Avance";
      barHeader.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      barHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORP_ARGB } };
      barHeader.alignment = { horizontal: "center", vertical: "middle" };
      barHeader.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

      // Anchos
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
      const filename = `Control_Horas_Semana_${weekRange.label.replace(/\//g, "-").replace(/\s/g, "_")}`;
      saveAs(blob, `${filename}.xlsx`);
    } catch (error) {
      console.error("[ControlHoras.exportExcel]", error);
    } finally {
      setExporting(null);
    }
  };

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

      {/* Filtros principales */}
      <div className={card(dark, "overflow-hidden mb-5")}>
        <div className="flex flex-wrap items-center gap-4 p-5">
          {/* Selector de semana */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${dark ? "border-white/10" : "border-slate-200"} bg-transparent`}>
            <button
              onClick={() => setSemanaOffset((o) => o - 1)}
              className={`p-2 rounded-lg cursor-pointer transition-colors ${dark ? "text-white/60 hover:bg-white/10" : "text-slate-500 hover:bg-slate-100"}`}
              title="Semana anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2 px-3">
              <CalendarRange size={14} className={dark ? "text-white/40" : "text-slate-400"} />
              <div className="leading-tight">
                <p className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-700"}`}>{weekRange.label}</p>
                <p className={`text-[11px] ${dark ? "text-white/40" : "text-slate-400"}`}>
                  {semanaOffset === 0 ? "Semana actual" : semanaOffset === -1 ? "Semana anterior" : `Hace ${Math.abs(semanaOffset)} semanas`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSemanaOffset((o) => o + 1)}
              className={`p-2 rounded-lg cursor-pointer transition-colors ${dark ? "text-white/60 hover:bg-white/10" : "text-slate-500 hover:bg-slate-100"}`}
              title="Semana siguiente"
            >
              <ChevronRight size={16} />
            </button>
            {semanaOffset !== 0 && (
              <button
                onClick={() => setSemanaOffset(0)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${dark ? "text-white/70 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"}`}
              >
                Hoy
              </button>
            )}
          </div>

          {/* Filtro por horas contratadas */}
          <div className="relative">
            <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"}`}>
              <Clock size={12} />
            </span>
            <select
              value={horasFiltro}
              onChange={(e) => setHorasFiltro(e.target.value as "todas" | "20" | "40")}
              className={`pl-7 pr-8 py-2 rounded-xl border text-xs outline-none appearance-none cursor-pointer transition-all ${dark ? "bg-slate-800 border-slate-700 text-gray-100" : "bg-white border-gray-300 text-gray-900"}`}
            >
              <option value="todas" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Todas las horas</option>
              <option value="20" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">20 hrs</option>
              <option value="40" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">40 hrs</option>
            </select>
          </div>

          {/* Filtro por estado */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            {(["Todos", "En Riesgo", "En Progreso", "Cumplido"] as const).map((estado) => (
              <button
                key={estado}
                onClick={() => setEstadoFiltro(estado)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  estadoFiltro === estado
                    ? "bg-primary text-white shadow-sm"
                    : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {estado === "En Riesgo" ? "En Riesgo 🔴" : estado === "En Progreso" ? "En Progreso 🟡" : estado === "Cumplido" ? "Cumplido 🟢" : "Todos"}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative ml-auto w-full md:w-72">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
            <input
              type="text"
              placeholder="Buscar por nombre, código o CI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none transition-all ${dark
                  ? "bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-primary/60"
                  : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-primary/50 focus:bg-white"
                }`}
            />
          </div>
        </div>
      </div>

      {/* KPIs superiores */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-5">
        {renderKpi("Total Empleados", resumen?.totalEmpleados ?? 0, `Semana ${weekRange.label}`, COLORS.primary, <Users size={20} />)}
        {renderKpi("Cumplidos", resumen?.cumplidos ?? 0, ">= 100%", COLORS.success, <CheckCircle2 size={20} />)}
        {renderKpi("En Progreso", resumen?.enProgreso ?? 0, "60% – 99%", COLORS.warning, <TrendingUp size={20} />)}
        {renderKpi("En Riesgo", resumen?.enRiesgo ?? 0, "< 60%", COLORS.danger, <AlertTriangle size={20} />)}
        {renderKpi("Promedio Semanal", `${resumen?.promedioHoras ?? 0} h`, "horas trabajadas", "#0EA5E9", <TrendingUp size={20} />)}
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
                    <tr key={e.id} className={`border-t transition-colors ${dark ? "border-white/6 hover:bg-primary/10" : "border-slate-100 hover:bg-primary/5"}`}>
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
            Mostrando {filteredRows.length} de {resumen?.totalEmpleados ?? 0} empleados
          </p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>{"< 60%"}</span>
            <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>60–99%</span>
            <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>100%</span>
            <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>{"Superado (>100%)"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
