import React, { useState, useMemo, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, Filter, Download, Search } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { card } from "@/utils/card";
import { COLORS } from "@/theme/colors";

interface HistoryViewProps {
  dark: boolean;
}

// Base de datos simulada con los nuevos estados y licencias
const BASE_ROWS = [
  { name: "Carlos Mamani Quispe", code: "CC-001", ci: "12345678", date: "07/07/2026", period: "08:15–09:15", time: "08:18", status: "Presente", note: "" },
  { name: "Ana Flores Mendoza", code: "CC-002", ci: "87654321", date: "07/07/2026", period: "09:15–10:15", time: "09:24", status: "Atraso", note: "" },
  { name: "Luis Quispe Torrez", code: "CC-003", ci: "55443322", date: "07/07/2026", period: "10:15–11:15", time: "10:15", status: "Presente", note: "" },
  { name: "Jorge Condori López", code: "CC-005", ci: "11223344", date: "07/07/2026", period: "08:15–09:15", time: "—", status: "Sin registro", note: "" },
  { name: "Sofía Vargas Choque", code: "CC-006", ci: "99887766", date: "07/07/2026", period: "11:15–12:15", time: "11:17", status: "Presente", note: "" },
  { name: "Diego Mamani Cruz", code: "CC-007", ci: "33221100", date: "07/07/2026", period: "10:15–11:15", time: "—", status: "Licencia", note: "Motivos de salud" },
  { name: "Carlos Mamani Quispe", code: "CC-001", ci: "12345678", date: "06/07/2026", period: "09:15–10:15", time: "09:18", status: "Presente", note: "" },
  { name: "María Torres García", code: "CC-004", ci: "77665544", date: "06/07/2026", period: "08:15–09:15", time: "08:36", status: "Atraso", note: "" },
  { name: "Patricia Rojas Lima", code: "CC-008", ci: "66554433", date: "06/07/2026", period: "07:15–08:15", time: "—", status: "Licencia", note: "Trámite académico" },
];

