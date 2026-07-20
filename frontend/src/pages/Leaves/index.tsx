import React, { useState, useMemo, useEffect } from "react";
import { Plus, Calendar as CalendarIcon, Clock, Filter, CheckCircle2, AlertCircle, XCircle, X } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { COLORS } from "@/theme/colors";
import { card } from "@/utils/card";
import { getEmployees, Employee } from "@/services/employees.service";
import { getSchedules, Schedule } from "@/services/schedules.service";
import { getPermisos, createPermiso, cambiarEstadoPermiso, PermisoBackend } from "@/services/permisos.service";
import { SearchAutocomplete } from "@/components/common/SearchAutocomplete";
import { useAuthStore } from "@/hooks/useAuthStore";

interface LeavesViewProps {
  dark: boolean;
}

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

const LEAVE_TYPES = [
  { id: "salud", label: "Motivos de Salud", dot: "bg-blue-500", text: "text-blue-600", textDark: "text-blue-400" },
  { id: "personales", label: "Asuntos Personales", dot: "bg-primary", text: "text-primary", textDark: "text-primary" },
  { id: "academico", label: "Trámite Académico", dot: "bg-orange-500", text: "text-orange-600", textDark: "text-orange-400" },
  { id: "calamidad", label: "Calamidad Doméstica", dot: "bg-red-500", text: "text-red-600", textDark: "text-red-400" },
];

const LEAVE_STATUSES = [
  { id: "En Revisión", icon: AlertCircle, color: "text-yellow-500", darkColor: "text-yellow-400" },
  { id: "Aprobado", icon: CheckCircle2, color: "text-green-600", darkColor: "text-green-400" },
  { id: "Rechazado", icon: XCircle, color: "text-red-600", darkColor: "text-red-400" },
];

const STATUS_MAP: Record<string, string> = {
  "PENDIENTE": "En Revisión",
  "APROBADO": "Aprobado",
  "RECHAZADO": "Rechazado",
};

const REVERSE_STATUS_MAP: Record<string, string> = {
  "En Revisión": "PENDIENTE",
  "Aprobado": "APROBADO",
  "Rechazado": "RECHAZADO",
};

const TYPE_MAP: Record<string, string> = {
  salud: "Motivos de Salud",
  personales: "Asuntos Personales",
  academico: "Trámite Académico",
  calamidad: "Calamidad Doméstica",
};

function getLocalDayFromDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

