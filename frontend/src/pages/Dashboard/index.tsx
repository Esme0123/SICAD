import React, { useState, useEffect } from "react";
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
import { COLORS } from "@/theme/colors";
import { getEmployees } from "@/services/employees.service";
import { Employee } from "@/mocks/employees";

interface DashboardProps {
  dark: boolean;
}

// Extensive mock attendance database
const ALL_MOCK_ATTENDANCES = [
  { name: "Carlos Mamani Quispe", code: "CC-001", ci: "12345678", status: "Activo", contractedHours: 40, date: "09/07/2026", period: "10:15–11:15", time: "10:18", recordStatus: "Puntual" },
  { name: "Ana Flores Mendoza", code: "CC-002", ci: "87654321", status: "Activo", contractedHours: 20, date: "09/07/2026", period: "10:15–11:15", time: "10:24", recordStatus: "Tardanza" },
  { name: "Luis Quispe Torrez", code: "CC-003", ci: "11223344", status: "Activo", contractedHours: 40, date: "09/07/2026", period: "10:15–11:15", time: "10:15", recordStatus: "Puntual" },
  { name: "María Torres García", code: "CC-004", ci: "44332211", status: "Inactivo", contractedHours: 20, date: "09/07/2026", period: "10:15–11:15", time: "—", recordStatus: "Ausente" },
  { name: "Jorge Condori López", code: "CC-005", ci: "55667788", status: "Activo", contractedHours: 40, date: "09/07/2026", period: "08:15–09:15", time: "—", recordStatus: "Ausente" },
  { name: "Sofía Vargas Choque", code: "CC-006", ci: "99887766", status: "Activo", contractedHours: 20, date: "09/07/2026", period: "09:15–10:15", time: "09:17", recordStatus: "Puntual" },
  { name: "Diego Mamani Cruz", code: "CC-007", ci: "33445566", status: "Activo", contractedHours: 40, date: "09/07/2026", period: "10:15–11:15", time: "10:15", recordStatus: "Puntual" },
  { name: "Patricia Rojas Lima", code: "CC-008", ci: "77889900", status: "Licencia", contractedHours: 20, date: "09/07/2026", period: "07:15–08:15", time: "07:15", recordStatus: "Puntual" },

  // June data
  { name: "Carlos Mamani Quispe", code: "CC-001", ci: "12345678", status: "Activo", contractedHours: 40, date: "09/06/2026", period: "10:15–11:15", time: "10:20", recordStatus: "Tardanza" },
  { name: "Ana Flores Mendoza", code: "CC-002", ci: "87654321", status: "Activo", contractedHours: 20, date: "09/06/2026", period: "10:15–11:15", time: "10:16", recordStatus: "Puntual" },
  { name: "Luis Quispe Torrez", code: "CC-003", ci: "11223344", status: "Activo", contractedHours: 40, date: "09/06/2026", period: "10:15–11:15", time: "10:15", recordStatus: "Puntual" },
  { name: "Sofía Vargas Choque", code: "CC-006", ci: "99887766", status: "Activo", contractedHours: 20, date: "09/06/2026", period: "09:15–10:15", time: "—", recordStatus: "Ausente" },
  { name: "Diego Mamani Cruz", code: "CC-007", ci: "33445566", status: "Activo", contractedHours: 40, date: "09/06/2026", period: "10:15–11:15", time: "10:25", recordStatus: "Tardanza" },
];

const MONTH_MAP: Record<string, string> = {
  Enero: "01",
  Febrero: "02",
  Marzo: "03",
  Abril: "04",
  Mayo: "05",
  Junio: "06",
  Julio: "07",
  Agosto: "08",
  Septiembre: "09",
  Octubre: "10",
  Noviembre: "11",
  Diciembre: "12",
};