export const HistoryView: React.FC<HistoryViewProps> = ({ dark }) => {
  // Estados para los filtros
  const [filterDate, setFilterDate] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Estados para el buscador de empleados
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Cerrar sugerencias al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Extraer opciones únicas dinámicamente de los datos reales
  const uniqueDates = Array.from(new Set(BASE_ROWS.map((r) => r.date)));
  const uniquePeriods = Array.from(new Set(BASE_ROWS.map((r) => r.period)));
  const uniqueStatuses = Array.from(new Set(BASE_ROWS.map((r) => r.status)));

  // Lógica de Sugerencias de Búsqueda (Empleados únicos)
  const uniqueEmployees = Array.from(new Map(BASE_ROWS.map(item => [item.code, item])).values());
  const suggestions = searchQuery.trim()
    ? uniqueEmployees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.ci.includes(searchQuery)
    ).slice(0, 5)
    : [];

  // Lógica de filtrado en tiempo real
  const filteredRows = useMemo(() => {
    return BASE_ROWS.filter((row) => {
      const matchDate = filterDate === "" || row.date === filterDate;
      const matchPeriod = filterPeriod === "" || row.period === filterPeriod;
      const matchStatus = filterStatus === "" || row.status === filterStatus;
      const matchEmployee = searchQuery === "" ||
        row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.code.toLowerCase().includes(searchQuery.toLowerCase());

      return matchDate && matchPeriod && matchStatus && matchEmployee;
    });
  }, [filterDate, filterPeriod, filterStatus, searchQuery]);

  // Componente de Badge local para controlar los colores exactos y la armonía
  const renderStatusBadge = (status: string) => {
    let style = { bg: "", text: "", dot: "" };

    if (status === "Presente") {
      style = dark ? { bg: "bg-green-500/10", text: "text-green-400", dot: "bg-green-400" }
        : { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
    } else if (status === "Atraso") {
      style = dark ? { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400" }
        : { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" };
    } else if (status === "Sin registro") {
      style = dark ? { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" }
        : { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
    } else if (status === "Licencia") {
      // Armonía con el color morado principal de la app
      style = dark ? { bg: "bg-[#6A1B9A]/20", text: "text-[#D1C4E9]", dot: "bg-[#AB47BC]" }
        : { bg: "bg-[#F3E5F5]", text: "text-[#6A1B9A]", dot: "bg-[#8E24AA]" };
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
        {status}
      </span>
    );
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}
    >
      <div className={card(dark, "overflow-hidden")}>
        {/* Controles de Filtros */}
        <div
          className={`flex flex-wrap items-center gap-4 p-5 border-b ${dark ? "border-white/8" : "border-slate-100"
            }`}
        >
          {/* Buscador de Empleado (Mismo de Dashboard/Reports) */}
          <div className="relative w-full md:w-72" ref={searchRef}>
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
            <input
              type="text"
              placeholder="Buscar por nombre, CI o código..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none transition-all ${dark
                  ? "bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-[#6A1B9A]/60"
                  : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#6A1B9A]/50 focus:bg-white"
                }`}
            />

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
                        ? "hover:bg-[#6A1B9A]/20 text-white border-white/5"
                        : "hover:bg-[#F3E5F5] text-slate-800 border-slate-50"
                      }`}
                  >
                    <div className="font-medium">{emp.name}</div>
                    <div className={`text-xs mt-0.5 ${dark ? "text-white/50" : "text-slate-500"}`}>
                      <span className="font-mono text-[#AB47BC]">{emp.code}</span> • CI: {emp.ci}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 flex-1">
            {/* Filtro: Fecha */}
            <div className="relative">
              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"}`}>
                <CalendarIcon size={12} />
              </span>
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className={`pl-7 pr-8 py-2 rounded-xl border text-xs outline-none appearance-none cursor-pointer transition-all ${dark ? "bg-white/5 border-white/10 text-white focus:border-[#6A1B9A]/60" : "bg-slate-50 border-slate-200 text-slate-600 focus:border-[#6A1B9A]/50 focus:bg-white"
                  }`}
              >
                <option value="">Todas las Fechas</option>
                {uniqueDates.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Filtro: Periodo */}
            <div className="relative">
              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"}`}>
                <Clock size={12} />
              </span>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className={`pl-7 pr-8 py-2 rounded-xl border text-xs outline-none appearance-none cursor-pointer transition-all ${dark ? "bg-white/5 border-white/10 text-white focus:border-[#6A1B9A]/60" : "bg-slate-50 border-slate-200 text-slate-600 focus:border-[#6A1B9A]/50 focus:bg-white"
                  }`}
              >
                <option value="">Todos los Periodos</option>
                {uniquePeriods.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Filtro: Estado */}
            <div className="relative">
              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"}`}>
                <Filter size={12} />
              </span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`pl-7 pr-8 py-2 rounded-xl border text-xs outline-none appearance-none cursor-pointer transition-all ${dark ? "bg-white/5 border-white/10 text-white focus:border-[#6A1B9A]/60" : "bg-slate-50 border-slate-200 text-slate-600 focus:border-[#6A1B9A]/50 focus:bg-white"
                  }`}
              >
                <option value="">Todos los Estados</option>
                {uniqueStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            {[
              { label: "Exportar PDF", icon: <Download size={13} /> },
              { label: "Exportar Excel", icon: <Download size={13} /> },
            ].map((b, i) => (
              <button
                key={i}
                onClick={() => alert(`Generando ${b.label}...`)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${dark
                    ? "border-white/10 text-white/70 hover:bg-[#6A1B9A]/20 hover:text-white hover:border-[#6A1B9A]/50"
                    : "border-slate-200 text-slate-600 hover:bg-[#F3E5F5] hover:text-[#6A1B9A] hover:border-[#F3E5F5]"
                  }`}
              >
                {b.icon} {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de Registros */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full">
            <thead>
              <tr className={dark ? "bg-white/3" : "bg-slate-50/80"}>
                {["Empleado", "Código", "Fecha", "Periodo", "Hora", "Estado", "Observación"].map((c) => (
                  <th
                    key={c}
                    className={`px-5 py-3 text-left text-xs font-semibold tracking-wide ${dark ? "text-white/30" : "text-slate-400"
                      }`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-t transition-colors ${dark ? "border-white/6 hover:bg-[#6A1B9A]/10" : "border-slate-100 hover:bg-[#F3E5F5]/50"
                      }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.name} size={30} bg="#6A1B9A" />
                        <span className={`text-sm font-medium ${dark ? "text-white" : "text-slate-800"}`}>
                          {r.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-mono font-bold ${dark ? "text-[#AB47BC]" : "text-[#6A1B9A]"}`}>
                        {r.code}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-sm ${dark ? "text-white/60" : "text-slate-500"}`}>
                      {r.date}
                    </td>
                    <td className={`px-5 py-3.5 text-sm font-mono ${dark ? "text-white/60" : "text-slate-500"}`}>
                      {r.period}
                    </td>
                    <td className={`px-5 py-3.5 text-sm font-mono font-semibold ${dark ? "text-white/80" : "text-slate-700"}`}>
                      {r.time}
                    </td>
                    <td className="px-5 py-3.5">
                      {renderStatusBadge(r.status)}
                    </td>
                    <td className={`px-5 py-3.5 text-xs ${dark ? "text-white/40" : "text-slate-400"}`}>
                      {r.note || "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={`px-5 py-8 text-center text-sm ${dark ? "text-white/40" : "text-slate-500"}`}>
                    No se encontraron registros con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t ${dark ? "border-white/8" : "border-slate-100"
            }`}
        >
          <p className={`text-xs ${dark ? "text-white/30" : "text-slate-500"}`}>
            Mostrando {filteredRows.length} de {BASE_ROWS.length} registros
          </p>
          <div className="flex gap-1">
            <button
              className={`w-7 h-7 rounded-lg text-xs font-medium cursor-pointer text-white shadow-sm`}
              style={{ background: "#6A1B9A" }}
            >
              1
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};