export const LeavesView: React.FC<LeavesViewProps> = ({ dark }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [leaves, setLeaves] = useState<PermisoBackend[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<number | null>(null);
  const currentUser = useAuthStore((s) => s.user);

  const [filterDate, setFilterDate] = useState("");
  const [filterEmp, setFilterEmp] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [formDate, setFormDate] = useState("");
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]);
  const [formType, setFormType] = useState("salud");
  const [formStatus, setFormStatus] = useState("En Revisión");
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  useEffect(() => {
    Promise.all([
      getEmployees(),
      getSchedules(),
      getPermisos(),
    ]).then(([empList, schedList, permisoList]) => {
      setEmployees(empList.filter(emp => emp.status === "Activo" && emp.role !== "Administrador"));
      setSchedules(schedList);
      setLeaves(permisoList);
    }).catch(console.error);
  }, []);

  const availablePeriods = useMemo(() => {
    if (!selectedEmp || !formDate) return [];
    const dayName = getLocalDayFromDate(formDate);
    return schedules
      .filter(s => s.employeeCode === selectedEmp.code && s.day === dayName)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map(s => ({ id: s.id, time: `${s.startTime}–${s.endTime}`, periodoId: s.periodId }));
  }, [selectedEmp, formDate, schedules]);

  const togglePeriod = (periodoId: number) => {
    setSelectedPeriods(prev =>
      prev.includes(periodoId) ? prev.filter(p => p !== periodoId) : [...prev, periodoId]
    );
  };

  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      const q = filterEmp.toLowerCase();
      const name = l.usuario?.nombre || "";
      const code = l.usuario?.codigo || "";
      const ci = l.usuario?.ci || "";
      const matchEmp = !filterEmp ||
        name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        ci.includes(q);
      const matchDate = !filterDate || l.fecha === filterDate;
      const matchType = !filterType || l.tipoPermiso?.nombre === TYPE_MAP[filterType];
      const matchStatus = !filterStatus || (STATUS_MAP[l.estado] === filterStatus);
      return matchDate && matchEmp && matchType && matchStatus;
    });
  }, [leaves, filterDate, filterEmp, filterType, filterStatus]);

  const handleSave = async () => {
    if (!selectedEmp || !formDate || selectedPeriods.length === 0) return;
    try {
      await createPermiso({
        usuarioId: selectedEmp.id!,
        tipoPermisoNombre: TYPE_MAP[formType],
        fecha: formDate,
        motivo: TYPE_MAP[formType],
        periodosIds: selectedPeriods,
        estado: REVERSE_STATUS_MAP[formStatus],
      });
      const updated = await getPermisos();
      setLeaves(updated);
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar permiso:", error);
      alert("Ocurrió un error al guardar el permiso.");
    }
  };

  const handleCambiarEstado = async (id: number, estado: "APROBADO" | "RECHAZADO") => {
    setLoadingAction(id);
    try {
      await cambiarEstadoPermiso(id, {
        estado,
        revisadoPor: currentUser?.id ? parseInt(currentUser.id) : undefined,
      });
      const updated = await getPermisos();
      setLeaves(updated);
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      alert("Ocurrió un error al cambiar el estado del permiso.");
    } finally {
      setLoadingAction(null);
    }
  };

  const resetForm = () => {
    setSelectedEmp(null);
    setFormDate("");
    setSelectedPeriods([]);
    setFormType("salud");
    setFormStatus("En Revisión");
    setModalSearchQuery("");
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const renderTypeBadge = (typeId: string) => {
    const t = LEAVE_TYPES.find(x => x.id === typeId);
    if (!t) return null;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${dark ? 'bg-white/5' : 'bg-slate-50'} ${dark ? t.textDark : t.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`}></span>
        {t.label}
      </span>
    );
  };

  const renderStatus = (status: string) => {
    const s = LEAVE_STATUSES.find(x => x.id === status);
    if (!s) return status;
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${dark ? s.darkColor : s.color}`}>
        <Icon size={16} /> {status}
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 relative" style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}>
      <div className={card(dark, "overflow-hidden")}>
        <div className={`flex flex-wrap items-center justify-between gap-4 p-5 border-b ${dark ? "border-white/8" : "border-slate-100"}`}>
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="w-full sm:max-w-xs">
              <SearchAutocomplete
                items={employees}
                value={filterEmp}
                onChange={setFilterEmp}
                onSelect={(item) => setFilterEmp(item.name)}
                placeholder="Buscar empleado (Nombre, CI o Código)..."
                dark={dark}
              />
            </div>
            <div className="relative">
              <CalendarIcon size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className={`pl-9 pr-4 py-2 rounded-xl text-sm border outline-none transition-all ${dark ? "bg-white/5 border-white/10 text-white/70 focus:border-primary/60" : "bg-slate-50 border-slate-200 text-slate-600 focus:border-primary/50 focus:bg-white"}`}
              />
            </div>
            <div className="relative">
              <Filter size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={`pl-9 pr-8 py-2 rounded-xl text-sm border outline-none appearance-none cursor-pointer transition-all ${dark ? "bg-slate-800 border-slate-700 text-gray-100" : "bg-white border-gray-300 text-gray-900"}`}
              >
                <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Todos los motivos</option>
                {LEAVE_TYPES.map(t => <option key={t.id} value={t.id} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">{t.label}</option>)}
              </select>
            </div>
            <div className="relative">
              <Filter size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`pl-9 pr-8 py-2 rounded-xl text-sm border outline-none appearance-none cursor-pointer transition-all ${dark ? "bg-slate-800 border-slate-700 text-gray-100" : "bg-white border-gray-300 text-gray-900"}`}
              >
                <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Todos los estados</option>
                {LEAVE_STATUSES.map(s => <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">{s.id}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-primary shadow-lg hover:opacity-90 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus size={18} />
            Nuevo Permiso
          </button>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full">
            <thead>
              <tr className={dark ? "bg-white/3" : "bg-slate-50/80"}>
                {["Empleado", "Código", "CI", "Fecha", "Periodos Afectados", "Motivo", "Estado", "Acciones"].map(c => (
                  <th key={c} className={`px-5 py-3 text-left text-xs font-semibold tracking-wide ${dark ? "text-white/30" : "text-slate-400"}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.length > 0 ? (
                filteredLeaves.map(leave => {
                  const tipoNombre = leave.tipoPermiso?.nombre || "";
                  const typeEntry = Object.entries(TYPE_MAP).find(([, v]) => v === tipoNombre);
                  const typeId = typeEntry?.[0] || "";
                  const statusDisplay = STATUS_MAP[leave.estado] || leave.estado;
                  return (
                    <tr key={leave.id} className={`border-t transition-colors ${dark ? "border-white/6 hover:bg-white/3" : "border-slate-100 hover:bg-primary/5"}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={leave.usuario?.nombre || ""} size={32} bg={COLORS.primary} />
                          <span className={`text-sm font-medium ${dark ? "text-white" : "text-slate-800"}`}>{leave.usuario?.nombre}</span>
                        </div>
                      </td>
                      <td className={`px-5 py-4 text-sm font-mono font-medium ${dark ? "text-primary" : "text-primary"}`}>{leave.usuario?.codigo}</td>
                      <td className={`px-5 py-4 text-sm font-mono ${dark ? "text-white/70" : "text-slate-600"}`}>{leave.usuario?.ci}</td>
                      <td className={`px-5 py-4 text-sm font-medium ${dark ? "text-white/70" : "text-slate-600"}`}>{formatDate(leave.fecha)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {leave.periodos?.map((pp, i) => (
                            <span key={i} className={`px-2 py-1 rounded text-xs font-mono font-medium ${dark ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-700"}`}>
                              {pp.periodo.horaInicio}–{pp.periodo.horaFin}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {renderTypeBadge(typeId)}
                      </td>
                      <td className="px-5 py-4">
                        {renderStatus(statusDisplay)}
                      </td>
                      <td className="px-5 py-4">
                        {leave.estado === "PENDIENTE" ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCambiarEstado(leave.id, "APROBADO")}
                              disabled={loadingAction === leave.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                            >
                              {loadingAction === leave.id ? "..." : "Aprobar"}
                            </button>
                            <button
                              onClick={() => handleCambiarEstado(leave.id, "RECHAZADO")}
                              disabled={loadingAction === leave.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                            >
                              {loadingAction === leave.id ? "..." : "Rechazar"}
                            </button>
                          </div>
                        ) : (
                          <span className={`text-xs ${dark ? "text-white/40" : "text-slate-400"}`}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className={`px-5 py-12 text-center text-sm ${dark ? "text-white/40" : "text-slate-500"}`}>
                    No se encontraron permisos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[95vh] ${dark ? "bg-[#1E293B] border border-white/10" : "bg-white"}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${dark ? "border-white/10" : "border-slate-100"}`}>
              <h3 className={`text-lg font-bold ${dark ? "text-white" : "text-slate-800"}`}>Registrar Permiso</h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${dark ? "text-white/50 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}>
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${dark ? "text-white/60" : "text-slate-500"}`}>Empleado</label>
                {!selectedEmp ? (
                  <SearchAutocomplete
                    items={employees}
                    value={modalSearchQuery}
                    onChange={setModalSearchQuery}
                    onSelect={(item) => {
                      setSelectedEmp(item);
                      setModalSearchQuery("");
                    }}
                    placeholder="Buscar por Nombre, CI o Código..."
                    dark={dark}
                  />
                ) : (
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${dark ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                    <div className="flex items-center gap-3">
                      <Avatar name={selectedEmp.name} size={30} bg={COLORS.primary} />
                      <div>
                        <div className={`text-sm font-medium ${dark ? "text-white" : "text-slate-800"}`}>{selectedEmp.name}</div>
                        <div className={`text-xs ${dark ? "text-white/50" : "text-slate-500"}`}>{selectedEmp.code} • CI: {selectedEmp.ci}</div>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedEmp(null); setSelectedPeriods([]); }} className="text-xs text-red-500 font-medium hover:underline cursor-pointer">Cambiar</button>
                  </div>
                )}
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${dark ? "text-white/60" : "text-slate-500"}`}>Fecha del Permiso</label>
                <div className="relative">
                  <CalendarIcon size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => { setFormDate(e.target.value); setSelectedPeriods([]); }}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none ${dark ? "bg-white/5 border-white/10 text-white focus:border-primary" : "bg-white border-slate-200 text-slate-800 focus:border-primary"}`}
                  />
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${dark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center justify-between mb-3">
                  <label className={`text-xs font-semibold ${dark ? "text-white/80" : "text-slate-700"}`}>
                    Periodos Afectados
                  </label>
                  {availablePeriods.length > 0 && (
                    <button
                      onClick={() => setSelectedPeriods(availablePeriods.map(p => p.periodoId!))}
                      className="text-xs text-primary font-medium hover:underline cursor-pointer"
                    >
                      Marcar todos
                    </button>
                  )}
                </div>
                {(!selectedEmp || !formDate) ? (
                  <p className={`text-xs text-center py-4 ${dark ? "text-white/40" : "text-slate-400"}`}>
                    Selecciona empleado y fecha para ver los periodos.
                  </p>
                ) : availablePeriods.length === 0 ? (
                  <p className={`text-xs text-center py-4 ${dark ? "text-white/40" : "text-slate-400"}`}>
                    Sin periodos asignados en esta fecha.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availablePeriods.map(period => {
                      const periodoId = period.periodoId!;
                      const isSelected = selectedPeriods.includes(periodoId);
                      return (
                        <div
                          key={period.id}
                          onClick={() => togglePeriod(periodoId)}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none ${isSelected
                            ? (dark ? "bg-primary/10 border-primary/50" : "bg-primary/5 border-primary/30")
                            : (dark ? "bg-transparent border-white/10 hover:bg-white/5" : "bg-white border-slate-200 hover:bg-slate-50")
                            }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-primary border-primary" : (dark ? "border-white/30" : "border-slate-300")
                            }`}>
                            {isSelected && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                          <div className={`text-sm font-mono font-medium ${dark ? "text-white/80" : "text-slate-700"}`}>
                            <Clock size={12} className="inline mr-1.5 opacity-60" />
                            {period.time}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${dark ? "text-white/60" : "text-slate-500"}`}>Motivo del Permiso</label>
                <div className="grid grid-cols-2 gap-2">
                  {LEAVE_TYPES.map(type => (
                    <div
                      key={type.id}
                      onClick={() => setFormType(type.id)}
                      className={`px-3 py-2.5 rounded-lg border cursor-pointer text-xs font-medium text-center transition-all select-none ${formType === type.id
                        ? (dark ? "bg-white/10 border-white/20 text-white" : "bg-slate-200 border-slate-300 text-slate-800")
                        : (dark ? "bg-transparent border-white/10 text-white/50 hover:bg-white/5" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")
                        }`}
                    >
                      {type.label}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${dark ? "text-white/60" : "text-slate-500"}`}>Estado Inicial</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border outline-none appearance-none cursor-pointer ${dark ? "bg-white/5 border-white/10 text-white focus:border-primary" : "bg-white border-slate-200 text-slate-800 focus:border-primary"}`}
                >
                  {LEAVE_STATUSES.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                </select>
              </div>
            </div>

            <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0 ${dark ? "border-white/10 bg-[#1E293B]" : "border-slate-100 bg-slate-50"}`}>
              <button
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${dark ? "text-white/70 hover:bg-white/10" : "text-slate-600 hover:bg-slate-200"}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!selectedEmp || !formDate || selectedPeriods.length === 0}
                className={`px-6 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg transition-all bg-primary ${(!selectedEmp || !formDate || selectedPeriods.length === 0) ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 cursor-pointer"}`}
              >
                Guardar Permiso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
