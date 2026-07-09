import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, X, Calendar, Clock, User } from "lucide-react";
import { card } from "@/utils/card";
import { COLORS } from "@/theme/colors";
import { Avatar } from "@/components/common/Avatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getEmployees } from "@/services/employees.service";
import { Employee } from "@/mocks/employees";
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "@/services/schedules.service";
import { Schedule, MOCK_TIME_SLOTS } from "@/mocks/schedules";

interface PeriodsViewProps {
  dark: boolean;
}

export const PeriodsView: React.FC<PeriodsViewProps> = ({ dark }) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>("Todos");
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("Todos");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);

  // Form values
  const [formValues, setFormValues] = useState<Omit<Schedule, "id">>({
    employeeCode: "",
    employeeName: "",
    day: "Lunes",
    startTime: "07:15",
    endTime: "08:15",
    period: "Periodo 1",
    status: "Activo",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [scheduleList, employeeList] = await Promise.all([
        getSchedules(),
        getEmployees(),
      ]);
      setSchedules(scheduleList);
      setEmployees(employeeList.filter(emp => emp.status === "Activo")); // show only active employees in select list
    } catch (error) {
      console.error("Error al cargar datos de horarios/empleados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEmployeeChange = (code: string) => {
    const emp = employees.find((e) => e.code === code);
    setFormValues((prev) => ({
      ...prev,
      employeeCode: code,
      employeeName: emp ? emp.name : "",
    }));
  };

  const handlePeriodChange = (slotIndex: number) => {
    const slot = MOCK_TIME_SLOTS[slotIndex];
    if (slot) {
      const times = slot.label.split(" – ");
      setFormValues((prev) => ({
        ...prev,
        period: `Periodo ${slotIndex + 1}`,
        startTime: times[0] || "",
        endTime: times[1] || "",
      }));
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    const defaultEmp = employees[0] ? employees[0].code : "";
    const defaultEmpName = employees[0] ? employees[0].name : "";

    setFormValues({
      employeeCode: defaultEmp,
      employeeName: defaultEmpName,
      day: "Lunes",
      startTime: "07:15",
      endTime: "08:15",
      period: "Periodo 1",
      status: "Activo",
    });
    setFormModalOpen(true);
  };

  const handleOpenEdit = (sch: Schedule) => {
    setSelectedSchedule(sch);
    setIsEditing(true);
    setFormValues({
      employeeCode: sch.employeeCode,
      employeeName: sch.employeeName,
      day: sch.day,
      startTime: sch.startTime,
      endTime: sch.endTime,
      period: sch.period,
      status: sch.status,
    });
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.employeeCode) {
      alert("Por favor seleccione un empleado");
      return;
    }

    try {
      if (isEditing && selectedSchedule) {
        await updateSchedule(selectedSchedule.id, formValues);
      } else {
        const nextId = `SCH-${Date.now().toString().slice(-4)}`;
        await createSchedule({
          id: nextId,
          ...formValues,
        });
      }
      setFormModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Error al guardar el horario");
    }
  };

  const handleOpenDelete = (sch: Schedule) => {
    setScheduleToDelete(sch);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (scheduleToDelete) {
      try {
        await deleteSchedule(scheduleToDelete.id);
        setDeleteConfirmOpen(false);
        setScheduleToDelete(null);
        loadData();
      } catch (err) {
        console.error(err);
        alert("Error al eliminar el horario");
      }
    }
  };

  // Filter operations
  const filteredRows = schedules.filter((sch) => {
    const matchesEmployee =
      selectedEmployeeFilter === "Todos" || sch.employeeCode === selectedEmployeeFilter;
    const matchesDay = selectedDayFilter === "Todos" || sch.day === selectedDayFilter;
    const matchesStatus =
      selectedStatusFilter === "Todos" || sch.status === selectedStatusFilter;
    return matchesEmployee && matchesDay && matchesStatus;
  });

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredRows.length, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}
    >
      <div className={card(dark, "overflow-hidden")}>
        {/* Toolbar & Filters */}
        <div
          className={`flex flex-wrap items-center justify-between gap-4 p-5 border-b ${
            dark ? "border-white/8" : "border-slate-100"
          }`}
        >
          <div className="flex flex-wrap items-center gap-4">
            {/* Filter Employee */}
            <div className="flex flex-col gap-1">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  dark ? "text-white/40" : "text-slate-400"
                }`}
              >
                Empleado
              </span>
              <select
                value={selectedEmployeeFilter}
                onChange={(e) => {
                  setSelectedEmployeeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl border text-sm outline-none transition-all w-48 ${
                  dark
                    ? "bg-[#1E293B] border-white/10 text-white focus:border-blue-500/60"
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                }`}
              >
                <option value="Todos">Todos los empleados</option>
                {employees.map((emp) => (
                  <option key={emp.code} value={emp.code}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Day */}
            <div className="flex flex-col gap-1">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  dark ? "text-white/40" : "text-slate-400"
                }`}
              >
                Día
              </span>
              <select
                value={selectedDayFilter}
                onChange={(e) => {
                  setSelectedDayFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl border text-sm outline-none transition-all w-36 ${
                  dark
                    ? "bg-[#1E293B] border-white/10 text-white focus:border-blue-500/60"
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                }`}
              >
                <option value="Todos">Todos los días</option>
                <option value="Lunes">Lunes</option>
                <option value="Martes">Martes</option>
                <option value="Miércoles">Miércoles</option>
                <option value="Jueves">Jueves</option>
                <option value="Viernes">Viernes</option>
                <option value="Sábado">Sábado</option>
              </select>
            </div>

            {/* Filter Status */}
            <div className="flex flex-col gap-1">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  dark ? "text-white/40" : "text-slate-400"
                }`}
              >
                Estado
              </span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => {
                  setSelectedStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl border text-sm outline-none transition-all w-36 ${
                  dark
                    ? "bg-[#1E293B] border-white/10 text-white focus:border-blue-500/60"
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                }`}
              >
                <option value="Todos">Todos los estados</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 cursor-pointer"
            style={{ background: COLORS.primary }}
          >
            <Plus size={14} /> Asignar horario
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={dark ? "bg-white/3" : "bg-slate-50/80"}>
                {["Empleado", "Día", "Hora inicio", "Hora fin", "Período", "Estado", "Acciones"].map(
                  (col) => (
                    <th
                      key={col}
                      className={`px-5 py-3 text-left text-xs font-semibold tracking-wide ${
                        dark ? "text-white/35" : "text-slate-400"
                      }`}
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <span className={dark ? "text-white/50" : "text-slate-500"}>
                      Cargando horarios...
                    </span>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <span className={dark ? "text-white/50" : "text-slate-500"}>
                      No se encontraron horarios asignados
                    </span>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((sch) => (
                  <tr
                    key={sch.id}
                    className={`border-t transition-colors ${
                      dark
                        ? "border-white/6 hover:bg-white/3"
                        : "border-slate-100 hover:bg-blue-50/10"
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={sch.employeeName} size={32} bg={COLORS.primary} />
                        <div>
                          <span
                            className={`text-sm font-medium block ${
                              dark ? "text-white" : "text-slate-800"
                            }`}
                          >
                            {sch.employeeName}
                          </span>
                          <span
                            className={`text-xs block font-mono ${
                              dark ? "text-white/35" : "text-slate-400"
                            }`}
                          >
                            {sch.employeeCode}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td
                      className={`px-5 py-3.5 text-sm font-medium ${
                        dark ? "text-white/80" : "text-slate-700"
                      }`}
                    >
                      {sch.day}
                    </td>
                    <td className="px-5 py-3.5 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className={dark ? "text-white/30" : "text-slate-400"} />
                        <span
                          className={`font-mono text-xs ${dark ? "text-blue-400" : "text-blue-700"}`}
                        >
                          {sch.startTime}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className={dark ? "text-white/30" : "text-slate-400"} />
                        <span
                          className={`font-mono text-xs ${dark ? "text-blue-400" : "text-blue-700"}`}
                        >
                          {sch.endTime}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                          dark
                            ? "bg-white/4 border-white/8 text-white/70"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      >
                        {sch.period}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={sch.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(sch)}
                          title="Editar"
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            dark
                              ? "hover:bg-white/8 text-white/50 hover:text-white"
                              : "hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(sch)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-red-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t ${
            dark ? "border-white/8" : "border-slate-100"
          }`}
        >
          <p className={`text-xs ${dark ? "text-white/30" : "text-slate-400"}`}>
            Mostrando {filteredRows.length > 0 ? startIndex + 1 : 0} a{" "}
            {Math.min(startIndex + itemsPerPage, filteredRows.length)} de {filteredRows.length} horarios
          </p>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    pageNum === currentPage
                      ? "text-white"
                      : dark
                      ? "text-white/35 hover:bg-white/6"
                      : "text-slate-50 hover:bg-slate-100"
                  }`}
                  style={pageNum === currentPage ? { background: COLORS.primary } : {}}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ASSIGN / EDIT HORARIO FORM MODAL */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl border transition-all ${
              dark ? "bg-[#1E293B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold">{isEditing ? "Editar Horario" : "Asignar Horario"}</h3>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${
                  dark ? "text-white/50" : "text-slate-400"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              {/* Body */}
              <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {/* Employee select */}
                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      dark ? "text-white/60" : "text-slate-500"
                    }`}
                  >
                    Empleado *
                  </label>
                  <select
                    required
                    disabled={isEditing}
                    value={formValues.employeeCode}
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                      dark
                        ? "bg-[#1E293B] border-white/10 text-white focus:border-blue-500/60 disabled:opacity-50"
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50 disabled:opacity-50"
                    }`}
                  >
                    <option value="" disabled>
                      Seleccione un empleado...
                    </option>
                    {employees.map((emp) => (
                      <option key={emp.code} value={emp.code}>
                        {emp.name} ({emp.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Day & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${
                        dark ? "text-white/60" : "text-slate-500"
                      }`}
                    >
                      Día de la semana *
                    </label>
                    <select
                      value={formValues.day}
                      onChange={(e) => setFormValues({ ...formValues, day: e.target.value as any })}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                        dark
                          ? "bg-[#1E293B] border-white/10 text-white focus:border-blue-500/60"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                      }`}
                    >
                      <option value="Lunes">Lunes</option>
                      <option value="Martes">Martes</option>
                      <option value="Miércoles">Miércoles</option>
                      <option value="Jueves">Jueves</option>
                      <option value="Viernes">Viernes</option>
                      <option value="Sábado">Sábado</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${
                        dark ? "text-white/60" : "text-slate-500"
                      }`}
                    >
                      Estado
                    </label>
                    <select
                      value={formValues.status}
                      onChange={(e) => setFormValues({ ...formValues, status: e.target.value as any })}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                        dark
                          ? "bg-[#1E293B] border-white/10 text-white focus:border-blue-500/60"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                      }`}
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                {/* Period Quick selector */}
                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      dark ? "text-white/60" : "text-slate-500"
                    }`}
                  >
                    Selección Rápida de Periodo (Opcional)
                  </label>
                  <select
                    onChange={(e) => handlePeriodChange(parseInt(e.target.value, 10))}
                    defaultValue=""
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                      dark
                        ? "bg-[#1E293B] border-white/10 text-white focus:border-blue-500/60"
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                    }`}
                  >
                    <option value="" disabled>
                      Seleccionar periodo predefinido...
                    </option>
                    {MOCK_TIME_SLOTS.map((slot, idx) => (
                      <option key={slot.id} value={idx}>
                        Periodo {idx + 1} ({slot.label})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Period Label */}
                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      dark ? "text-white/60" : "text-slate-500"
                    }`}
                  >
                    Nombre del Periodo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formValues.period}
                    onChange={(e) => setFormValues({ ...formValues, period: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                      dark
                        ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                    }`}
                  />
                </div>

                {/* Start & End Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${
                        dark ? "text-white/60" : "text-slate-500"
                      }`}
                    >
                      Hora de inicio *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="HH:MM"
                      value={formValues.startTime}
                      onChange={(e) => setFormValues({ ...formValues, startTime: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                        dark
                          ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${
                        dark ? "text-white/60" : "text-slate-500"
                      }`}
                    >
                      Hora de fin *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="HH:MM"
                      value={formValues.endTime}
                      onChange={(e) => setFormValues({ ...formValues, endTime: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                        dark
                          ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                    dark
                      ? "border-white/10 text-white/70 hover:bg-white/5"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 cursor-pointer"
                  style={{ background: COLORS.primary }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmOpen && scheduleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border transition-all ${
              dark ? "bg-[#1E293B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
            }`}
          >
            <h3 className="text-lg font-bold text-red-500 flex items-center gap-2 mb-2">
              <Trash2 size={20} /> Eliminar Asignación
            </h3>
            <p className={`text-sm mb-6 ${dark ? "text-white/75" : "text-slate-600"}`}>
              ¿Está seguro de que desea eliminar la asignación del empleado{" "}
              <span className="font-semibold">{scheduleToDelete.employeeName}</span> para el día{" "}
              <span className="font-semibold">{scheduleToDelete.day}</span> en el periodo{" "}
              <span className="font-semibold">{scheduleToDelete.period}</span> ({scheduleToDelete.startTime} -{" "}
              {scheduleToDelete.endTime})? Esta acción no se puede deshacer.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                  dark
                    ? "border-white/10 text-white/70 hover:bg-white/5"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-all cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
