import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, X, Calendar, Clock, User, CheckSquare, Download, ChevronDown, File, FileSpreadsheet } from "lucide-react";
import { COLORS } from "@/theme/colors";
import { Avatar } from "@/components/common/Avatar";
import { SearchAutocomplete } from "@/components/common/SearchAutocomplete";
import { getEmployees, Employee } from "@/services/employees.service";
import {
  getSchedules,
  createSchedule,
  deleteSchedule,
  getPeriods,
  Periodo,
  Schedule,
} from "@/services/schedules.service";
import { exportToExcel, exportToPDF } from "@/utils/export.utils";
import { obtenerPeriodoActual, generatePeriodOptions, getPreviousPeriod } from "@/utils/periodo.utils";

interface PeriodsViewProps {
  dark: boolean;
}

type DayOfWeek = "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado";
const DAYS_OF_WEEK: DayOfWeek[] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export const PeriodsView: React.FC<PeriodsViewProps> = ({ dark }) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [periods, setPeriods] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedDaysFilter, setSelectedDaysFilter] = useState<DayOfWeek[]>([...DAYS_OF_WEEK]);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<any>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Form values para Asignación Múltiple (Multidía)
  const [modalEmployee, setModalEmployee] = useState<string>("");
  const [modalDay, setModalDay] = useState<DayOfWeek>("Lunes");
  const [draftSchedules, setDraftSchedules] = useState<Record<DayOfWeek, number[]>>({
    Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: []
  });
  const [filterPeriod, setFilterPeriod] = useState(obtenerPeriodoActual());
  const [selectedPeriod, setSelectedPeriod] = useState(obtenerPeriodoActual());
  const periodOptions = generatePeriodOptions(10);

  const totalSelectedSlots = Object.values(draftSchedules).flat().length;

  const selectedEmp = employees.find(e => e.code === modalEmployee);
  const periodosHoy = draftSchedules[modalDay].length;
  const totalActual = Object.values(draftSchedules).flat().length;
  const maxPeriodos = selectedEmp?.contractedHours === 20 ? 20 : 40;

  const loadData = async (periodo?: string) => {
    setLoading(true);
    try {
      const [scheduleList, employeeList, periodList] = await Promise.all([
        getSchedules(periodo),
        getEmployees(),
        getPeriods(),
      ]);
      setSchedules(scheduleList);
      setEmployees(employeeList.filter(emp => emp.status === "Activo" && emp.role !== "Administrador"));
      setPeriods(periodList);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filterPeriod);
  }, [filterPeriod]);

  const resetModal = () => {
    setModalEmployee("");
    setModalDay("Lunes");
    setDraftSchedules({
      Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: []
    });
  };

  const handleSaveSchedules = async () => {
    if (!modalEmployee) return;

    const emp = employees.find(e => e.code === modalEmployee);
    if (!emp || !emp.id) return;

    try {
      const payloads = DAYS_OF_WEEK.map(day => ({
        usuarioId: emp.id!,
        diaSemana: day,
        periodosIds: draftSchedules[day],
        periodoAcademico: selectedPeriod,
      }));

      await Promise.all(payloads.map(p => createSchedule(p)));
      await loadData();
      setFormModalOpen(false);
      resetModal();
    } catch (error) {
      console.error("Error al guardar horarios:", error);
      alert("Ocurrió un error al guardar los horarios.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (scheduleToDelete) {
      await deleteSchedule(scheduleToDelete.id);
      await loadData();
    }
    setDeleteConfirmOpen(false);
    setScheduleToDelete(null);
  };

  const toggleSlotSelection = (slotId: number) => {
    setDraftSchedules(prev => {
      const daySlots = prev[modalDay];
      if (daySlots.includes(slotId)) {
        return { ...prev, [modalDay]: daySlots.filter(id => id !== slotId) };
      } else {
        return { ...prev, [modalDay]: [...daySlots, slotId] };
      }
    });
  };

  const toggleDayFilter = (day: DayOfWeek) => {
    setSelectedDaysFilter(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // ── PRE-CARGA: inicializa draftSchedules con los horarios del empleado en el periodo seleccionado ──
  useEffect(() => {
    if (!formModalOpen || !modalEmployee) return;

    const initial: Record<DayOfWeek, number[]> = {
      Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: []
    };

    schedules
      .filter(s => s.employeeCode === modalEmployee && s.periodoAcademico === selectedPeriod)
      .forEach(s => {
        if (s.periodId !== undefined && initial[s.day]) {
          initial[s.day].push(s.periodId);
        }
      });

    setDraftSchedules(initial);
  }, [formModalOpen, modalEmployee, selectedPeriod, schedules]);

  // ── RESETEA LOS BLOQUES AL CAMBIAR DE PERIODO ──
  useEffect(() => {
    setDraftSchedules({
      Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: []
    });
  }, [selectedPeriod]);

  // ── Cerrar menú exportación al hacer clic afuera ──
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── LÓGICA DE AGRUPACIÓN (MATRIZ SEMANAL) ──
  const aggregatedSchedules = Array.from(
    schedules.reduce((acc, current) => {
      const empId = current.employeeCode || current.employeeName;

      if (!acc.has(empId)) {
        const employeeRef = employees.find(e => e.code === current.employeeCode || e.name === current.employeeName);
        acc.set(empId, {
          employeeId: empId,
          employeeName: current.employeeName,
          code: current.employeeCode || empId,
          ci: (employeeRef as any)?.ci || "",
          days: {
            Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: []
          }
        });
      }

      const empData = acc.get(empId)!;
      const dayName = current.day;

      if (empData.days[dayName]) {
        empData.days[dayName].push({
          id: current.id,
          period: current.period,
          startTime: current.startTime,
          endTime: current.endTime,
          status: current.status
        });
      }
      return acc;
    }, new Map<string, any>()).values()
  );

  const filteredEmployees = aggregatedSchedules.filter((emp: any) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = term === "" ||
      emp.employeeName?.toLowerCase().includes(term) ||
      emp.code?.toLowerCase().includes(term) ||
      emp.ci?.toLowerCase().includes(term);

    const matchesDay = selectedDaysFilter.length === 0 || selectedDaysFilter.some(day => emp.days[day] && emp.days[day].length > 0);

    return matchesSearch && matchesDay;
  });

  const exportExcel = () => {
    const data = filteredEmployees.flatMap((emp: any) => {
      const entries: any[] = [];
      DAYS_OF_WEEK.forEach(day => {
        emp.days[day]?.forEach((slot: any) => {
          entries.push({
            Empleado: emp.employeeName,
            Código: emp.code,
            CI: emp.ci,
            Día: day,
            Inicio: slot.startTime,
            Fin: slot.endTime,
          });
        });
      });
      return entries;
    });
    if (data.length === 0) return;
    const hoyLocal = new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/La_Paz" }).replace(/\//g, "-");
    exportToExcel(data, `horarios_${hoyLocal}`, "Empleado");
  };

  const exportPDF = () => {
    const columns = ["Empleado", "Código", "CI", "Día", "Inicio", "Fin"];
    const body: string[][] = [];
    filteredEmployees.forEach((emp: any) => {
      DAYS_OF_WEEK.forEach(day => {
        emp.days[day]?.forEach((slot: any) => {
          body.push([emp.employeeName, emp.code, emp.ci || "", day, slot.startTime, slot.endTime]);
        });
      });
    });
    if (body.length === 0) return;
    exportToPDF(body, columns, `horarios_${hoyLocal}`, "Asignación de Horarios", 0);
  };

  if (loading) {
    return <div className={`p-8 text-center ${dark ? "text-white" : "text-slate-800"}`}>Cargando horarios...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Botón superior alineado a la derecha */}
      <div className="flex justify-end gap-2">
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 cursor-pointer shadow-md"
            style={{ background: COLORS.primary }}
          >
            <Download size={14} /> Exportar <ChevronDown size={14} />
          </button>
          {showExportMenu && (
            <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg border overflow-hidden z-20 ${dark ? "bg-[#1E293B] border-white/10" : "bg-white border-slate-200"}`}>
              <button onClick={() => { setShowExportMenu(false); exportPDF(); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${dark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-50"}`}>
                <File size={16} className="text-red-500" /> Exportar a PDF
              </button>
              <button onClick={() => { setShowExportMenu(false); exportExcel(); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${dark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-50"}`}>
                <FileSpreadsheet size={16} className="text-green-600" /> Exportar a Excel
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            resetModal();
            setFormModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
        >
          <Plus size={18} />
          Nueva Asignación
        </button>
      </div>

      {/* Controles y Filtros */}
      <div className={`p-4 rounded-xl border flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 ${dark ? "bg-[#1E293B] border-white/10" : "bg-white border-slate-200"}`}>
        {/* Buscador de Texto */}
        <div className="w-full xl:w-80">
          <SearchAutocomplete
            items={employees}
            value={searchTerm}
            onChange={setSearchTerm}
            onSelect={(item) => setSearchTerm(item.name)}
            placeholder="Buscar por Nombre, Código o CI..."
            dark={dark}
          />
        </div>

        {/* Filtro por Periodo Académico */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className={dark ? "text-white/40" : "text-slate-400"} />
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className={`px-3 py-2 rounded-xl text-sm border outline-none cursor-pointer ${
              dark
                ? "bg-white/5 border-white/10 text-white focus:border-primary/60"
                : "bg-slate-50 border-slate-200 text-slate-700 focus:border-primary/50"
            }`}
          >
            <option value="">Todos los periodos</option>
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Múltiple de Días */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold mr-2 ${dark ? "text-white/60" : "text-slate-500"}`}>
            Mostrar días:
          </span>
          {/* Botón de TODOS */}
          <button
            onClick={() => setSelectedDaysFilter([...DAYS_OF_WEEK])}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${selectedDaysFilter.length === DAYS_OF_WEEK.length
                ? "bg-yellow-500 border-yellow-500 text-white shadow-sm"
                : dark
                  ? "bg-transparent border-white/20 text-white/60 hover:bg-white/5"
                  : "bg-transparent border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
          >
            Todos
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-white/20 mx-1"></div>

          {DAYS_OF_WEEK.map(day => {
            const isSelected = selectedDaysFilter.includes(day);
            return (
              <button
                key={day}
                onClick={() => toggleDayFilter(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${isSelected
                    ? "bg-yellow-500/15 border-yellow-500 text-yellow-600 dark:text-yellow-400"
                    : dark
                      ? "bg-transparent border-white/20 text-white/60 hover:bg-white/5"
                      : "bg-transparent border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla Matriz Semanal (Con Scroll Vertical) */}
      <div className={`overflow-x-auto overflow-y-auto max-h-[60vh] rounded-xl border relative ${dark ? "bg-[#1E293B] border-white/10" : "bg-white border-slate-200"}`}>
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className={`border-b ${dark ? "bg-slate-800 border-white/10" : "bg-slate-50 border-slate-200"}`}>
              <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${dark ? "text-white/60" : "text-slate-500"} min-w-[240px]`}>
                Empleado
              </th>
              {DAYS_OF_WEEK.map((day) => {
                if (!selectedDaysFilter.includes(day)) return null;
                return (
                  <th key={day} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-center ${dark ? "text-white/60" : "text-slate-500"} min-w-[140px]`}>
                    {day}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={selectedDaysFilter.length + 1} className={`px-4 py-12 text-center text-sm ${dark ? "text-white/40" : "text-slate-400"}`}>
                  No se encontraron asignaciones que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp: any) => (
                <tr key={emp.employeeId} className={`hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors`}>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.employeeName} size={36} bg={COLORS.primary} />
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${dark ? "text-white" : "text-slate-800"}`}>
                          {emp.employeeName}
                        </p>
                        <div className={`flex items-center gap-2 mt-0.5 ${dark ? "text-white/40" : "text-slate-500"}`}>
                          <p className="text-xs font-medium">{emp.code}</p>
                          {emp.ci && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20"></span>
                              <p className="text-xs">CI: {emp.ci}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {DAYS_OF_WEEK.map((day) => {
                    if (!selectedDaysFilter.includes(day)) return null;
                    const dayPeriods = [...emp.days[day]].sort((a, b) => a.startTime.localeCompare(b.startTime));

                    return (
                      <td key={day} className="px-3 py-3 align-top border-l border-slate-100 dark:border-white/5">
                        <div className="flex flex-col gap-2 justify-start items-center h-full">
                          {dayPeriods.length === 0 ? (
                            <span className={`text-xs block italic py-2 ${dark ? "text-white/10" : "text-slate-300"}`}>—</span>
                          ) : (
                            dayPeriods.map((slot) => (
                              <div
                                key={slot.id}
                                className={`group relative w-full flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${dark
                                    ? "bg-slate-800 border-slate-700/60 text-slate-200 hover:border-yellow-500/80"
                                    : "bg-blue-50 border-blue-100 text-blue-700 hover:border-blue-300"
                                  }`}
                              >
                                <span className="text-xs font-bold tracking-wide">
                                  {slot.startTime} - {slot.endTime}
                                </span>
                                <button
                                  onClick={() => {
                                    setScheduleToDelete({ ...slot, employeeName: emp.employeeName, day });
                                    setDeleteConfirmOpen(true);
                                  }}
                                  className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-md transition-transform transform hover:scale-110 cursor-pointer"
                                  title="Eliminar periodo"
                                >
                                  <X size={12} strokeWidth={3} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal - Asignación Múltiple (Multidía) */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto ${dark ? "bg-[#1E293B] border border-white/10" : "bg-white"}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold flex items-center gap-2 ${dark ? "text-white" : "text-slate-800"}`}>
                <CheckSquare className="text-primary" size={24} />
                Asignar Horarios
              </h3>
              <button onClick={() => setFormModalOpen(false)} className={`cursor-pointer ${dark ? "text-white/40 hover:text-white" : "text-slate-400 hover:text-slate-600"}`}>
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Selector de Empleado */}
              <div className="space-y-2">
                <label className={`text-sm font-semibold ${dark ? "text-white/70" : "text-slate-600"}`}>
                  <User size={14} className="inline mr-1" /> Seleccionar Empleado
                </label>
                <select
                  value={modalEmployee}
                  onChange={(e) => setModalEmployee(e.target.value)}
                  className={`w-full p-3 rounded-xl border outline-none ${dark ? "bg-black/20 border-white/10 text-white" : "bg-slate-50 border-slate-200"}`}
                >
                  <option value="" disabled>Seleccione un empleado...</option>
                  {employees.map(emp => (
                    <option key={emp.code} value={emp.code}>{emp.name}</option>
                  ))}
                </select>

                {modalEmployee && selectedEmp && (
                  <div className={`mt-3 px-4 py-2.5 rounded-xl border flex items-center justify-between ${
                    totalActual > maxPeriodos
                      ? "text-red-500 border-red-500 bg-red-500/10"
                      : totalActual === maxPeriodos
                      ? "text-green-600 border-green-500 bg-green-500/10"
                      : "text-yellow-600 border-yellow-500 bg-yellow-500/10"
                  }`}>
                    <span className="text-sm font-semibold">
                      Periodos asignados: <strong>{totalActual}</strong> / {maxPeriodos}
                    </span>
                    <span className="text-xs font-medium opacity-80">
                      {totalActual > maxPeriodos
                        ? `Excede por ${totalActual - maxPeriodos}`
                        : totalActual === maxPeriodos
                        ? "Máximo alcanzado"
                        : `Faltan ${maxPeriodos - totalActual}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Selector de Periodo Académico */}
              <div className="space-y-2">
                <label className={`text-sm font-semibold block ${dark ? "text-white/70" : "text-slate-600"}`}>
                  <Calendar size={14} className="inline mr-1" /> Periodo Académico
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className={`w-full p-3 rounded-xl border outline-none ${dark ? "bg-black/20 border-white/10 text-white" : "bg-slate-50 border-slate-200"}`}
                >
                  {periodOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>


              </div>

              {/* Selector de Días (Botones) */}
              <div className="space-y-2">
                <label className={`text-sm font-semibold block ${dark ? "text-white/70" : "text-slate-600"}`}>
                  <Calendar size={14} className="inline mr-1" /> 2. Navega por los días
                </label>
                <div className="flex flex-wrap gap-3">
                  {DAYS_OF_WEEK.map(day => {
                    const count = draftSchedules[day].length;
                    return (
                      <button
                        key={day}
                        onClick={() => setModalDay(day)}
                        className={`relative px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${modalDay === day
                            ? "bg-yellow-500 border-yellow-500 text-white shadow-md"
                            : dark
                              ? "bg-transparent border-white/20 text-white/60 hover:bg-white/10"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        {day}
                        {/* Burbuja indicadora si ese día ya tiene periodos marcados */}
                        {count > 0 && (
                          <span className="absolute -top-2.5 -right-2 bg-yellow-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black shadow-sm border-2 border-white dark:border-[#1E293B]">
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Cuadrícula de Checkboxes */}
              <div className={`space-y-3 p-4 rounded-xl border ${dark ? "bg-black/10 border-white/5" : "bg-slate-50/50 border-slate-100"}`}>
                <label className={`text-sm font-semibold block ${dark ? "text-white/70" : "text-slate-600"}`}>
                  <Clock size={14} className="inline mr-1" /> 3. Selecciona periodos para el <span className="text-primary">{modalDay}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[25vh] overflow-y-auto p-1">
                  {periods.map((slot) => {
                    const isSelected = draftSchedules[modalDay].includes(slot.id);
                    return (
                      <div
                        key={slot.id}
                        onClick={() => toggleSlotSelection(slot.id)}
                        className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center transition-all select-none ${isSelected
                            ? "border-yellow-500 bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 shadow-sm"
                            : dark
                              ? "border-white/10 hover:border-yellow-500/50 text-white/60 bg-slate-800/50"
                              : "border-slate-200 hover:border-yellow-500/50 text-slate-600 bg-white"
                          }`}
                      >
                        <span className="font-bold text-sm">{slot.horaInicio} - {slot.horaFin}</span>
                        <span className="text-xs opacity-70 mt-1">{slot.nombre}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100 dark:border-white/10">
              <span className={`text-sm font-medium ${dark ? "text-white/50" : "text-slate-500"}`}>
                Total a guardar: <strong className="text-primary text-base">{totalSelectedSlots}</strong> periodos
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setFormModalOpen(false)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${dark ? "hover:bg-white/10 text-white/70" : "hover:bg-slate-100 text-slate-600"}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSchedules}
                  disabled={!modalEmployee || totalSelectedSlots === 0 || (selectedEmp && totalActual > maxPeriodos)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity flex items-center gap-2 cursor-pointer ${!modalEmployee || totalSelectedSlots === 0 || (selectedEmp && totalActual > maxPeriodos) ? "bg-slate-400 cursor-not-allowed opacity-50" : "bg-primary hover:opacity-90 shadow-md"
                    }`}
                >
                  Guardar {totalSelectedSlots > 0 ? `(${totalSelectedSlots})` : ""}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && scheduleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 ${dark ? "bg-[#1E293B] border border-white/10" : "bg-white"}`}>
            <h3 className={`text-xl font-bold mb-3 flex items-center gap-2 text-red-500`}>
              <Trash2 size={20} /> Eliminar Asignación
            </h3>
            <p className={`text-sm mb-6 ${dark ? "text-white/75" : "text-slate-600"}`}>
              ¿Está seguro de que desea eliminar el periodo de{" "}
              <span className="font-semibold">{scheduleToDelete.startTime} a {scheduleToDelete.endTime}</span> del día{" "}
              <span className="font-semibold">{scheduleToDelete.day}</span> para el empleado{" "}
              <span className="font-semibold">{scheduleToDelete.employeeName}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${dark ? "border-white/10 text-white/70 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-all cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};