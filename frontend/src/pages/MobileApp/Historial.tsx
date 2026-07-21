import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
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

type Filtro = "hoy" | "semana" | "mes" | "periodo";

interface Marcacion {
  id: number;
  fecha: string;
  fechaLegible: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  estado: "Puntual" | "Tardanza" | "Justificado";
  periodo: string | null;
  observacion: string | null;
  salidaOmitida: boolean;
}

interface HistorialResponse {
  ok: boolean;
  data: Marcacion[];
  resumen: { total: number; puntual: number; tardanza: number; justificado: number };
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

const estadoConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Puntual:    { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  Tardanza:   { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  Justificado: { icon: FileText, color: "text-primary", bg: "bg-primary/10" },
};

function boDate(date?: Date): Date {
  const d = date || new Date();
  return new Date(d.toLocaleString("en-US", { timeZone: BO_TZ }));
}

function fmtDateISO(d: Date): string {
  const b = boDate(d);
  return `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, "0")}-${String(b.getDate()).padStart(2, "0")}`;
}

function formatHora(d: Date | null): string {
  if (!d) return null;
  const b = boDate(d);
  return b.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
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
  } catch {}
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
  const [resumen, setResumen] = useState<HistorialResponse["resumen"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  // Load periodos academicos once
  useEffect(() => {
    if (!user) return;
    apiGet(`/horarios/periodos-academicos?usuarioId=${user.id}`)
      .then((res) => {
        const pa = res.data || [];
        setPeriodosAcademicos(pa);
        if (pa.length > 0 && !selectedPeriodo) setSelectedPeriodo(pa[0]);
      })
      .catch(console.error);
  }, [user]);

  const buildUrl = useCallback(() => {
    const b = boDate();
    switch (filtro) {
      case "hoy": {
        const d = fmtDateISO(b);
        return `/asistencia/mi-historial?fechaInicio=${d}&fechaFin=${d}`;
      }
      case "semana": {
        const dia = b.getDay();
        const diffLun = dia === 0 ? -6 : 1 - dia;
        const lun = new Date(b);
        lun.setDate(b.getDate() + diffLun);
        const sab = new Date(lun);
        sab.setDate(lun.getDate() + 5);
        return `/asistencia/mi-historial?fechaInicio=${fmtDateISO(lun)}&fechaFin=${fmtDateISO(sab)}`;
      }
      case "mes":
        return `/asistencia/mi-historial?mes=${mes}&anio=${anio}`;
      case "periodo":
        return `/asistencia/mi-historial?mes=${mes}&anio=${anio}`;
      default:
        return `/asistencia/mi-historial`;
    }
  }, [filtro, mes, anio, hoy]);

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
        boDate(new Date(m.fecha)).toLocaleDateString("es-BO", {
          day: "2-digit", month: "short", year: "numeric",
        }),
        m.horaEntrada || "—",
        m.horaSalida || (m.salidaOmitida ? "Autom." : "—"),
        m.estado,
        m.periodo || "—",
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
          boDate(new Date(m.fecha)).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" }),
          m.horaEntrada || "—",
          m.horaSalida || (m.salidaOmitida ? "Automática" : "—"),
          m.estado,
          m.periodo || "—",
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
    <div className="p-4 pb-24 space-y-4">
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
            <button
              key={key}
              onClick={() => { setFiltro(key); if (key === "periodo" && !selectedPeriodo && periodosAcademicos.length > 0) setSelectedPeriodo(periodosAcademicos[0]); }}
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
            </button>
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
      <div className="grid grid-cols-4 gap-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-3 text-center border animate-pulse" style={{ borderColor: "var(--border)" }}>
              <div className="h-6 bg-muted rounded w-8 mx-auto mb-1" />
              <div className="h-3 bg-muted rounded w-12 mx-auto" />
            </div>
          ))
        ) : resumen ? (
          [
            { label: "Total", value: resumen.total },
            { label: "Puntual", value: resumen.puntual, clr: "var(--color-success)", bg: "color-mix(in srgb, var(--color-success) 10%, transparent)" },
            { label: "Atrasos", value: resumen.tardanza, clr: "var(--color-warning)", bg: "color-mix(in srgb, var(--color-warning) 10%, transparent)" },
            { label: "Justif.", value: resumen.justificado, clr: "var(--primary)", bg: "color-mix(in srgb, var(--primary) 10%, transparent)" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-3 text-center border"
              style={{ background: s.bg || "var(--card)", borderColor: "var(--border)" }}
            >
              <p className="text-lg font-black" style={{ color: s.clr || "var(--foreground)" }}>{s.value}</p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--muted-foreground)" }}>{s.label}</p>
            </div>
          ))
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
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
            <Clock size={24} style={{ color: "var(--muted-foreground)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Sin registros</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              No hay marcaciones en este período
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((m) => {
            const cfg = estadoConfig[m.estado] || estadoConfig.Puntual;
            const Icon = cfg.icon;
            const f = boDate(new Date(m.fecha));
            const hoyBool = fmtDateISO(f) === hoy;
            return (
              <div
                key={m.id}
                className="bg-card border rounded-xl p-4 transition-colors"
                style={{
                  borderColor: hoyBool ? "var(--primary)" : "var(--border)",
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                      {f.toLocaleDateString("es-BO", {
                        weekday: "long", day: "numeric", month: "long",
                      })}
                    </p>
                    {hoyBool && (
                      <span className="text-[10px] font-semibold" style={{ color: "var(--primary)" }}>
                        Hoy
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ml-2`}
                    style={{ background: cfg.bg === "bg-success/10" ? "color-mix(in srgb, var(--color-success) 10%, transparent)" : cfg.bg === "bg-warning/10" ? "color-mix(in srgb, var(--color-warning) 10%, transparent)" : "color-mix(in srgb, var(--primary) 10%, transparent)", color: `var(--${m.estado === "Puntual" ? "color-success" : m.estado === "Tardanza" ? "color-warning" : "primary"})` }}
                  >
                    <Icon size={10} />
                    <span>{m.estado}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-success)" }} />
                    <span className="font-mono font-medium" style={{ color: "var(--foreground)" }}>
                      {m.horaEntrada || "--:--"}
                    </span>
                    <span>entrada</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-danger)" }} />
                    <span className="font-mono font-medium" style={{ color: "var(--foreground)" }}>
                      {m.horaSalida || (m.salidaOmitida ? "Automática" : "--:--")}
                    </span>
                    <span>salida</span>
                  </div>
                </div>

                {m.periodo && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <Clock size={10} style={{ color: "var(--muted-foreground)" }} />
                    <span className="text-[10px] font-mono" style={{ color: "var(--muted-foreground)" }}>{m.periodo}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MobileHistorial;