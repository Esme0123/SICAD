import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { TrendingUp, Download, Filter, FileText, Search, ChevronDown, File, FileSpreadsheet } from "lucide-react";
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

interface ReportsProps {
  dark: boolean;
}

// Base de datos simulada para las sugerencias de búsqueda
const MOCK_EMPLOYEES = [
  { name: "Carlos Mamani Quispe", code: "CC-001", ci: "12345678" },
  { name: "Ana Flores Mendoza", code: "CC-002", ci: "87654321" },
  { name: "Luis Vargas Silva", code: "CC-003", ci: "55443322" },
  { name: "María Rojas Choque", code: "CC-004", ci: "99887766" },
  { name: "Jorge Condori Paco", code: "CC-005", ci: "11223344" },
];

export const Reports: React.FC<ReportsProps> = ({ dark }) => {
  // Estados de Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("Semestre 1-2026");
  const [selectedRole, setSelectedRole] = useState("Todos");

  // Estado para exportación
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

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

  const handleExport = (format: "PDF" | "Excel" | "CSV") => {
    alert(`Generando reporte del periodo "${selectedPeriod}" en formato ${format}...`);
    setShowExportMenu(false);
  };

  // Lógica de Sugerencias de Búsqueda
  const suggestions = searchQuery.trim()
    ? MOCK_EMPLOYEES.filter(
      (emp) =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.ci.includes(searchQuery)
    ).slice(0, 5)
    : [];

  // ==========================================
  // MOTOR DE DATOS DINÁMICOS (Simula el backend)
  // ==========================================
  const reportData = useMemo(() => {
    // 1. Determinar el multiplicador de volumen según el periodo
    let volMultiplier = 1;
    if (selectedPeriod === "Diario") volMultiplier = 0.05;
    else if (selectedPeriod === "Semanal") volMultiplier = 0.25;
    else if (selectedPeriod === "Mensual" || selectedPeriod === "Julio 2026" || selectedPeriod === "Enero 2026") volMultiplier = 1;
    else volMultiplier = 5; // Semestres

    // 2. Ajustar por cargo
    let roleMod = 1;
    let punctualRate = 68;
    let tardyRate = 22;
    let absentRate = 10;

    if (selectedRole === "Auxiliar") { roleMod = 0.4; punctualRate = 60; tardyRate = 25; absentRate = 15; }
    if (selectedRole === "Técnico") { roleMod = 0.5; punctualRate = 75; tardyRate = 18; absentRate = 7; }
    if (selectedRole === "Coordinador") { roleMod = 0.1; punctualRate = 92; tardyRate = 6; absentRate = 2; }

    // 3. Si hay un empleado buscado, el volumen es mínimo (solo 1 persona) y la puntualidad es aleatoria pero fija para el ejemplo
    const isSingleUser = searchQuery.trim().length > 0;
    if (isSingleUser) {
      volMultiplier = 0.05;
      punctualRate = 85;
      tardyRate = 10;
      absentRate = 5;
    }

    // Generar Datos de Barras (Diario)
    const baseDaily = [
      { d: "Lun 30", p: 10, a: 2 }, { d: "Mar 1", p: 9, a: 3 }, { d: "Mié 2", p: 11, a: 1 },
      { d: "Jue 3", p: 8, a: 4 }, { d: "Vie 4", p: 12, a: 0 }, { d: "Lun 7", p: 6, a: 2 }
    ];

    const chartDaily = baseDaily.map(item => ({
      d: item.d,
      p: Math.max(1, Math.round(item.p * volMultiplier * roleMod * (isSingleUser ? 0.3 : 1))),
      a: Math.max(0, Math.round(item.a * volMultiplier * roleMod * (isSingleUser ? 0 : 1)))
    }));

    // Generar Torta de Cumplimiento
    const chartPie = [
      { name: "Puntual", value: punctualRate, col: "#2E7D32" },
      { name: "Tardanza", value: tardyRate, col: "#F9A825" },
      { name: "Ausente", value: absentRate, col: "#C62828" },
    ];

    // Generar Asistencia por Periodo Horario
    const chartPeriod = [
      { p: "07:15", pct: Math.min(100, punctualRate + 15) },
      { p: "08:15", pct: Math.min(100, punctualRate + 5) },
      { p: "09:15", pct: Math.min(100, punctualRate + 18) },
      { p: "10:15", pct: Math.max(30, punctualRate - 10) },
      { p: "11:15", pct: Math.min(100, punctualRate + 8) },
      { p: "12:15", pct: Math.max(20, punctualRate - 15) },
      { p: "13:15", pct: Math.max(20, punctualRate - 20) },
    ];

    // Generar Ausencias Justificadas
    const totalAbsences = Math.round(45 * volMultiplier * roleMod);
    const chartAbsences = [
      { type: "Motivos de Salud", count: Math.round(totalAbsences * 0.45), pct: 45, col: "#0EA5E9" },
      { type: "Asuntos Personales", count: Math.round(totalAbsences * 0.25), pct: 25, col: "#8B5CF6" },
      { type: "Trámite Académico", count: Math.round(totalAbsences * 0.20), pct: 20, col: "#F59E0B" },
      { type: "Calamidad Doméstica", count: Math.round(totalAbsences * 0.10), pct: 10, col: "#EF4444" },
    ].filter(a => a.count > 0);

    // Totales para tarjetas
    const totalAttendances = chartDaily.reduce((acc, curr) => acc + curr.p, 0) * (selectedPeriod.includes("Semestre") ? 20 : 1);
    const avgDaily = (totalAttendances / (selectedPeriod.includes("Semestre") ? 120 : selectedPeriod === "Semanal" ? 5 : 22)).toFixed(1);

    return {
      chartDaily,
      chartPie,
      chartPeriod,
      chartAbsences,
      totalAttendances,
      avgDaily,
      punctualRate,
      totalAbsences: chartAbsences.reduce((acc, curr) => acc + curr.count, 0)
    };
  }, [searchQuery, selectedPeriod, selectedRole]);

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
          <div className="flex items-center gap-2 mr-2">
            <Filter size={16} className={dark ? "text-white/40" : "text-slate-400"} />
          </div>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-sm font-medium outline-none transition-all cursor-pointer ${dark
                ? "bg-[#1E293B] border-white/10 text-white focus:border-blue-500/60"
                : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
              }`}
          >
            <optgroup label="Corto Plazo">
              <option value="Diario">Diario (Hoy)</option>
              <option value="Semanal">Semanal</option>
              <option value="Mensual">Mensual (Mes Actual)</option>
            </optgroup>
            <optgroup label="Gestión 2026">
              <option value="Enero 2026">Enero 2026</option>
              <option value="Semestre 1-2026">Semestre 1-2026 (Feb - Jun)</option>
              <option value="Julio 2026">Julio 2026</option>
              <option value="Semestre 2-2026">Semestre 2-2026 (Ago - Dic)</option>
            </optgroup>
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-sm font-medium outline-none transition-all cursor-pointer ${dark
                ? "bg-[#1E293B] border-white/10 text-white focus:border-blue-500/60"
                : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
              }`}
          >
            <option value="Todos">Todos los cargos</option>
            <option value="Auxiliar">Auxiliares</option>
            <option value="Técnico">Técnicos</option>
            <option value="Coordinador">Coordinadores</option>
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
                <button onClick={() => handleExport("CSV")} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${dark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-50"}`}>
                  <FileText size={16} className="text-blue-500" /> Exportar a CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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
                key={s.value} // Animar cuando cambia el valor
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
                Presentes vs ausentes — {selectedPeriod}
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
              <Bar dataKey="p" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Presentes" animationDuration={1000} />
              <Bar dataKey="a" fill="#64B5F6" radius={[4, 4, 0, 0]} name="Ausentes" animationDuration={1000} />
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
                    key={`${p.p}-${p.pct}`} // Obliga a re-animar al cambiar
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
  );
};