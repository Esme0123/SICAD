import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Users,
  Clock,
  ArrowUpRight,
  Activity,
  UserCheck,
  Wifi,
  Search,
  HardDrive,
  Database,
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
import { COLORS } from "@/theme/colors";
import { getEmployees, Employee } from "@/services/employees.service";
import { getResumen, DashboardResumen } from "@/services/dashboard.service";

interface DashboardProps {
  dark: boolean;
}

const RANGOS = [
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mes" },
];

export const Dashboard: React.FC<DashboardProps> = ({ dark }) => {
  const [rango, setRango] = useState("hoy");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [statusFilter, setStatusFilter] = useState("Todos");

  useEffect(() => {
    getEmployees()
      .then(setEmployees)
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    getResumen(rango)
      .then(setResumen)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [rango]);

  const totalEmployees = resumen?.totalEmpleados ?? (employees.length || 24);
  const activeEmployees = employees.filter((e) => e.status === "Activo").length || totalEmployees;

  const suggestions = searchQuery.trim()
    ? employees
        .filter(
          (emp) =>
            emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (emp.ci && emp.ci.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 5)
    : [];

  const allActivity = (resumen?.actividadReciente ?? []).map((r) => ({
    name: r.nombre,
    action: r.estado,
    period: new Date(r.horaEntrada).toLocaleTimeString("es-BO", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    t: new Date(r.horaEntrada).toLocaleTimeString("es-BO", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    col:
      r.estado === "Puntual"
        ? COLORS.success
        : r.estado === "Atraso"
          ? COLORS.danger
          : COLORS.primary,
  }));

  const filteredActivity = allActivity.filter((a) => {
    const matchesSearch =
      !searchQuery ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "Todos" || a.action === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const asistenciaPorcentaje =
    resumen && resumen.totalEmpleados > 0
      ? Math.round((resumen.presentes / resumen.totalEmpleados) * 100)
      : 0;

  const chartSubtitle =
    rango === "hoy"
      ? "Registros por hora (Hoy)"
      : rango === "semana"
        ? "Registros por día (Esta semana)"
        : "Registros por semana (Este mes)";

  const statCards = [
    {
      title: "Empleados Activos",
      value: totalEmployees.toString(),
      sub: `${resumen?.presentes ?? 0} presentes`,
      icon: <Users size={20} className="text-blue-500" />,
      bg: dark ? "bg-blue-500/10" : "bg-blue-50",
      col: "text-blue-500",
    },
    {
      title: "Asistencia",
      value: `${asistenciaPorcentaje}%`,
      sub: `${resumen?.presentes ?? 0} de ${totalEmployees}`,
      icon: <UserCheck size={20} className="text-green-500" />,
      bg: dark ? "bg-green-500/10" : "bg-green-50",
      col: "text-green-500",
    },
    {
      title: "Atrasos",
      value: (resumen?.retrasos ?? 0).toString(),
      sub: `${resumen?.ausentes ?? 0} ausentes`,
      icon: <Clock size={20} className="text-orange-500" />,
      bg: dark ? "bg-orange-500/10" : "bg-orange-50",
      col: "text-orange-500",
    },
    {
      title: "Permisos",
      value: (resumen?.permisos ?? 0).toString(),
      sub: "Aprobados",
      icon: <Activity size={20} className="text-purple-500" />,
      bg: dark ? "bg-purple-500/10" : "bg-purple-50",
      col: "text-purple-500",
    },
  ];

  return (
    <div
      className="flex-1 overflow-y-auto p-6 space-y-6"
      style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}
    >
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight ${dark ? "text-white" : "text-slate-800"}`}>
            Panel de Control
          </h2>
          <p className={`text-sm mt-1 ${dark ? "text-white/50" : "text-slate-500"}`}>
            Resumen de actividad y estado del sistema en tiempo real.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGOS.map((t) => (
            <button
              key={t.key}
              onClick={() => setRango(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${rango === t.key
                  ? "bg-[#0F4C97] text-white shadow-md shadow-blue-900/20"
                  : dark
                    ? "bg-white/5 text-white/50 hover:bg-white/10"
                    : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={card(dark, "p-5 flex items-start justify-between group")}
          >
            <div>
              <p className={`text-sm font-medium ${dark ? "text-white/50" : "text-slate-500"}`}>
                {s.title}
              </p>
              <h3 className={`text-3xl font-black mt-1 tracking-tight ${dark ? "text-white" : "text-slate-800"}`}>
                {loading ? "..." : s.value}
              </h3>
              <p className={`text-xs mt-1.5 flex items-center gap-1 font-medium ${s.col}`}>
                <ArrowUpRight size={12} /> {s.sub}
              </p>
            </div>
            <div className={`p-3 rounded-2xl ${s.bg} transition-transform group-hover:scale-110`}>
              {s.icon}
            </div>
          </motion.div>
        ))}
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={card(dark, "lg:col-span-2 p-6 flex flex-col")}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`font-bold ${dark ? "text-white" : "text-slate-800"}`}>
                Flujo de Asistencia
              </h3>
              <p className={`text-xs ${dark ? "text-white/40" : "text-slate-500"}`}>
                {chartSubtitle}
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={resumen?.chartData ?? []}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
                />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: dark ? "#888" : "#A0AEC0", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: dark ? "#888" : "#A0AEC0", fontSize: 12 }}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: dark ? "#1E293B" : "#FFF",
                    borderColor: dark ? "rgba(255,255,255,0.1)" : "#E2E8F0",
                    borderRadius: "12px",
                    color: dark ? "#FFF" : "#000",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                  itemStyle={{ color: COLORS.primary, fontWeight: "bold" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={card(dark, "p-6 flex flex-col")}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`font-bold ${dark ? "text-white" : "text-slate-800"}`}>
                Estado del Sistema
              </h3>
              <p className={`text-xs ${dark ? "text-white/40" : "text-slate-500"}`}>
                Métricas operativas
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
            </span>
          </div>

          <div className="space-y-5 flex-1 flex flex-col justify-center">
            {[
              {
                l: "Uso de RAM",
                v: `${resumen?.systemStatus?.ram ?? 0}%`,
                c: (resumen?.systemStatus?.ram ?? 0) > 80 ? "text-red-500" : "text-orange-500",
                bg: (resumen?.systemStatus?.ram ?? 0) > 80 ? "bg-red-500" : "bg-orange-500",
                i: <HardDrive size={14} />,
              },
              {
                l: "Base de Datos",
                v: resumen?.systemStatus?.db ?? "Desconocido",
                c: resumen?.systemStatus?.db === "Conectada" ? "text-green-500" : "text-red-500",
                bg: resumen?.systemStatus?.db === "Conectada" ? "bg-green-500" : "bg-red-500",
                i: <Database size={14} />,
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${dark ? "bg-white/5" : "bg-slate-50"
                      } ${item.c}`}
                  >
                    {item.i}
                  </div>
                  <span className={`text-sm font-medium ${dark ? "text-white/70" : "text-slate-700"}`}>
                    {item.l}
                  </span>
                </div>
                <span className={`text-xs font-bold ${item.c}`}>{item.v}</span>
              </div>
            ))}
          </div>

          <div className={`mt-6 pt-5 border-t ${dark ? "border-white/10" : "border-slate-100"}`}>
            <div className="flex justify-between text-xs mb-2">
              <span className={dark ? "text-white/50" : "text-slate-500"}>Almacenamiento</span>
              <span className={`font-semibold ${dark ? "text-white" : "text-slate-700"}`}>--</span>
            </div>
            <div className={`w-full h-1.5 rounded-full ${dark ? "bg-white/10" : "bg-slate-100"}`}>
              <div className="h-full rounded-full bg-[#0F4C97] w-[0%]" />
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVITY FEED */}
      <div className={card(dark, "p-0 overflow-hidden")}>
        <div className={`p-5 border-b flex flex-wrap items-center justify-between gap-4 ${dark ? "border-white/10" : "border-slate-100"}`}>
          <div>
            <h3 className={`font-bold ${dark ? "text-white" : "text-slate-800"}`}>
              Actividad Reciente
            </h3>
            <p className={`text-xs ${dark ? "text-white/40" : "text-slate-500"}`}>
              Últimos registros de asistencia
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"}`}
              />
              <input
                type="text"
                placeholder="Buscar empleado..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none transition-all ${dark
                    ? "bg-white/5 border-white/10 text-white placeholder-white/25 focus:border-blue-500/60"
                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-600/50"
                  }`}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  className={`absolute z-10 w-full mt-1 rounded-xl border shadow-lg overflow-hidden ${dark ? "bg-[#1E293B] border-white/10" : "bg-white border-slate-200"
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
                          : "hover:bg-slate-100 text-slate-800 border-slate-50"
                        }`}
                    >
                      <div className="font-medium">{emp.name}</div>
                      <div className={`text-xs mt-0.5 ${dark ? "text-white/50" : "text-slate-500"}`}>
                        <span className={`font-mono ${dark ? "text-blue-400" : "text-blue-600"}`}>{emp.code}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-1.5">
              {["Todos", "Puntual", "Atraso"].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${statusFilter === f
                      ? "bg-[#0F4C97] text-white"
                      : dark
                        ? "bg-white/5 text-white/50 hover:bg-white/10"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <p className={`text-xs py-4 text-center ${dark ? "text-white/30" : "text-slate-400"}`}>
              Cargando actividad...
            </p>
          ) : filteredActivity.length === 0 ? (
            <p className={`text-xs py-4 text-center ${dark ? "text-white/30" : "text-slate-400"}`}>
              No hay actividad registrada que coincida con los filtros
            </p>
          ) : (
            filteredActivity.map((a, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 p-3 rounded-xl mb-2 last:mb-0 transition-colors ${dark ? "bg-white/4 hover:bg-white/6" : "bg-slate-50 hover:bg-slate-100"
                  }`}
              >
                <Avatar name={a.name} size={34} bg={COLORS.primary} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${dark ? "text-white" : "text-slate-800"}`}>
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};
