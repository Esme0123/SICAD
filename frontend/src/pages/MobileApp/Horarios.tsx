import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import { motion } from "motion/react";
import { Clock, Download, ChevronDown, CalendarPlus, X } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";
import {
  downloadICS,
  buildGoogleCalendarUrl,
  getPeriodoDateRange,
  parseLocalDate,
  firstWeekdayOnOrAfter,
  dayToIcs,
  dayToIndex,
  formatICalDateTime,
  buildWeeklyRRule,
  CalendarEvent,
} from "@/utils/calendar.utils";

const DIAS_LAB = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const DIAS_CORTO = ["L", "M", "M", "J", "V", "S"];

interface PeriodoCatalogo {
  id: number;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  duracion: number;
  activo: boolean;
}

interface HorarioAsignado {
  id: number;
  usuarioId: number;
  periodoId: number;
  diaSemana: string;
  periodoAcademico: string;
  periodo: PeriodoCatalogo;
}

interface PeriodoInfo {
  nombre: string;
  fechaInicio?: string;
  fechaFin?: string;
}

const CORPORATE_BLUE: [number, number, number] = [15, 76, 151];
const MUSTARD_YELLOW: [number, number, number] = [244, 180, 0];

const API = import.meta.env.VITE_API_URL;

async function apiGet(path: string) {
  const token = localStorage.getItem("sicad_emp_token");
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.message || "Error de API");
  return json.data;
}

function formatHora(hora: string): string {
  return hora.substring(0, 5);
}

