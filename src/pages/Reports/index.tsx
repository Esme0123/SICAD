import React from "react";
import { motion } from "motion/react";
import { TrendingUp, Download } from "lucide-react";
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

interface ReportsProps {
  dark: boolean;
}

export const Reports: React.FC<ReportsProps> = ({ dark }) => {
  const daily = ["Lun 30", "Mar 1", "Mié 2", "Jue 3", "Vie 4", "Lun 7"].map((d, i) => ({
    d,
    p: [10, 9, 11, 8, 12, 6][i],
    a: [2, 3, 1, 4, 0, 2][i],
  }));

  const pie = [
    { name: "Puntual", value: 68, col: "#2E7D32" }, // Success
    { name: "Tardanza", value: 22, col: "#F9A825" }, // Warning
    { name: "Ausente", value: 10, col: "#C62828" }, // Error
  ];

  const byPeriod = [
    { p: "07:15", pct: 92 },
    { p: "08:15", pct: 85 },
    { p: "09:15", pct: 96 },
    { p: "10:15", pct: 78 },
    { p: "11:15", pct: 88 },
    { p: "12:15", pct: 72 },
    { p: "13:15", pct: 65 },
    { p: "14:15", pct: 80 },
    { p: "15:15", pct: 91 },
  ];

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
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Cumplimiento general", value: "87%", sub: "Este mes", col: "#2E7D32" },
          { label: "Total asistencias", value: "342", sub: "Julio 2026", col: "#6A1B9A" },
          { label: "Promedio diario", value: "11.4", sub: "Registros por día", col: "#F9A825" },
        ].map((s, i) => (
          <div key={i} className={card(dark, "p-5 flex items-center gap-4")}>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: `${s.col}14` }}
            >
              <TrendingUp size={22} style={{ color: s.col }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: s.col }}>
                {s.value}
              </p>
              <p className={`text-xs ${dark ? "text-white/50" : "text-slate-600"}`}>{s.label}</p>
              <p className={`text-[11px] ${dark ? "text-white/25" : "text-slate-400"}`}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4">
        <div className={card(dark, "col-span-2 p-5")}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>
                Asistencia diaria
              </h3>
              <p className={`text-xs mt-0.5 ${dark ? "text-white/30" : "text-slate-400"}`}>
                Presentes vs ausentes — Julio 2026
              </p>
            </div>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                dark ? "border-white/10 text-white/40" : "border-slate-200 text-slate-500"
              }`}
            >
              <Download size={12} /> Exportar
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={daily} barSize={16} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="d"
                tick={{ fontSize: 10, fill: dark ? "#94A3B8" : "#64748B" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: dark ? "#94A3B8" : "#64748B" }}
                axisLine={false}
                tickLine={false}
                width={22}
              />
              <Tooltip contentStyle={ttStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="p" fill="#6A1B9A" radius={[4, 4, 0, 0]} name="Presentes" />
              <Bar dataKey="a" fill="#64B5F6" radius={[4, 4, 0, 0]} name="Ausentes" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={card(dark, "p-5")}>
          <h3 className={`font-semibold text-sm mb-1 ${dark ? "text-white" : "text-slate-800"}`}>
            Cumplimiento
          </h3>
          <p className={`text-xs mb-4 ${dark ? "text-white/30" : "text-slate-400"}`}>
            Distribución de estados
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={pie}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
              >
                {pie.map((e, i) => (
                  <Cell key={i} fill={e.col} />
                ))}
              </Pie>
              <Tooltip contentStyle={ttStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pie.map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c.col }} />
                  <span className={`text-xs ${dark ? "text-white/50" : "text-slate-600"}`}>
                    {c.name}
                  </span>
                </div>
                <span className="text-xs font-bold" style={{ color: c.col }}>
                  {c.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By period bars */}
      <div className={card(dark, "p-5")}>
        <div className="flex items-center justify-between mb-5">
          <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>
            Asistencia por periodo
          </h3>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
              dark ? "border-white/10 text-white/40" : "border-slate-200 text-slate-500"
            }`}
          >
            <Download size={12} /> Exportar
          </button>
        </div>
        <div className="space-y-3">
          {byPeriod.map((p, i) => (
            <div key={i} className="flex items-center gap-4">
              <span
                className={`text-xs font-mono w-12 flex-shrink-0 text-right ${
                  dark ? "text-white/40" : "text-slate-500"
                }`}
              >
                {p.p}
              </span>
              <div
                className={`flex-1 h-2 rounded-full overflow-hidden ${
                  dark ? "bg-white/8" : "bg-slate-100"
                }`}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${p.pct}%` }}
                  transition={{ delay: i * 0.05, duration: 0.7 }}
                  className="h-full rounded-full"
                  style={{
                    background: p.pct >= 85 ? "#2E7D32" : p.pct >= 75 ? "#6A1B9A" : "#F9A825",
                  }}
                />
              </div>
              <span
                className={`text-xs font-bold w-10 flex-shrink-0 ${
                  dark ? "text-white/70" : "text-slate-700"
                }`}
              >
                {p.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
