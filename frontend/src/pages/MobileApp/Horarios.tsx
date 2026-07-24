import React, { useState, useEffect, useMemo } from "react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import { motion } from "motion/react";
import { Clock, Download, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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
  const [periodosCatalogo, setPeriodosCatalogo] = useState<PeriodoCatalogo[]>([]);
  const [asignaciones, setAsignaciones] = useState<HorarioAsignado[]>([]);
  const [selectedDay, setSelectedDay] = useState(getTodayIndex());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      apiGet(`/horarios/periodos-academicos?usuarioId=${user.id}`),
      apiGet("/horarios/periodos"),
    ])
      .then(([academicos, catalogos]) => {
        setPeriodosAcademicos(academicos);
        if (academicos.length > 0) setSelectedPeriodo(academicos[0]);
        setPeriodosCatalogo(catalogos);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user || !selectedPeriodo) return;
    apiGet(`/horarios/${user.id}?periodoAcademico=${encodeURIComponent(selectedPeriodo)}`)
      .then(setAsignaciones)
      .catch(console.error);
  }, [user, selectedPeriodo]);

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
          onChange={(e) => setSelectedPeriodo(e.target.value)}
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
    </motion.div>
  );
};

export default MobileHorarios;