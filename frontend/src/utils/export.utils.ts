import jsPDF from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ── Shared helpers ───────────────────────────────────────────

const CORPORATE_BLUE: [number, number, number] = [15, 76, 151];
const BO_TIMEZONE = "America/La_Paz";

function boDate(): string {
  return new Date().toLocaleDateString("es-BO", {
    timeZone: BO_TIMEZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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

// ── PDF helpers (page number footer) ─────────────────────────

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

// ── Load institution name from API ───────────────────────────

let _cachedName: string | null = null;

async function getInstitutionName(): Promise<string> {
  if (_cachedName) return _cachedName;
  try {
    const { default: api } = await import("@/services/api");
    const res = await api.get<{ ok: boolean; data: { nombreInstitucion: string } }>("/configuracion");
    if (res.data.ok && res.data.data?.nombreInstitucion) {
      _cachedName = res.data.data.nombreInstitucion;
      return _cachedName;
    }
  } catch {}
  return "SICAD";
}

// ==============================================================
// GENERIC PDF EXPORT (for HistoryView, PeriodsView, etc.)
// ==============================================================

export async function exportToPDF(
  data: string[][],
  columns: string[],
  filename: string,
  title: string,
  groupBy?: number
): Promise<void> {
  if (data.length === 0) return;

  const institutionName = await getInstitutionName();
  const isLandscape = data.length > 15 || columns.length > 5;
  const doc = new jsPDF(isLandscape ? "landscape" : "portrait");

  // Header
  doc.setFontSize(18);
  doc.setTextColor(CORPORATE_BLUE[0], CORPORATE_BLUE[1], CORPORATE_BLUE[2]);
  doc.text(institutionName, 14, 18);
  doc.setFontSize(13);
  doc.setTextColor(60);
  doc.text(title, 14, 27);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generado: ${boDateTime()}`, 14, 33);

  // Prepare body
  const sorted = groupBy !== undefined
    ? [...data].sort((a, b) => (a[groupBy] ?? "").localeCompare(b[groupBy] ?? ""))
    : data;

  const body: (string[] | { content: string; colSpan: number; styles: Partial<Record<string, unknown>> })[] = [];
  let prevGroup: string | null = null;

  sorted.forEach((row) => {
    if (groupBy !== undefined) {
      const currentGroup = row[groupBy] ?? "";
      if (currentGroup !== prevGroup) {
        body.push({
          content: currentGroup,
          colSpan: columns.length,
          styles: {
            fillColor: [230, 240, 255],
            textColor: CORPORATE_BLUE,
            fontStyle: "bold",
            fontSize: 8,
            halign: "left",
          },
        });
        prevGroup = currentGroup;
      }
      body.push(row);
    } else {
      body.push(row);
    }
  });

  const tableOpts: UserOptions = {
    startY: 38,
    head: [columns],
    body: body as any,
    styles: { fontSize: 7 },
    headStyles: {
      fillColor: CORPORATE_BLUE,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    margin: { top: 38, bottom: 20 },
    didDrawPage: () => {},
  };

  autoTable(doc, tableOpts);
  const pageCount = doc.getNumberOfPages();
  addFooter(doc, pageCount);
  doc.save(`${filename}.pdf`);
}

// ==============================================================
// GENERIC EXCEL EXPORT (for HistoryView, PeriodsView, etc.)
// ==============================================================

export async function exportToExcel(
  data: Record<string, string | number | boolean | null | undefined>[],
  filename: string,
  groupBy?: string
): Promise<void> {
  if (data.length === 0) return;

  const institutionName = await getInstitutionName();
  const sorted = groupBy
    ? [...data].sort((a, b) => String(a[groupBy] ?? "").localeCompare(String(b[groupBy] ?? "")))
    : data;

  const columns = Object.keys(sorted[0]);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Datos");

  // Row 1: Institution name (merged)
  ws.mergeCells(1, 1, 1, columns.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = institutionName;
  titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF0F4C97" } };
  titleCell.alignment = { horizontal: "left", vertical: "middle" };
  ws.getRow(1).height = 30;

  // Row 2: Date
  ws.mergeCells(2, 1, 2, columns.length);
  const dateCell = ws.getCell(2, 1);
  dateCell.value = `Generado: ${boDateTime()}`;
  dateCell.font = { name: "Calibri", size: 10, color: { argb: "FF666666" } };

  // Row 4: Table headers
  const headerRow = ws.getRow(4);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col;
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F4C97" } };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  headerRow.height = 22;

  // Data rows (starting row 5)
  sorted.forEach((row, rowIdx) => {
    const excelRow = ws.getRow(rowIdx + 5);
    columns.forEach((col, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1);
      cell.value = row[col] ?? "";
      cell.font = { name: "Calibri", size: 10 };
      cell.alignment = { horizontal: "left", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // Auto-filter
  const lastRow = sorted.length + 4;
  const lastCol = String.fromCharCode(64 + columns.length);
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: lastRow, column: columns.length } };

  // Auto-width
  columns.forEach((col, i) => {
    let maxLen = col.length;
    sorted.forEach((row) => {
      const val = String(row[col] ?? "");
      maxLen = Math.max(maxLen, val.length);
    });
    ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 3, 12), 45);
  });

  // Generate buffer and download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `${filename}.xlsx`);
}

// ==============================================================
// ANALYTICS PDF EXPORT (for Reports page)
// ==============================================================

export async function exportAnalyticsPDF(
  analyticsData: {
    kpis: { cumplimientoGeneral: number; totalAsistencias: number; promedioDiario: number; permisosAprobados: number };
    franjaHoraria: { hora: string; puntualidad: number }[];
    graficoBarras: { fecha: string; presentes: number; ausentes: number }[];
    motivosPermiso: { tipo: string; cantidad: number; porcentaje: number }[];
  },
  selectedPeriod: string,
  searchQuery: string
): Promise<void> {
  const institutionName = await getInstitutionName();
  const doc = new jsPDF("landscape");

  // ── Header ──
  doc.setFontSize(20);
  doc.setTextColor(CORPORATE_BLUE[0], CORPORATE_BLUE[1], CORPORATE_BLUE[2]);
  doc.text(institutionName, 14, 18);
  doc.setFontSize(14);
  doc.setTextColor(40);
  doc.text("Reporte General de Asistencia", 14, 27);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Periodo: ${selectedPeriod}  |  Generado: ${boDateTime()}${searchQuery ? `  |  Filtro: ${searchQuery}` : ""}`, 14, 34);

  const { kpis, franjaHoraria, graficoBarras, motivosPermiso } = analyticsData;

  // ── KPIs section ──
  doc.setFontSize(10);
  doc.setTextColor(CORPORATE_BLUE[0], CORPORATE_BLUE[1], CORPORATE_BLUE[2]);
  doc.text("Indicadores Clave", 14, 44);

  const kpiRows = [
    ["Cumplimiento General", `${kpis.cumplimientoGeneral}%`],
    ["Total Asistencias", String(kpis.totalAsistencias)],
    ["Promedio Diario", String(kpis.promedioDiario)],
    ["Ausencias Justificadas", `${kpis.permisosAprobados}`],
  ];

  autoTable(doc, {
    startY: 48,
    head: [["Indicador", "Valor"]],
    body: kpiRows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: CORPORATE_BLUE, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    margin: { bottom: 10 },
  });

  // ── Franja Horaria table ──
  let lastY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFontSize(10);
  doc.setTextColor(CORPORATE_BLUE[0], CORPORATE_BLUE[1], CORPORATE_BLUE[2]);
  doc.text("Asistencia por Franja Horaria", 14, lastY);

  const franjaRows = franjaHoraria.map((f) => [`${f.hora}`, `${f.puntualidad}%`]);
  autoTable(doc, {
    startY: lastY + 4,
    head: [["Hora", "Puntualidad (%)"]],
    body: franjaRows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: CORPORATE_BLUE, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    margin: { bottom: 10 },
  });

  // ── Daily Attendance table ──
  lastY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFontSize(10);
  doc.setTextColor(CORPORATE_BLUE[0], CORPORATE_BLUE[1], CORPORATE_BLUE[2]);
  doc.text("Asistencia Diaria", 14, lastY);

  const dailyRows = graficoBarras.map((b) => [b.fecha, String(b.presentes), String(b.ausentes)]);
  autoTable(doc, {
    startY: lastY + 4,
    head: [["Fecha", "Presentes", "Ausentes"]],
    body: dailyRows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: CORPORATE_BLUE, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    margin: { bottom: 10 },
  });

  // ── Motivos de Permiso table ──
  if (motivosPermiso.length > 0) {
    lastY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.setTextColor(CORPORATE_BLUE[0], CORPORATE_BLUE[1], CORPORATE_BLUE[2]);
    doc.text("Motivos de Permiso", 14, lastY);

    const motivosRows = motivosPermiso.map((m) => [m.tipo, String(m.cantidad), `${m.porcentaje}%`]);
    autoTable(doc, {
      startY: lastY + 4,
      head: [["Tipo", "Cantidad", "Porcentaje"]],
      body: motivosRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: CORPORATE_BLUE, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      margin: { bottom: 10 },
    });
  }

  // ── Footer: page numbers ──
  const pageCount = doc.getNumberOfPages();
  addFooter(doc, pageCount);

  const filename = `Reporte_Asistencia_${selectedPeriod.replace(/\s/g, "_")}`;
  doc.save(`${filename}.pdf`);
}

// ==============================================================
// ANALYTICS EXCEL EXPORT (for Reports page)
// ==============================================================

export async function exportAnalyticsExcel(
  analyticsData: {
    kpis: { cumplimientoGeneral: number; totalAsistencias: number; promedioDiario: number; permisosAprobados: number };
    franjaHoraria: { hora: string; puntualidad: number }[];
    graficoBarras: { fecha: string; presentes: number; ausentes: number }[];
    motivosPermiso: { tipo: string; cantidad: number; porcentaje: number }[];
  },
  selectedPeriod: string,
  searchQuery: string
): Promise<void> {
  const institutionName = await getInstitutionName();
  const { kpis, franjaHoraria, graficoBarras, motivosPermiso } = analyticsData;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Resumen");

  const totalCols = 3;
  const CORP_ARGB = "FF0F4C97";

  // Row 1: Institution name (merged)
  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = institutionName;
  titleCell.font = { name: "Calibri", size: 18, bold: true, color: { argb: CORP_ARGB } };
  titleCell.alignment = { horizontal: "left", vertical: "middle" };
  ws.getRow(1).height = 32;

  // Row 2: Title + period
  ws.mergeCells(2, 1, 2, totalCols);
  const subtitleCell = ws.getCell(2, 1);
  subtitleCell.value = `Reporte General de Asistencia — ${selectedPeriod}${searchQuery ? ` (Filtro: ${searchQuery})` : ""}`;
  subtitleCell.font = { name: "Calibri", size: 12, color: { argb: "FF333333" } };

  // Row 3: Date
  ws.mergeCells(3, 1, 3, totalCols);
  const dateCell = ws.getCell(3, 1);
  dateCell.value = `Generado: ${boDateTime()}`;
  dateCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF888888" } };

  // ── KPIs section ──
  const kpiHeaderRow = ws.getRow(5);
  kpiHeaderRow.getCell(1).value = "Indicador";
  kpiHeaderRow.getCell(2).value = "Valor";
  [1, 2].forEach((c) => {
    const cell = kpiHeaderRow.getCell(c);
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORP_ARGB } };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  const kpiData = [
    ["Cumplimiento General", `${kpis.cumplimientoGeneral}%`],
    ["Total Asistencias", String(kpis.totalAsistencias)],
    ["Promedio Diario", String(kpis.promedioDiario)],
    ["Ausencias Justificadas", `${kpis.permisosAprobados}`],
  ];
  kpiData.forEach((row, i) => {
    const r = ws.getRow(6 + i);
    r.getCell(1).value = row[0];
    r.getCell(2).value = row[1];
    [1, 2].forEach((c) => {
      const cell = r.getCell(c);
      cell.font = { name: "Calibri", size: 10 };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });
  });

  // ── Franja Horaria section ──
  const franjaStartRow = 6 + kpiData.length + 2;
  const franjaHeaderRow = ws.getRow(franjaStartRow);
  franjaHeaderRow.getCell(1).value = "Franja Horaria";
  franjaHeaderRow.getCell(2).value = "Puntualidad (%)";
  [1, 2].forEach((c) => {
    const cell = franjaHeaderRow.getCell(c);
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORP_ARGB } };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  franjaHoraria.forEach((f, i) => {
    const r = ws.getRow(franjaStartRow + 1 + i);
    r.getCell(1).value = f.hora;
    r.getCell(2).value = f.puntualidad;
    [1, 2].forEach((c) => {
      const cell = r.getCell(c);
      cell.font = { name: "Calibri", size: 10 };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });
  });

  // ── Daily Attendance section ──
  const dailyStartRow = franjaStartRow + 1 + franjaHoraria.length + 2;
  const dailyHeaderRow = ws.getRow(dailyStartRow);
  dailyHeaderRow.getCell(1).value = "Fecha";
  dailyHeaderRow.getCell(2).value = "Presentes";
  dailyHeaderRow.getCell(3).value = "Ausentes";
  [1, 2, 3].forEach((c) => {
    const cell = dailyHeaderRow.getCell(c);
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORP_ARGB } };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  graficoBarras.forEach((b, i) => {
    const r = ws.getRow(dailyStartRow + 1 + i);
    r.getCell(1).value = b.fecha;
    r.getCell(2).value = b.presentes;
    r.getCell(3).value = b.ausentes;
    [1, 2, 3].forEach((c) => {
      const cell = r.getCell(c);
      cell.font = { name: "Calibri", size: 10 };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });
  });

  // ── Motivos de Permiso section ──
  if (motivosPermiso.length > 0) {
    const motivosStartRow = dailyStartRow + 1 + graficoBarras.length + 2;
    const motivosHeaderRow = ws.getRow(motivosStartRow);
    motivosHeaderRow.getCell(1).value = "Tipo";
    motivosHeaderRow.getCell(2).value = "Cantidad";
    motivosHeaderRow.getCell(3).value = "Porcentaje";
    [1, 2, 3].forEach((c) => {
      const cell = motivosHeaderRow.getCell(c);
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORP_ARGB } };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });

    motivosPermiso.forEach((m, i) => {
      const r = ws.getRow(motivosStartRow + 1 + i);
      r.getCell(1).value = m.tipo;
      r.getCell(2).value = m.cantidad;
      r.getCell(3).value = `${m.porcentaje}%`;
      [1, 2, 3].forEach((c) => {
        const cell = r.getCell(c);
        cell.font = { name: "Calibri", size: 10 };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });
    });
  }

  // ── AutoFilter on daily attendance table ──
  const lastDataRow = Math.max(
    6 + kpiData.length - 1,
    franjaStartRow + franjaHoraria.length,
    dailyStartRow + graficoBarras.length,
    motivosPermiso.length > 0 ? dailyStartRow + 1 + graficoBarras.length + 2 + motivosPermiso.length : dailyStartRow
  );
  ws.autoFilter = { from: { row: dailyStartRow, column: 1 }, to: { row: dailyStartRow + graficoBarras.length, column: 3 } };

  // ── Auto-width ──
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 22;
  ws.getColumn(3).width = 18;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const filename = `Reporte_Asistencia_${selectedPeriod.replace(/\s/g, "_")}`;
  saveAs(blob, `${filename}.xlsx`);
}

// ==============================================================
// CSV EXPORT (unchanged)
// ==============================================================

export function exportToCSV(
  data: Record<string, string | number | boolean | null | undefined>[],
  filename: string
): void {
  if (data.length === 0) return;

  const columns = Object.keys(data[0]);
  const bom = "\uFEFF";
  const header = columns.join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = row[col] ?? "";
        const str = String(val).replace(/"/g, '""');
        return /[",\n]/.test(str) ? `"${str}"` : str;
      })
      .join(",")
  );
  const csv = bom + [header, ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
