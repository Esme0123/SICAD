import React from "react";
import { motion } from "motion/react";
import {
  Users,
  Clock,
  QrCode,
  ArrowUpRight,
  Activity,
  UserCheck,
  Wifi,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import { Avatar } from "@/components/common/Avatar";
import { card } from "@/utils/card";

interface DashboardProps {
  dark: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ dark }) => {
  const areaData = [
    { h: "07:15", n: 2 },
    { h: "08:15", n: 5 },
    { h: "09:15", n: 4 },
    { h: "10:15", n: 8 },
    { h: "11:15", n: 6 },
    { h: "12:15", n: 3 },
    { h: "13:15", n: 5 },
    { h: "14:15", n: 7 },
    { h: "15:15", n: 4 },
    { h: "16:15", n: 3 },
  ];
  const weekData = [
    { d: "Lun", p: 10, a: 2 },
    { d: "Mar", p: 9, a: 3 },
    { d: "Mié", p: 11, a: 1 },
    { d: "Jue", p: 8, a: 4 },
    { d: "Vie", p: 12, a: 0 },
  ];
  const activity = [
    {
      name: "Ana Flores Mendoza",
      action: "Asistencia registrada",
      period: "10:15–11:15",
      t: "hace 2 min",
      col: "#2E7D32", // Success
    },
    {
      name: "Carlos Mamani Quispe",
      action: "Asistencia registrada",
      period: "10:15–11:15",
      t: "hace 6 min",
      col: "#2E7D32", // Success
    },
    {
      name: "Luis Quispe Torrez",
      action: "Llegada tardía",
      period: "09:15–10:15",
      t: "hace 14 min",
      col: "#F9A825", // Warning
    },
    {
      name: "Sofía Vargas Choque",
      action: "Asistencia registrada",
      period: "09:15–10:15",
      t: "hace 20 min",
      col: "#2E7D32", // Success
    },
    {
      name: "Jorge Condori López",
      action: "Ausencia detectada",
      period: "08:15–09:15",
      t: "hace 1h",
      col: "#C62828", // Error
    },
  ];

  const stats = [
    {
      label: "Empleados registrados",
      value: "12",
      trend: "+2 este mes",
      icon: <Users size={19} />,
      col: "#6A1B9A", // UCB Purple
    },
    {
      label: "Periodo actual",
      value: "10:15–11:15",
      trend: "En curso",
      icon: <Clock size={19} />,
      col: "#F9A825", // Warning
    },
    {
      label: "Próximo periodo",
      value: "11:15–12:15",
      trend: "42 min",
      icon: <Activity size={19} />,
      col: "#64B5F6", // Celeste
    },
    {
      label: "Asistencias hoy",
      value: "47",
      trend: "87% cumplimiento",
      icon: <UserCheck size={19} />,
      col: "#2E7D32", // Success
    },
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
      {/* QR active banner */}
      <div
        className="rounded-2xl px-6 py-4 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, #4A148C 0%, #6A1B9A 100%)",
        }}
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/12">
            <QrCode size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">QR Activo — Periodo 10:15–11:15</p>
            <p className="text-white/50 text-xs mt-0.5">
              Código rotando cada 10 segundos · Servidor en línea
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(46,125,50,0.2)" }}
        >
          <Wifi size={12} className="text-green-400" />
          <span className="text-green-400 text-xs font-semibold">En línea</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={card(dark, "p-5")}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.col}14` }}
              >
                <span style={{ color: s.col }}>{s.icon}</span>
              </div>
              <ArrowUpRight size={14} className={dark ? "text-white/15" : "text-slate-300"} />
            </div>
            <p
              className={`text-2xl font-bold leading-none mb-1.5 ${
                dark ? "text-white" : "text-slate-900"
              }`}
            >
              {s.value}
            </p>
            <p className={`text-xs mb-1 ${dark ? "text-white/40" : "text-slate-500"}`}>{s.label}</p>
            <span className="text-xs font-semibold" style={{ color: s.col }}>
              {s.trend}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-5 gap-4">
        <div className={card(dark, "col-span-3 p-5")}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>
                Asistencias del día
              </h3>
              <p className={`text-xs mt-0.5 ${dark ? "text-white/35" : "text-slate-400"}`}>
                Por periodo horario — Hoy
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6A1B9A" stopOpacity={dark ? 0.25 : 0.12} />
                  <stop offset="95%" stopColor="#6A1B9A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="h"
                tick={{ fontSize: 10, fill: dark ? "#94A3B8" : "#64748B" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: dark ? "#94A3B8" : "#64748B" }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip contentStyle={ttStyle} />
              <Area
                type="monotone"
                dataKey="n"
                stroke="#6A1B9A"
                strokeWidth={2.5}
                fill="url(#g1)"
                name="Asistencias"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={card(dark, "col-span-2 p-5")}>
          <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>
            Semana actual
          </h3>
          <p className={`text-xs mt-0.5 mb-4 ${dark ? "text-white/35" : "text-slate-400"}`}>
            Presentes vs ausentes
          </p>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={weekData} barSize={13} barGap={3}>
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
              <Bar dataKey="p" fill="#6A1B9A" radius={[4, 4, 0, 0]} name="Presentes" />
              <Bar dataKey="a" fill="#64B5F6" radius={[4, 4, 0, 0]} name="Ausentes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity */}
      <div className={card(dark, "p-5")}>
        <h3 className={`font-semibold text-sm mb-4 ${dark ? "text-white" : "text-slate-800"}`}>
          Actividad reciente
        </h3>
        <div className="space-y-2.5">
          {activity.map((a, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 p-3 rounded-xl ${
                dark ? "bg-white/4" : "bg-slate-50"
              }`}
            >
              <Avatar name={a.name} size={34} bg="#6A1B9A" />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    dark ? "text-white" : "text-slate-800"
                  }`}
                >
                  {a.name}
                </p>
                <p className={`text-xs ${dark ? "text-white/30" : "text-slate-400"}`}>
                  {a.period}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: `${a.col}15`, color: a.col }}
                >
                  {a.action}
                </span>
                <p className={`text-xs mt-1 ${dark ? "text-white/25" : "text-slate-400"}`}>{a.t}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
