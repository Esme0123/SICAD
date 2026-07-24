import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { TrendingUp, Download, FileText, Search, ChevronDown, File, FileSpreadsheet } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { card } from "@/utils/card";
import { COLORS } from "@/theme/colors";
import { getAnalisis, AnalisisResponse } from "@/services/report.service";
import { getEmployees, Employee } from "@/services/employees.service";
import { generatePeriodOptions } from "@/utils/periodo.utils";
import { exportAnalyticsPDF, exportAnalyticsExcel } from "@/utils/export.utils";

const CHART_COLORS = ["#0EA5E9", "#8B5CF6", "#F59E0B", "#EF4444", "#10B981", "#F97316", "#06B6D4"];

const PIE_COLORS: Record<string, string> = {
  Puntual: "#2E7D32",
  Tardanza: "#F9A825",
  Ausente: "#C62828",
  Justificado: "#0EA5E9",
};



function mapPeriodToDates(period: string): { startDate: string; endDate: string } {
  const now = new Date();
  const y = now.getFullYear();

  switch (period) {
    case "Diario": {
      const d = now.toISOString().split("T")[0];
      return { startDate: d, endDate: d };
    }
    case "Semanal": {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        startDate: monday.toISOString().split("T")[0],
        endDate: sunday.toISOString().split("T")[0],
      };
    }
    case "Mensual":
      return {
        startDate: `${y}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
        endDate: now.toISOString().split("T")[0],
      };
    default: {
      const matchVerano = period.match(/^Verano (\d{4})$/);
      if (matchVerano) {
        return { startDate: `${matchVerano[1]}-01-01`, endDate: `${matchVerano[1]}-01-31` };
      }
      const matchInvierno = period.match(/^Invierno (\d{4})$/);
      if (matchInvierno) {
        return { startDate: `${matchInvierno[1]}-07-01`, endDate: `${matchInvierno[1]}-07-31` };
      }
      const match1 = period.match(/^1-(\d{4})$/);
      if (match1) {
        return { startDate: `${match1[1]}-02-01`, endDate: `${match1[1]}-06-30` };
      }
      const match2 = period.match(/^2-(\d{4})$/);
      if (match2) {
        return { startDate: `${match2[1]}-08-01`, endDate: `${match2[1]}-12-31` };
      }
      return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
    }
  }
}

interface ReportsProps {
  dark: boolean;
}

export const Reports: React.FC<ReportsProps> = ({ dark }) => {
  // Estados de Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const periodOptions = useMemo(() => generatePeriodOptions(10), []);
  const [selectedPeriod, setSelectedPeriod] = useState(periodOptions[0]?.value ?? "1-2026");

  // Estado para API
  const [analisisData, setAnalisisData] = useState<AnalisisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  // Estado para exportación
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Cerrar menús al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Cargar empleados reales para las sugerencias ──
  useEffect(() => {
    getEmployees().then(setAllEmployees).catch(() => {});
  }, []);

  // ── Fetch real data cuando cambian los filtros ──
  useEffect(() => {
    const { startDate, endDate } = mapPeriodToDates(selectedPeriod);
    setLoading(true);
    getAnalisis({
      startDate,
      endDate,
      search: searchQuery.trim() || undefined,
    })
      .then((data) => setAnalisisData(data))
      .catch((err) => {
        console.error("[Reports] Error fetching analytics:", err);
        setAnalisisData(null);
      })
      .finally(() => setLoading(false));
  }, [searchQuery, selectedPeriod]);

  // ── Preparar datos para los componentes visuales ──
  const reportData = useMemo(() => {
    if (!analisisData) {
      return {
        chartDaily: [] as { d: string; pu: number; ta: number; a: number; j: number }[],
        chartPie: [] as { name: string; value: number; col: string }[],
        chartPeriod: [] as { p: string; pct: number }[],
        chartAbsences: [] as { type: string; count: number; pct: number; col: string }[],
        totalAttendances: 0,
        avgDaily: "0",
        punctualRate: 0,
        totalAbsences: 0,
      };
    }

    const { kpis, graficoBarras, graficoDona, franjaHoraria, motivosPermiso } = analisisData;

    const chartDaily = graficoBarras.map((b) => ({
      d: b.fecha,
      pu: b.puntual,
      ta: b.tardanza,
      a: b.ausentes,
      j: b.justificados,
    }));

    const chartPie = [
      { name: "Puntual", value: graficoDona.puntual, col: PIE_COLORS.Puntual },
      { name: "Tardanza", value: graficoDona.tardanza, col: PIE_COLORS.Tardanza },
      { name: "Ausente", value: graficoDona.ausente, col: PIE_COLORS.Ausente },
      { name: "Justificado", value: graficoDona.justificado, col: PIE_COLORS.Justificado },
    ];

    const chartPeriod = franjaHoraria.map((f) => ({
      p: f.hora,
      pct: f.puntualidad,
    }));

    const chartAbsences = motivosPermiso.map((m, i) => ({
      type: m.tipo,
      count: m.cantidad,
      pct: m.porcentaje,
      col: CHART_COLORS[i % CHART_COLORS.length],
    }));

    const totalAbsences = motivosPermiso.reduce((acc, m) => acc + m.cantidad, 0);

    return {
      chartDaily,
      chartPie,
      chartPeriod,
      chartAbsences,
      totalAttendances: kpis.totalAsistencias,
      avgDaily: String(kpis.promedioDiario),
      punctualRate: kpis.cumplimientoGeneral,
      totalAbsences,
    };
  }, [analisisData]);

  const handleExport = async (format: "PDF" | "Excel") => {
    setShowExportMenu(false);
    if (!analisisData) return;

    setExporting(true);
    try {
      if (format === "Excel") {
        await exportAnalyticsExcel(analisisData, selectedPeriod, searchQuery);
      } else if (format === "PDF") {
        await exportAnalyticsPDF(analisisData, selectedPeriod, searchQuery);
      }
    } finally {
      setExporting(false);
    }
  };

  // Lógica de Sugerencias de Búsqueda desde empleados reales
  const suggestions = searchQuery.trim()
    ? allEmployees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.ci.includes(searchQuery)
    ).slice(0, 5)
    : [];

  const ttStyle = {
    background: dark ? "#1E293B" : "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 11,
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    color: dark ? "#F8FAFC" : "#1E293B",
  };
  const gridColor = dark ? "#334155" : "#F1F5F9";

  return (
    <div
      className="flex-1 overflow-y-auto p-6 space-y-5"
      style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}
    >
      {/* Controles Principales */}
      <div className={card(dark, "p-4 flex flex-col md:flex-row items-center justify-between gap-4")}>

        {/* Buscador de Empleado con Autocompletado */}
        <div className="relative w-full md:w-72" ref={searchRef}>
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
          <input
            type="text"
            placeholder="Buscar empleado (Nombre, CI, Código)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none transition-all ${dark
                ? "bg-[#1E293B] border-white/10 text-white placeholder-white/30 focus:border-blue-500/60"
                : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-600/50"
              }`}
          />
          {/* Menú de Sugerencias */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              className={`absolute z-30 w-full mt-1 rounded-xl border shadow-xl overflow-hidden ${dark ? "bg-[#1E293B] border-white/10" : "bg-white border-slate-200"
                }`}
            >
              {suggestions.map((emp) => (
                <div
                  key={emp.code}
                  onClick={() => {
                    setSearchQuery(emp.name);
                    setShowSuggestions(false);
                  }}
                  className={`px-4 py-2.5 text-sm cursor-pointer transition-colors border-b last:border-b-0 ${dark
                      ? "hover:bg-white/10 text-white border-white/5"
                      : "hover:bg-slate-50 text-slate-800 border-slate-50"
                    }`}
                >
                  <div className="font-medium">{emp.name}</div>
                  <div className={`text-xs mt-0.5 ${dark ? "text-white/50" : "text-slate-500"}`}>
                    <span className={`font-mono ${dark ? "text-blue-400" : "text-blue-600"}`}>{emp.code}</span> • CI: {emp.ci}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filtros Dropdowns y Exportación */}
        <div className="flex flex-wrap items-center w-full md:w-auto gap-3">

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-sm font-medium outline-none transition-all cursor-pointer ${dark
                ? "bg-slate-800 border-slate-700 text-gray-100 focus:border-yellow-500/60"
                : "bg-white border-gray-300 text-gray-900 focus:border-primary/50"
              }`}
          >
            <optgroup label="Corto Plazo" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">
              <option value="Diario" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Diario (Hoy)</option>
              <option value="Semanal" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Semanal</option>
              <option value="Mensual" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Mensual (Mes Actual)</option>
            </optgroup>
            <optgroup label="Periodos Académicos" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">
              {periodOptions.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">{opt.label}</option>
              ))}
            </optgroup>
          </select>

          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 cursor-pointer shadow-md"
              style={{ background: COLORS.primary }}
            >
              <Download size={14} /> Exportar <ChevronDown size={14} />
            </button>

            {showExportMenu && (
              <div
                className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg border overflow-hidden z-20 ${dark ? "bg-[#1E293B] border-white/10" : "bg-white border-slate-200"
                  }`}
              >
                <button onClick={() => handleExport("PDF")} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${dark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-50"}`}>
                  <File size={16} className="text-red-500" /> Exportar a PDF
                </button>
                <button onClick={() => handleExport("Excel")} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${dark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-50"}`}>
                  <FileSpreadsheet size={16} className="text-green-600" /> Exportar a Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={reportRef}>
      {/* Loading overlay */}
      {loading && (
        <div className="flex justify-center py-4">
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Cargando datos...
          </div>
        </div>
      )}

      {/* Tarjetas de Resumen Dinámicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Cumplimiento general", value: `${reportData.punctualRate}%`, sub: selectedPeriod, col: "#2E7D32" },
          { label: "Total asistencias", value: reportData.totalAttendances.toLocaleString(), sub: "Registros válidos", col: COLORS.primary },
          { label: "Promedio diario", value: reportData.avgDaily, sub: "Asistencias por día", col: "#F9A825" },
          { label: "Permisos aprobados", value: reportData.totalAbsences.toString(), sub: "Ausencias justificadas", col: "#0EA5E9" },
        ].map((s, i) => (
          <div key={i} className={card(dark, "p-5 flex items-center gap-4")}>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ background: `${s.col}14` }}
            >
              <TrendingUp size={22} style={{ color: s.col }} />
            </div>
            <div>
              <motion.p
                key={s.value}
                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold leading-none mb-1"
                style={{ color: s.col }}
              >
                {s.value}
              </motion.p>
              <p className={`text-xs font-medium ${dark ? "text-white/70" : "text-slate-700"}`}>
                {s.label}
              </p>
              <p className={`text-[11px] mt-0.5 truncate ${dark ? "text-white/40" : "text-slate-400"}`}>
                {s.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={card(dark, "lg:col-span-2 p-5")}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>
                Asistencia del periodo
              </h3>
              <p className={`text-xs mt-0.5 ${dark ? "text-white/40" : "text-slate-500"}`}>
                Puntuales, justificados y ausentes — {selectedPeriod}
                {searchQuery && ` (Filtrado por: ${searchQuery})`}
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={reportData.chartDaily} barSize={16} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 10, fill: dark ? "#94A3B8" : "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: dark ? "#94A3B8" : "#64748B" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={ttStyle} cursor={{ fill: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="pu" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Puntual" stackId="a" animationDuration={1000} />
              <Bar dataKey="ta" fill="#F9A825" radius={[4, 4, 0, 0]} name="Tardanza" stackId="a" animationDuration={1000} />
              <Bar dataKey="j" fill="#0EA5E9" radius={[4, 4, 0, 0]} name="Justificados" stackId="a" animationDuration={1000} />
              <Bar dataKey="a" fill="#C62828" radius={[4, 4, 0, 0]} name="Ausentes" stackId="a" animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={card(dark, "p-5 flex flex-col")}>
          <h3 className={`font-semibold text-sm mb-1 ${dark ? "text-white" : "text-slate-800"}`}>
            Cumplimiento
          </h3>
          <p className={`text-xs mb-4 ${dark ? "text-white/40" : "text-slate-500"}`}>
            Distribución de estados generales
          </p>
          <div className="flex-1 flex flex-col justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={reportData.chartPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" animationDuration={800}>
                  {reportData.chartPie.map((e, i) => (
                    <Cell key={i} fill={e.col} />
                  ))}
                </Pie>
                <Tooltip contentStyle={ttStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5 mt-4">
              {reportData.chartPie.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: c.col }} />
                    <span className={`text-xs font-medium ${dark ? "text-white/70" : "text-slate-600"}`}>{c.name}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: c.col }}>{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fila Inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Asistencia por Periodo */}
        <div className={card(dark, "lg:col-span-2 p-5")}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>
                Asistencia por franja horaria
              </h3>
              <p className={`text-xs mt-0.5 ${dark ? "text-white/40" : "text-slate-500"}`}>
                Rendimiento de puntualidad según el horario
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {reportData.chartPeriod.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`text-xs font-mono w-12 flex-shrink-0 text-right ${dark ? "text-white/50" : "text-slate-500"}`}>
                  {p.p}
                </span>
                <div className={`flex-1 h-2 rounded-full overflow-hidden ${dark ? "bg-white/8" : "bg-slate-100"}`}>
                  <motion.div
                    key={`${p.p}-${p.pct}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.pct}%` }}
                    transition={{ duration: 0.7 }}
                    className="h-full rounded-full"
                    style={{ background: p.pct >= 85 ? "#2E7D32" : p.pct >= 75 ? COLORS.primary : "#F9A825" }}
                  />
                </div>
                <span className={`text-xs font-bold w-10 flex-shrink-0 ${dark ? "text-white/90" : "text-slate-700"}`}>
                  {p.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Ausencias Justificadas */}
        <div className={card(dark, "p-5 flex flex-col")}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>
                Ausencias Justificadas
              </h3>
              <p className={`text-xs mt-0.5 ${dark ? "text-white/40" : "text-slate-500"}`}>
                Tipos de permisos otorgados
              </p>
            </div>
            <div className={`p-1.5 rounded-lg ${dark ? "bg-white/5" : "bg-slate-50"}`}>
              <FileText size={16} className={dark ? "text-white/50" : "text-slate-400"} />
            </div>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {reportData.chartAbsences.length === 0 ? (
              <p className={`text-xs text-center ${dark ? "text-white/40" : "text-slate-500"}`}>No hay permisos en este periodo.</p>
            ) : (
              reportData.chartAbsences.map((absence, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className={`font-medium ${dark ? "text-white/70" : "text-slate-700"}`}>{absence.type}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold ${dark ? "text-white" : "text-slate-800"}`}>{absence.count}</span>
                      <span className={dark ? "text-white/30" : "text-slate-400"}>({absence.pct}%)</span>
                    </div>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-slate-100"}`}>
                    <motion.div
                      key={absence.count}
                      initial={{ width: 0 }}
                      animate={{ width: `${absence.pct}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full"
                      style={{ background: absence.col }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={`mt-5 pt-4 border-t flex justify-between items-center ${dark ? "border-white/10" : "border-slate-100"}`}>
            <span className={`text-xs ${dark ? "text-white/50" : "text-slate-500"}`}>Total Permisos</span>
            <span className={`text-sm font-bold ${dark ? "text-white" : "text-slate-800"}`}>
              {reportData.totalAbsences} registros
            </span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