function boDateTime(): string {
  return new Date().toLocaleString("es-BO", {
    timeZone: "America/La_Paz",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getInstitutionName(): Promise<string> {
  try {
    const res = await fetch(`${API}/configuracion`);
    const json = await res.json();
    if (json.ok && json.data?.nombreInstitucion) return json.data.nombreInstitucion;
  } catch {}
  return "SICAD - Centro de Cómputo";
}

export const MobileHorarios: React.FC = () => {
  const { user } = useEmployeeAuth();

  // Seleccionar día actual automáticamente (domingo → lunes)
  const getTodayIndex = () => {
    const day = new Date().getDay(); // 0=Dom, 1=Lun, …, 6=Sáb
    return day === 0 ? 0 : day - 1;
  };

  const [periodosAcademicos, setPeriodosAcademicos] = useState<string[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState("");
  const selectedPeriodoRef = useRef(selectedPeriodo);
  const [periodosCatalogo, setPeriodosCatalogo] = useState<PeriodoCatalogo[]>([]);
  const [periodoFechas, setPeriodoFechas] = useState<Record<string, PeriodoInfo>>({});
  const [asignaciones, setAsignaciones] = useState<HorarioAsignado[]>([]);
  const [selectedDay, setSelectedDay] = useState(getTodayIndex());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [syncMenuOpen, setSyncMenuOpen] = useState(false);

  useEffect(() => {
    selectedPeriodoRef.current = selectedPeriodo;
  }, [selectedPeriodo]);

  const fetchAsignaciones = useCallback(async (periodo: string) => {
    if (!user || !periodo) return;
    try {
      const asig = await apiGet(`/horarios/${user.id}?periodoAcademico=${encodeURIComponent(periodo)}`);
      setAsignaciones(asig);
    } catch (error) {
      console.error(error);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [academicos, catalogos, periodosInfo] = await Promise.all([
        apiGet(`/horarios/periodos-academicos?usuarioId=${user.id}`),
        apiGet("/horarios/periodos"),
        apiGet("/periodos"),
      ]);
      setPeriodosAcademicos(academicos);
      setPeriodosCatalogo(catalogos);
      const fechas: Record<string, PeriodoInfo> = {};
      for (const g of periodosInfo || []) {
        if (g && g.nombre) fechas[g.nombre] = { nombre: g.nombre, fechaInicio: g.fechaInicio, fechaFin: g.fechaFin };
      }
      setPeriodoFechas(fechas);
      const periodo = selectedPeriodoRef.current || academicos[0] || "";
      setSelectedPeriodo(periodo);
      await fetchAsignaciones(periodo);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user, fetchAsignaciones]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRefetchOnFocus(loadData);

  const handlePeriodoChange = (value: string) => {
    setSelectedPeriodo(value);
    fetchAsignaciones(value);
  };

  const buildCalendarEvents = useCallback((): CalendarEvent[] => {
    if (!selectedPeriodo) return [];
    const fechas = periodoFechas[selectedPeriodo];
    const range = getPeriodoDateRange(selectedPeriodo);
    const startDate = parseLocalDate(fechas?.fechaInicio) || (range ? parseLocalDate(range.inicio) : null);
    let endDate = parseLocalDate(fechas?.fechaFin) || (range ? parseLocalDate(range.fin) : null);
    if (!startDate) return [];
    if (!endDate) {
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 6, startDate.getDate(), 23, 59, 59);
    }

    const seen = new Set<string>();
    const events: CalendarEvent[] = [];

    for (const a of asignaciones) {
      if (!a.periodo) continue;
      const dayIcs = dayToIcs[a.diaSemana];
      const dow = dayToIndex[a.diaSemana];
      if (!dayIcs || !dow) continue;
      const key = `${a.diaSemana}|${a.periodo.horaInicio}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const firstDate = firstWeekdayOnOrAfter(startDate, dow);
      const [hI, mI] = a.periodo.horaInicio.split(":").map(Number);
      const [hF, mF] = a.periodo.horaFin.split(":").map(Number);
      const startDT = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate(), hI || 0, mI || 0, 0);
      const endDT = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate(), hF || 0, mF || 0, 0);
      const until = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);

      events.push({
        summary: `SICAD - Turno ${formatHora(a.periodo.horaInicio)} a ${formatHora(a.periodo.horaFin)}`,
        description: `Horario asignado en SICAD (${a.diaSemana})`,
        location: "SICAD",
        start: startDT,
        end: endDT,
        rrule: buildWeeklyRRule(dayIcs, until),
      });
    }

    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [selectedPeriodo, asignaciones, periodoFechas]);

  const handleDownloadICS = () => {
    const events = buildCalendarEvents();
    if (events.length === 0) {
      toast.error("No hay horarios asignados para exportar en este periodo.", { position: "bottom-center" });
      return;
    }
    downloadICS(events, `SICAD_Horario_${selectedPeriodo.replace(/\s/g, "_")}.ics`);
    toast.success(
      "Tus horarios se han exportado. Google Calendar te notificará automáticamente 5 minutos antes de tus entradas y salidas.",
      { position: "bottom-center", duration: 5000 }
    );
    setSyncMenuOpen(false);
  };

  const handleOpenGoogle = () => {
    const events = buildCalendarEvents();
    if (events.length === 0) {
      toast.error("No hay horarios asignados para exportar en este periodo.", { position: "bottom-center" });
      return;
    }
    if (events.length > 1) {
      toast.info(
        "Tienes varios bloques de horario. Recomendamos usar \"Descargar Calendario (.ics)\" para importarlos todos de un solo clic.",
        { position: "bottom-center", duration: 6000 }
      );
    }
    window.open(buildGoogleCalendarUrl(events[0]), "_blank", "noopener,noreferrer");
    setSyncMenuOpen(false);
  };

  const asignacionesPorDia = useMemo(() => {
    const map: Record<string, Set<number>> = {};
    for (const a of asignaciones) {
      if (!map[a.diaSemana]) map[a.diaSemana] = new Set();
      map[a.diaSemana].add(a.periodoId);
    }
    return map;
  }, [asignaciones]);

  const dayAssignments = useMemo(() => {
    const diaStr = DIAS_LAB[selectedDay];
    const assignedIds = asignacionesPorDia[diaStr] || new Set();
    return periodosCatalogo.map((p) => ({
      ...p,
      isAssigned: assignedIds.has(p.id),
    }));
  }, [periodosCatalogo, asignacionesPorDia, selectedDay]);

  const handleExportPDF = async () => {
    if (!user || !selectedPeriodo) return;
    setExporting("pdf");
    try {
      const institutionName = await getInstitutionName();
      const doc = new jsPDF("landscape");

      const diasMostrar = DIAS_LAB.slice(0, 6);
      const headers = ["Horario", ...diasMostrar.map((d) => d.substring(0, 3))];

      const body = periodosCatalogo.map((p) => {
        const row: string[] = [`${formatHora(p.horaInicio)} - ${formatHora(p.horaFin)}`];
        diasMostrar.forEach((dia) => {
          const assignedIds = asignacionesPorDia[dia] || new Set();
          row.push(assignedIds.has(p.id) ? "ASIGNADO" : "");
        });
        return row;
      });

      doc.setFontSize(16);
      doc.setTextColor(CORPORATE_BLUE[0], CORPORATE_BLUE[1], CORPORATE_BLUE[2]);
      doc.text(institutionName, 14, 16);

      doc.setFontSize(13);
      doc.setTextColor(40);
      doc.text("Horario de Trabajo", 14, 24);

      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Empleado: ${user.nombre}  |  Código: ${user.codigo}  |  CI: ${user.ci || "—"}  |  Periodo: ${selectedPeriodo}`, 14, 31);
      doc.text(`Generado: ${boDateTime()}`, 14, 37);

      autoTable(doc, {
        startY: 41,
        head: [headers],
        body,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: {
          fillColor: CORPORATE_BLUE,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 30, halign: "center", fontStyle: "bold" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.cell.text[0] === "ASIGNADO") {
            data.cell.styles.fillColor = MUSTARD_YELLOW;
            data.cell.styles.textColor = [30, 41, 59];
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.halign = "center";
          }
        },
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

      doc.save(`Horario_Trabajo_${selectedPeriodo.replace(/\s/g, "_")}.pdf`);
    } catch (err) {
      console.error("Error exporting PDF:", err);
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    if (!user || !selectedPeriodo) return;
    setExporting("excel");
    try {
      const institutionName = await getInstitutionName();
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Horario");

      const diasMostrar = DIAS_LAB.slice(0, 6);
      const totalCols = 1 + diasMostrar.length;
      const MUSTARD_ARGB = "FFF4B400";
      const BLUE_ARGB = "FF0F4C97";

      ws.mergeCells(1, 1, 1, totalCols);
      const titleCell = ws.getCell(1, 1);
      titleCell.value = institutionName;
      titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: BLUE_ARGB } };
      titleCell.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(1).height = 28;

      ws.mergeCells(2, 1, 2, totalCols);
      const subCell = ws.getCell(2, 1);
      subCell.value = `Horario de Trabajo — ${selectedPeriodo}`;
      subCell.font = { name: "Calibri", size: 12, color: { argb: "FF333333" } };

      ws.mergeCells(3, 1, 3, totalCols);
      const empCell = ws.getCell(3, 1);
      empCell.value = `Empleado: ${user.nombre}  |  Código: ${user.codigo}  |  CI: ${user.ci || "—"}`;
      empCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF888888" } };

      ws.mergeCells(4, 1, 4, totalCols);
      const dateCell = ws.getCell(4, 1);
      dateCell.value = `Generado: ${boDateTime()}`;
      dateCell.font = { name: "Calibri", size: 9, color: { argb: "FFAAAAAA" } };

      const headerRow = ws.getRow(6);
      headerRow.getCell(1).value = "Horario";
      headerRow.getCell(1).font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_ARGB } };
      headerRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      headerRow.getCell(1).border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

      diasMostrar.forEach((dia, i) => {
        const cell = headerRow.getCell(i + 2);
        cell.value = dia.substring(0, 3);
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_ARGB } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });
      headerRow.height = 22;

      periodosCatalogo.forEach((p, rowIdx) => {
        const r = ws.getRow(rowIdx + 7);
        const timeCell = r.getCell(1);
        timeCell.value = `${formatHora(p.horaInicio)} - ${formatHora(p.horaFin)}`;
        timeCell.font = { name: "Calibri", size: 10, bold: true };
        timeCell.alignment = { horizontal: "center", vertical: "middle" };
        timeCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

        diasMostrar.forEach((dia, colIdx) => {
          const assignedIds = asignacionesPorDia[dia] || new Set();
          const cell = r.getCell(colIdx + 2);
          if (assignedIds.has(p.id)) {
            cell.value = "ASIGNADO";
            cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF1E293B" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MUSTARD_ARGB } };
          } else {
            cell.value = "";
          }
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        });
      });

      ws.getColumn(1).width = 18;
      for (let i = 2; i <= totalCols; i++) ws.getColumn(i).width = 14;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `Horario_Trabajo_${selectedPeriodo.replace(/\s/g, "_")}.xlsx`);
    } catch (err) {
      console.error("Error exporting Excel:", err);
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-card border border-border rounded-xl p-4 animate-pulse space-y-3">
          <div className="h-5 bg-muted rounded w-36" />
          <div className="h-10 bg-muted rounded w-full" />
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 bg-muted rounded flex-1" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 pb-24 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
          Mis Horarios
        </h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportPDF}
            disabled={exporting !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            <Download size={14} />
            {exporting === "pdf" ? "..." : "PDF"}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{
              background: "var(--accent)",
              color: "var(--accent-foreground)",
            }}
          >
            <Download size={14} />
            {exporting === "excel" ? "..." : "Excel"}
          </button>
        </div>
      </div>

      <div className="relative">
        <select
          value={selectedPeriodo}
          onChange={(e) => handlePeriodoChange(e.target.value)}
          className="w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm font-medium border transition-colors"
          style={{
            background: "var(--card)",
            color: "var(--foreground)",
            borderColor: "var(--border)",
          }}
        >
          {periodosAcademicos.length === 0 && (
            <option value="">Sin periodos disponibles</option>
          )}
          {periodosAcademicos.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--muted-foreground)" }}
        />
      </div>

      <button
        onClick={() => setSyncMenuOpen(true)}
        disabled={!selectedPeriodo || asignaciones.length === 0}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
          boxShadow: "0 4px 14px color-mix(in srgb, var(--primary) 30%, transparent)",
        }}
      >
        <CalendarPlus size={16} />
        Sincronizar con Google Calendar
      </button>

      <div className="flex gap-2">
        {DIAS_CORTO.map((d, i) => {
          const isActive = selectedDay === i;
          const hasAssignments = (asignacionesPorDia[DIAS_LAB[i]]?.size || 0) > 0;
          return (
            <motion.button
              key={d + i}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedDay(i)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: isActive ? "var(--primary)" : "var(--card)",
                color: isActive ? "var(--primary-foreground)" : "var(--foreground)",
                border: isActive ? "none" : "1px solid var(--border)",
                boxShadow: isActive ? "0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent)" : "none",
              }}
            >
              {d}
              {!isActive && hasAssignments && (
                <span className="block text-[8px] font-normal" style={{ color: "var(--muted-foreground)" }}>●</span>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="space-y-1">
        {selectedPeriodo && (
          <div className="flex items-center justify-between px-1 py-2">
            <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              {DIAS_LAB[selectedDay]}
            </span>
            <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
              {dayAssignments.filter((a) => a.isAssigned).length} de {dayAssignments.length} bloques
            </span>
          </div>
        )}

        {!selectedPeriodo ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Clock size={40} style={{ color: "var(--muted-foreground)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
              No hay periodos académicos disponibles
            </p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Contacta al administrador para asignarte un horario
            </p>
          </div>
        ) : dayAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Clock size={40} style={{ color: "var(--muted-foreground)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
              Sin franjas horarias disponibles
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5"
              style={{ background: "var(--border)" }}
            />
            <div className="space-y-2">
              {dayAssignments.map((p, i) => (
                <div
                  key={p.id}
                  className="relative flex items-start gap-4 pl-0"
                >
                  <div className="flex flex-col items-center shrink-0 pt-1.5"
                    style={{ width: 40 }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full border-2 z-10"
                      style={{
                        background: p.isAssigned ? "var(--primary)" : "var(--card)",
                        borderColor: p.isAssigned ? "var(--primary)" : "var(--border)",
                      }}
                    />
                  </div>
                  <div
                    className="flex-1 rounded-xl p-3 border transition-all"
                    style={{
                      background: p.isAssigned
                        ? "color-mix(in srgb, var(--primary) 6%, transparent)"
                        : "var(--card)",
                      borderColor: p.isAssigned
                        ? "color-mix(in srgb, var(--primary) 25%, transparent)"
                        : "var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock size={14} style={{ color: p.isAssigned ? "var(--primary)" : "var(--muted-foreground)" }} />
                        <span className="text-sm font-mono font-bold" style={{ color: "var(--foreground)" }}>
                          {formatHora(p.horaInicio)} - {formatHora(p.horaFin)}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.isAssigned
                            ? "bg-primary/15 text-primary"
                            : ""
                        }`}
                        style={{
                          background: p.isAssigned
                            ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                            : "color-mix(in srgb, var(--muted-foreground) 10%, transparent)",
                          color: p.isAssigned
                            ? "var(--primary)"
                            : "var(--muted-foreground)",
                        }}
                      >
                        {p.isAssigned ? "ASIGNADO" : "LIBRE"}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                      {p.nombre}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {syncMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setSyncMenuOpen(false); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-3 bg-white dark:bg-slate-900"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Sincronizar Horarios
              </h2>
              <button
                onClick={() => setSyncMenuOpen(false)}
                className="p-1 rounded-lg text-slate-500 dark:text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Periodo: <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedPeriodo}</span> · {buildCalendarEvents().length} bloque(s)
            </p>
            <button
              onClick={handleDownloadICS}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
            >
              <Download size={16} className="text-primary" />
              Descargar Calendario (.ics)
              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-auto text-right">
                Abre tu calendario del teléfono
              </span>
            </button>
            <button
              onClick={handleOpenGoogle}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
            >
              <CalendarPlus size={16} className="text-primary" />
              Abrir en Google Calendar
              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-auto text-right">
                Versión web
              </span>
            </button>
            {buildCalendarEvents().length > 1 && (
              <p className="text-[11px] leading-snug text-amber-600 dark:text-amber-400">
                Tienes varios bloques de horario: usa &quot;Descargar Calendario (.ics)&quot; para importarlos todos de una sola vez.
              </p>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default MobileHorarios;