export const Dashboard: React.FC<DashboardProps> = ({ dark }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Filter States
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("Todos");
  const [selectedStatus, setSelectedStatus] = useState("Todos");
  const [selectedHours, setSelectedHours] = useState("Todas");

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const list = await getEmployees();
        setEmployees(list);
      } catch (err) {
        console.error("Error al cargar empleados:", err);
      }
    };
    fetchEmployees();
  }, []);

  // Filter logic: Employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      employeeSearch.trim() === "" ||
      emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.code.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.ci.includes(employeeSearch);
    const matchesStatus = selectedStatus === "Todos" || emp.status === selectedStatus;
    const matchesHours = selectedHours === "Todas" || emp.contractedHours.toString() === selectedHours;
    return matchesSearch && matchesStatus && matchesHours;
  });

  // Filter logic: Attendances
  const filteredAttendances = ALL_MOCK_ATTENDANCES.filter((att) => {
    const emp = employees.find((e) => e.code === att.code);
    const matchesSearch =
      employeeSearch.trim() === "" ||
      att.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      att.code.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      att.ci.includes(employeeSearch);
    const matchesStatus =
      selectedStatus === "Todos" || (emp ? emp.status === selectedStatus : att.status === selectedStatus);
    const matchesHours =
      selectedHours === "Todas" ||
      (emp ? emp.contractedHours.toString() === selectedHours : att.contractedHours.toString() === selectedHours);

    let matchesMonth = true;
    if (selectedMonth !== "Todos") {
      const monthCode = MONTH_MAP[selectedMonth];
      const recordMonth = att.date.split("/")[1];
      matchesMonth = recordMonth === monthCode;
    }

    return matchesSearch && matchesStatus && matchesHours && matchesMonth;
  });

  // Stats Card data computation
  const totalAttendances = filteredAttendances.length;
  const punctualLateAttendances = filteredAttendances.filter(
    (att) => att.recordStatus === "Puntual" || att.recordStatus === "Tardanza"
  ).length;
  const complianceRate = totalAttendances > 0 ? Math.round((punctualLateAttendances / totalAttendances) * 100) : 0;

  const isSingleEmployee = filteredEmployees.length === 1;
  const singleEmp = isSingleEmployee ? filteredEmployees[0] : null;

  const stats = [
    {
      label: isSingleEmployee ? "Horas asignadas" : "Empleados registrados",
      value: isSingleEmployee ? `${singleEmp?.assignedHours} hrs` : filteredEmployees.length.toString(),
      trend: isSingleEmployee ? "Carga horaria" : `${filteredEmployees.filter((e) => e.status === "Activo").length} activos`,
      icon: <Users size={19} />,
      col: COLORS.primary,
    },
    {
      label: isSingleEmployee ? "Horas contratadas" : "Periodo actual",
      value: isSingleEmployee ? `${singleEmp?.contractedHours} hrs` : "10:15–11:15",
      trend: isSingleEmployee ? "Carga contratada" : "En curso",
      icon: <Clock size={19} />,
      col: "#F9A825",
    },
    {
      label: "Próximo periodo",
      value: "11:15–12:15",
      trend: "42 min",
      icon: <Activity size={19} />,
      col: "#64B5F6",
    },
    {
      label: "Asistencias del mes",
      value: filteredAttendances.filter((att) => att.recordStatus !== "Ausente").length.toString(),
      trend: `${complianceRate}% cumplimiento`,
      icon: <UserCheck size={19} />,
      col: "#2E7D32",
    },
  ];

  // Dynamic Chart 1: AreaChart (Asistencias del día)
  const timeSlots = ["07:15", "08:15", "09:15", "10:15", "11:15", "12:15", "13:15", "14:15", "15:15", "16:15"];
  const areaData = timeSlots.map((slot) => {
    const count = filteredAttendances.filter((att) => {
      const attStart = att.period.split("–")[0]?.trim() || "";
      return attStart === slot && att.recordStatus !== "Ausente";
    }).length;
    return { h: slot, n: count };
  });

  // Dynamic Chart 2: BarChart (Semana actual - Presentes vs Ausentes)
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie"];
  const weekData = days.map((day, idx) => {
    const employeeRatio = employees.length > 0 ? filteredEmployees.length / employees.length : 1;
    const defaultPresents = [10, 9, 11, 8, 12][idx];
    const defaultAbsents = [2, 3, 1, 4, 0][idx];
    return {
      d: day,
      p: Math.round(defaultPresents * employeeRatio),
      a: Math.round(defaultAbsents * employeeRatio),
    };
  });

  // Dynamic Recent Activity list
  const activity = filteredAttendances.slice(0, 5).map((att) => {
    // Le decimos a TypeScript que esto es un string genérico
    let col: string = "#16A34A";
    let action = "Asistencia registrada";

    if (att.recordStatus === "Tardanza") {
      col = "#F59E0B";
      action = "Llegada tardía";
    } else if (att.recordStatus === "Ausente") {
      col = "#DC2626";
      action = "Ausencia detectada";
    }
    return {
      name: att.name,
      action,
      period: att.period,
      t: att.time === "—" ? "hace 1h" : `a las ${att.time}`,
      col,
    };
  });

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
      {/* Filters Bar */}
      <div className={card(dark, "p-4 flex flex-wrap items-center justify-between gap-4")}>
        <div className="flex flex-wrap items-center gap-3.5 w-full">
          {/* Empleado Search */}
          <div className="flex-1 min-w-[200px] flex flex-col gap-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${dark ? "text-white/40" : "text-slate-400"}`}>
              Empleado
            </span>
            <input
              type="text"
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              placeholder="Buscar por nombre, código o CI..."
              className={`px-3 py-1.5 rounded-xl border text-sm outline-none transition-all ${dark
                  ? "bg-[#1E293B] border-white/10 text-white placeholder-white/20 focus:border-blue-500/60"
                  : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                }`}
            />
          </div>

          {/* Mes */}
          <div className="w-44 flex flex-col gap-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${dark ? "text-white/40" : "text-slate-400"}`}>
              Mes
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border text-sm outline-none transition-all ${dark
                  ? "bg-[#1E293B] border-white/10 text-white focus:border-blue-500/60"
                  : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                }`}
            >
              <option value="Todos">Todos los meses</option>
              {Object.keys(MONTH_MAP).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className="w-44 flex flex-col gap-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${dark ? "text-white/40" : "text-slate-400"}`}>
              Estado Empleado
            </span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border text-sm outline-none transition-all ${dark
                  ? "bg-[#1E293B] border-white/10 text-white focus:border-blue-500/60"
                  : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                }`}
            >
              <option value="Todos">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="Licencia">Licencia</option>
            </select>
          </div>

          {/* Horas */}
          <div className="w-44 flex flex-col gap-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${dark ? "text-white/40" : "text-slate-400"}`}>
              Horas Contratadas
            </span>
            <select
              value={selectedHours}
              onChange={(e) => setSelectedHours(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border text-sm outline-none transition-all ${dark
                  ? "bg-[#1E293B] border-white/10 text-white focus:border-blue-500/60"
                  : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                }`}
            >
              <option value="Todas">Todas</option>
              <option value="20">20 horas</option>
              <option value="40">40 horas</option>
            </select>
          </div>
        </div>
      </div>

      {/* QR active banner */}
      <div
        className="rounded-2xl px-6 py-4 flex items-center justify-between"
        style={{
          background: `linear-gradient(135deg, ${COLORS.primaryHover} 0%, ${COLORS.primary} 100%)`,
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
              className={`text-2xl font-bold leading-none mb-1.5 ${dark ? "text-white" : "text-slate-900"
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
                Por periodo horario — {selectedMonth === "Todos" ? "Hoy" : selectedMonth}
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={dark ? 0.25 : 0.12} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
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
                stroke={COLORS.primary}
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
              <Bar dataKey="p" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Presentes" />
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
          {activity.length === 0 ? (
            <p className={`text-xs py-4 text-center ${dark ? "text-white/30" : "text-slate-400"}`}>
              No hay actividad registrada que coincida con los filtros
            </p>
          ) : (
            activity.map((a, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 p-3 rounded-xl ${dark ? "bg-white/4" : "bg-slate-50"
                  }`}
              >
                <Avatar name={a.name} size={34} bg={COLORS.primary} />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${dark ? "text-white" : "text-slate-800"
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};
