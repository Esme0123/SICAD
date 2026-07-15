import React, { useState, useMemo, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, Filter, Download, Search, FileText, FileSpreadsheet } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { card } from "@/utils/card";
import { COLORS } from "@/theme/colors";
import { getAttendanceHistory, AttendanceRecord } from "@/services/attendance.service";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface HistoryViewProps {
  dark: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ dark }) => {
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setLoading(true);
    getAttendanceHistory()
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const uniqueDates = useMemo(() => Array.from(new Set(rows.map(r => r.date))), [rows]);
  const uniquePeriods = useMemo(() => Array.from(new Set(rows.map(r => r.period))), [rows]);
  const uniqueStatuses = useMemo(() => Array.from(new Set(rows.map(r => r.status))), [rows]);

  const uniqueEmployees = useMemo(
    () => Array.from(new Map(rows.map(item => [item.code, item])).values()),
    [rows]
  );

  const suggestions = searchQuery.trim()
    ? uniqueEmployees.filter(
        emp =>
          emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.code.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const matchDate = filterDate === "" || row.date === filterDate;
      const matchPeriod = filterPeriod === "" || row.period === filterPeriod;
      const matchStatus = filterStatus === "" || row.status === filterStatus;
      const matchEmployee = searchQuery === "" ||
        row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDate && matchPeriod && matchStatus && matchEmployee;
    });
  }, [rows, filterDate, filterPeriod, filterStatus, searchQuery]);

  const renderStatusBadge = (status: string) => {
    let style = { bg: "", text: "", dot: "" };
    if (status === "Presente" || status === "Puntual") {
      style = dark
        ? { bg: "bg-green-500/10", text: "text-green-400", dot: "bg-green-400" }
        : { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
    } else if (status === "Atraso" || status === "Tardanza") {
      style = dark
        ? { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400" }
        : { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" };
    } else if (status === "Sin registro" || status === "Ausente") {
      style = dark
        ? { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" }
        : { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
    } else if (status === "Licencia") {
      style = dark
        ? { bg: "bg-primary/20", text: "text-primary", dot: "bg-primary" }
        : { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" };
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
        {status}
      </span>
    );
  };

  const exportExcel = () => {
    const data = filteredRows.map(r => ({
      Empleado: r.name,
      Código: r.code,
      Fecha: r.date,
      Periodo: r.period,
      Estado: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
    XLSX.writeFile(wb, `asistencia_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Historial de Asistencia", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString("es-BO")}`, 14, 28);

    autoTable(doc, {
      startY: 34,
      head: [["Empleado", "Código", "Fecha", "Periodo", "Estado"]],
      body: filteredRows.map(r => [r.name, r.code, r.date, r.period, r.status]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 76, 151] },
    });

    doc.save(`asistencia_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}>
      <div className={card(dark, "overflow-hidden")}>
        <div className={`flex flex-wrap items-center gap-4 p-5 border-b ${dark ? "border-white/8" : "border-slate-100"}`}>
          <div className="relative w-full md:w-72" ref={searchRef}>
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
            <input
              type="text"
              placeholder="Buscar por nombre, CI o código..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none transition-all ${dark
                  ? "bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-primary/60"
                  : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-primary/50 focus:bg-white"
                }`}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className={`absolute z-30 w-full mt-1 rounded-xl border shadow-xl overflow-hidden ${dark ? "bg-[#1E293B] border-white/10" : "bg-white border-slate-200"}`}>
                {suggestions.map(emp => (
                  <div
                    key={emp.code}
                    onClick={() => { setSearchQuery(emp.name); setShowSuggestions(false); }}
                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors border-b last:border-b-0 ${dark
                        ? "hover:bg-primary/20 text-white border-white/5"
                        : "hover:bg-primary/10 text-slate-800 border-slate-50"
                      }`}
                  >
                    <div className="font-medium">{emp.name}</div>
                    <div className={`text-xs mt-0.5 ${dark ? "text-white/50" : "text-slate-500"}`}>
                      <span className="font-mono text-primary">{emp.code}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 flex-1">
            <div className="relative">
              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"}`}>
                <CalendarIcon size={12} />
              </span>
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className={`pl-7 pr-8 py-2 rounded-xl border text-xs outline-none appearance-none cursor-pointer transition-all ${dark ? "bg-white/5 border-white/10 text-white focus:border-primary/60" : "bg-slate-50 border-slate-200 text-slate-600 focus:border-primary/50 focus:bg-white"}`}
              >
                <option value="">Todas las Fechas</option>
                {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="relative">
              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"}`}>
                <Clock size={12} />
              </span>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className={`pl-7 pr-8 py-2 rounded-xl border text-xs outline-none appearance-none cursor-pointer transition-all ${dark ? "bg-white/5 border-white/10 text-white focus:border-primary/60" : "bg-slate-50 border-slate-200 text-slate-600 focus:border-primary/50 focus:bg-white"}`}
              >
                <option value="">Todos los Periodos</option>
                {uniquePeriods.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="relative">
              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"}`}>
                <Filter size={12} />
              </span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`pl-7 pr-8 py-2 rounded-xl border text-xs outline-none appearance-none cursor-pointer transition-all ${dark ? "bg-white/5 border-white/10 text-white focus:border-primary/60" : "bg-slate-50 border-slate-200 text-slate-600 focus:border-primary/50 focus:bg-white"}`}
              >
                <option value="">Todos los Estados</option>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportPDF}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${dark
                  ? "border-white/10 text-white/70 hover:bg-primary/20 hover:text-white hover:border-primary/50"
                  : "border-slate-200 text-slate-600 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                }`}
            >
              <FileText size={13} /> Exportar PDF
            </button>
            <button
              onClick={exportExcel}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${dark
                  ? "border-white/10 text-white/70 hover:bg-primary/20 hover:text-white hover:border-primary/50"
                  : "border-slate-200 text-slate-600 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                }`}
            >
              <FileSpreadsheet size={13} /> Exportar Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full">
            <thead>
              <tr className={dark ? "bg-white/3" : "bg-slate-50/80"}>
                {["Empleado", "Código", "Fecha", "Periodo", "Hora", "Estado"].map(c => (
                  <th key={c} className={`px-5 py-3 text-left text-xs font-semibold tracking-wide ${dark ? "text-white/30" : "text-slate-400"}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={`px-5 py-8 text-center text-sm ${dark ? "text-white/40" : "text-slate-500"}`}>
                    Cargando historial...
                  </td>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((r, i) => (
                  <tr key={i} className={`border-t transition-colors ${dark ? "border-white/6 hover:bg-primary/10" : "border-slate-100 hover:bg-primary/5"}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.name} size={30} bg={COLORS.primary} />
                        <span className={`text-sm font-medium ${dark ? "text-white" : "text-slate-800"}`}>{r.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-mono font-bold ${dark ? "text-primary" : "text-primary"}`}>{r.code}</span>
                    </td>
                    <td className={`px-5 py-3.5 text-sm ${dark ? "text-white/60" : "text-slate-500"}`}>{r.date}</td>
                    <td className={`px-5 py-3.5 text-sm font-mono ${dark ? "text-white/60" : "text-slate-500"}`}>{r.period}</td>
                    <td className={`px-5 py-3.5 text-sm font-mono font-semibold ${dark ? "text-white/80" : "text-slate-700"}`}>{r.time}</td>
                    <td className="px-5 py-3.5">{renderStatusBadge(r.status)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className={`px-5 py-8 text-center text-sm ${dark ? "text-white/40" : "text-slate-500"}`}>
                    No se encontraron registros con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={`flex items-center justify-between px-5 py-3 border-t ${dark ? "border-white/8" : "border-slate-100"}`}>
          <p className={`text-xs ${dark ? "text-white/30" : "text-slate-500"}`}>
            Mostrando {filteredRows.length} de {rows.length} registros
          </p>
        </div>
      </div>
    </div>
  );
};
