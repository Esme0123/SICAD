import React from "react";
import { Calendar as CalendarIcon, Users, Clock, Filter, Download } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { card } from "@/utils/card";

interface HistoryViewProps {
  dark: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ dark }) => {
  const rows = [
    {
      name: "Carlos Mamani Quispe",
      code: "CC-001",
      date: "07/07/2026",
      period: "08:15–09:15",
      time: "08:18",
      status: "Puntual",
    },
    {
      name: "Ana Flores Mendoza",
      code: "CC-002",
      date: "07/07/2026",
      period: "09:15–10:15",
      time: "09:24",
      status: "Tardanza",
    },
    {
      name: "Luis Quispe Torrez",
      code: "CC-003",
      date: "07/07/2026",
      period: "10:15–11:15",
      time: "10:15",
      status: "Puntual",
    },
    {
      name: "Jorge Condori López",
      code: "CC-005",
      date: "07/07/2026",
      period: "08:15–09:15",
      time: "—",
      status: "Ausente",
    },
    {
      name: "Sofía Vargas Choque",
      code: "CC-006",
      date: "07/07/2026",
      period: "11:15–12:15",
      time: "11:17",
      status: "Puntual",
    },
    {
      name: "Diego Mamani Cruz",
      code: "CC-007",
      date: "07/07/2026",
      period: "10:15–11:15",
      time: "10:15",
      status: "Puntual",
    },
    {
      name: "Carlos Mamani Quispe",
      code: "CC-001",
      date: "06/07/2026",
      period: "09:15–10:15",
      time: "09:18",
      status: "Puntual",
    },
    {
      name: "María Torres García",
      code: "CC-004",
      date: "06/07/2026",
      period: "08:15–09:15",
      time: "08:36",
      status: "Tardanza",
    },
    {
      name: "Patricia Rojas Lima",
      code: "CC-008",
      date: "06/07/2026",
      period: "07:15–08:15",
      time: "07:15",
      status: "Puntual",
    },
  ];

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}
    >
      <div className={card(dark, "overflow-hidden")}>
        {/* Filters toolbar */}
        <div
          className={`flex flex-wrap items-center gap-3 p-5 border-b ${
            dark ? "border-white/8" : "border-slate-100"
          }`}
        >
          <div className="flex flex-wrap gap-2 flex-1">
            {[
              { ph: "Fecha", ic: <CalendarIcon size={12} /> },
              { ph: "Empleado", ic: <Users size={12} /> },
              { ph: "Periodo", ic: <Clock size={12} /> },
              { ph: "Estado", ic: <Filter size={12} /> },
            ].map((f, i) => (
              <div key={i} className="relative">
                <span
                  className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${
                    dark ? "text-white/30" : "text-slate-400"
                  }`}
                >
                  {f.ic}
                </span>
                <select
                  className={`pl-7 pr-5 py-2 rounded-xl border text-xs outline-none appearance-none cursor-pointer ${
                    dark
                      ? "bg-white/5 border-white/10 text-white/60 focus:border-purple-500/60"
                      : "bg-slate-50 border-slate-200 text-slate-600 focus:border-purple-600/50"
                  }`}
                >
                  <option>{f.ph}</option>
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {[
              { label: "Exportar PDF", icon: <Download size={13} /> },
              { label: "Exportar Excel", icon: <Download size={13} /> },
            ].map((b, i) => (
              <button
                key={i}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  dark
                    ? "border-white/10 text-white/50 hover:bg-white/5"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {b.icon} {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={dark ? "bg-white/3" : "bg-slate-50/80"}>
                {["Empleado", "Código", "Fecha", "Periodo", "Hora", "Estado"].map((c) => (
                  <th
                    key={c}
                    className={`px-5 py-3 text-left text-xs font-semibold tracking-wide ${
                      dark ? "text-white/30" : "text-slate-400"
                    }`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className={`border-t transition-colors ${
                    dark ? "border-white/6 hover:bg-white/3" : "border-slate-100 hover:bg-purple-50/10"
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
                    <span
                      className={`text-xs font-mono font-bold ${
                        dark ? "text-purple-400" : "text-purple-700"
                      }`}
                    >
                      {r.code}
                    </span>
                  </td>
                  <td className={`px-5 py-3.5 text-sm ${dark ? "text-white/50" : "text-slate-500"}`}>
                    {r.date}
                  </td>
                  <td className={`px-5 py-3.5 text-sm font-mono ${dark ? "text-white/50" : "text-slate-500"}`}>
                    {r.period}
                  </td>
                  <td
                    className={`px-5 py-3.5 text-sm font-mono font-semibold ${
                      dark ? "text-white/70" : "text-slate-700"
                    }`}
                  >
                    {r.time}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className={`flex items-center justify-between px-5 py-3 border-t ${
            dark ? "border-white/8" : "border-slate-100"
          }`}
        >
          <p className={`text-xs ${dark ? "text-white/25" : "text-slate-400"}`}>
            Mostrando {rows.length} registros
          </p>
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                className={`w-7 h-7 rounded-lg text-xs font-medium cursor-pointer ${
                  n === 1
                    ? "text-white"
                    : dark
                    ? "text-white/30 hover:bg-white/6"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
                style={n === 1 ? { background: "#6A1B9A" } : {}}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
