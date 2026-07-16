import React, { useState, useEffect } from "react";
import { Search, Filter, Plus, Edit2, Trash2, Eye, X, Mail, Phone } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { card } from "@/utils/card";
import { COLORS } from "@/theme/colors";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  Employee,
} from "@/services/employees.service";
import { getPermisos, PermisoBackend } from "@/services/permisos.service";

interface EmployeesProps {
  dark: boolean;
}

export const Employees: React.FC<EmployeesProps> = ({ dark }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Filter states
  const [statusFilter, setStatusFilter] = useState<"Todos" | "Activo" | "Inactivo" | "Licencia">("Todos");
  const [hoursFilter, setHoursFilter] = useState<"Todas" | 20 | 40>("Todas");
  const [showFilters, setShowFilters] = useState(false);

  // Modals state
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Form values
  const [formValues, setFormValues] = useState<Omit<Employee, "periods">>({
    code: "",
    ci: "",
    name: "",
    role: "Auxiliar",
    status: "Activo",
    email: "",
    phone: "",
    contractedHours: 40,
    assignedHours: 0,
  });

  const [permisos, setPermisos] = useState<PermisoBackend[]>([]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const [list, permList] = await Promise.all([getEmployees(), getPermisos()]);
      setEmployees(list);
      setPermisos(permList);
    } catch (error: any) {
      console.error("Error al cargar empleados:", error);
      if (error?.response?.status === 401) {
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const getDynamicStatus = (emp: Employee): string => {
    if (emp.status !== "Activo") return emp.status;
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const currentMinutes = today.getHours() * 60 + today.getMinutes();
    const hasActivePermiso = permisos.some(p => {
      if (p.estado !== "APROBADO") return false;
      const permisoDate = p.fecha.split("T")[0];
      if (permisoDate !== todayStr) return false;
      if (p.usuario?.codigo !== emp.code) return false;
      return p.periodos?.some(pp => {
        const [hI, mI] = pp.periodo.horaInicio.split(":").map(Number);
        const [hF, mF] = pp.periodo.horaFin.split(":").map(Number);
        const startMin = hI * 60 + mI;
        const endMin = hF * 60 + mF;
        return currentMinutes >= startMin && currentMinutes < endMin;
      }) ?? false;
    });
    return hasActivePermiso ? "Licencia" : emp.status;
  };

  // Filter operations
  const filteredRows = employees.filter((emp) => {
    const searchTerm = search.toLowerCase();
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm) ||
      emp.code.toLowerCase().includes(searchTerm) ||
      (emp.ci && emp.ci.toLowerCase().includes(searchTerm));

    const dynStatus = getDynamicStatus(emp);
    const matchesStatus =
      statusFilter === "Todos" || dynStatus === statusFilter;
    const matchesHours =
      hoursFilter === "Todas" || emp.contractedHours === hoursFilter;
    return matchesSearch && matchesStatus && matchesHours;
  });

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredRows.length, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + itemsPerPage);

  const handleOpenCreate = () => {
    setIsEditing(false);
    // Auto-generate code e.g. CC-009
    const codes = employees.map((e) => {
      const match = e.code.match(/CC-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const nextNum = codes.length > 0 ? Math.max(...codes) + 1 : 1;
    const nextCode = `CC-${nextNum.toString().padStart(3, "0")}`;

    setFormValues({
      code: nextCode,
      ci: "",
      name: "",
      role: "Auxiliar",
      status: "Activo",
      email: "",
      phone: "",
      contractedHours: 40,
      assignedHours: 0,
    });
    setFormModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsEditing(true);
    setFormValues({
      code: emp.code,
      ci: emp.ci,
      name: emp.name,
      role: emp.role,
      status: emp.status,
      email: emp.email,
      phone: emp.phone,
      contractedHours: emp.contractedHours,
      assignedHours: emp.assignedHours,
    });
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.code || !formValues.name || !formValues.ci) {
      alert("Por favor complete los campos obligatorios (*)");
      return;
    }

    try {
      if (isEditing && selectedEmployee) {
        await updateEmployee(selectedEmployee.id!, {
          ...formValues,
        });
      } else {
        await createEmployee({
          ...formValues,
        });
      }
      setFormModalOpen(false);
      loadEmployees();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Error al guardar el empleado");
    }
  };

  const handleOpenDelete = (emp: Employee) => {
    setEmployeeToDelete(emp);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (employeeToDelete) {
      try {
        await deleteEmployee(employeeToDelete.id!);
        setDeleteConfirmOpen(false);
        setEmployeeToDelete(null);
        loadEmployees();
      } catch (err) {
        console.error(err);
        alert("Error al eliminar el empleado");
      }
    }
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}
    >
      <div className={card(dark, "overflow-hidden")}>
        {/* Toolbar */}
        <div
          className={`flex items-center justify-between p-5 border-b ${dark ? "border-white/8" : "border-slate-100"
            }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search
                size={15}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"
                  }`}
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por nombre, CI o código..."
                className={`pl-9 pr-4 py-2 rounded-xl border text-sm outline-none w-72 transition-all ${dark
                    ? "bg-white/5 border-white/10 text-white placeholder-white/25 focus:border-blue-500/60"
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                  }`}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer transition-all ${showFilters
                  ? dark
                    ? "bg-white/10 border-white/20 text-white font-medium"
                    : "bg-slate-100 border-slate-350 text-slate-800 font-medium"
                  : dark
                    ? "border-white/10 text-white/50 hover:bg-white/5"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
            >
              <Filter size={13} /> Filtrar {(statusFilter !== "Todos" || hoursFilter !== "Todas") && "•"}
            </button>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 cursor-pointer"
            style={{ background: COLORS.primary }}
          >
            <Plus size={14} /> Nuevo empleado
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div
            className={`p-4 border-b flex flex-wrap gap-6 items-center ${dark ? "border-white/8 bg-white/2" : "border-slate-100 bg-slate-50/50"
              }`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${dark ? "text-white/50" : "text-slate-500"}`}>
                Estado:
              </span>
              <div className="flex gap-1.5">
                {(["Todos", "Activo", "Inactivo", "Licencia"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${statusFilter === status
                        ? "text-white"
                        : dark
                          ? "bg-white/5 text-white/60 hover:bg-white/10"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    style={statusFilter === status ? { background: COLORS.primary } : {}}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${dark ? "text-white/50" : "text-slate-500"}`}>
                Horas Contratadas:
              </span>
              <div className="flex gap-1.5">
                {(["Todas", 20, 40] as const).map((hours) => (
                  <button
                    key={hours}
                    onClick={() => {
                      setHoursFilter(hours);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${hoursFilter === hours
                        ? "text-white"
                        : dark
                          ? "bg-white/5 text-white/60 hover:bg-white/10"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    style={hoursFilter === hours ? { background: COLORS.primary } : {}}
                  >
                    {hours === "Todas" ? "Todas" : `${hours} horas`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={dark ? "bg-white/3" : "bg-slate-50/80"}>
                {[
                  "Código",
                  "Nombre completo",
                  "CI",
                  "Correo",
                  "Teléfono",
                  "Horas contratadas",
                  "Horas asignadas",
                  "Estado",
                  "Acciones",
                ].map((col) => (
                  <th
                    key={col}
                    className={`px-5 py-3 text-left text-xs font-semibold tracking-wide ${dark ? "text-white/35" : "text-slate-400"
                      }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <span className={dark ? "text-white/50" : "text-slate-500"}>
                      Cargando empleados...
                    </span>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <span className={dark ? "text-white/50" : "text-slate-500"}>
                      No se encontraron empleados
                    </span>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((emp) => (
                  <tr
                    key={emp.code}
                    className={`border-t transition-colors ${dark
                        ? "border-white/6 hover:bg-white/3"
                        : "border-slate-100 hover:bg-blue-50/10"
                      }`}
                  >
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs font-mono font-bold ${dark ? "text-blue-400" : "text-blue-700"
                          }`}
                      >
                        {emp.code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.name} size={32} bg={COLORS.primary} />
                        <span className={`text-sm font-medium ${dark ? "text-white" : "text-slate-800"}`}>
                          {emp.name}
                        </span>
                      </div>
                    </td>
                    <td className={`px-5 py-3.5 text-sm font-mono ${dark ? "text-white/70" : "text-slate-700"}`}>
                      {emp.ci}
                    </td>
                    <td className={`px-5 py-3.5 text-sm ${dark ? "text-white/50" : "text-slate-600"}`}>
                      {emp.email}
                    </td>
                    <td className={`px-5 py-3.5 text-sm font-mono ${dark ? "text-white/50" : "text-slate-600"}`}>
                      {emp.phone}
                    </td>
                    <td className={`px-5 py-3.5 text-sm font-semibold ${dark ? "text-white/50" : "text-slate-700"}`}>
                      {emp.contractedHours} hrs
                    </td>
                     <td className="px-5 py-3.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            emp.assignedHours > emp.contractedHours
                              ? "text-red-500 font-bold animate-pulse"
                              : emp.assignedHours === emp.contractedHours
                              ? "text-green-500"
                              : dark
                              ? "text-white/70"
                              : "text-slate-800"
                          }`}
                        >
                          {emp.assignedHours} hrs
                        </span>
                        <span
                          className={`text-xs ${
                            emp.assignedHours > emp.contractedHours
                              ? "text-red-500 font-bold"
                              : emp.assignedHours === emp.contractedHours
                              ? "text-green-500 font-medium"
                              : dark
                              ? "text-white/30"
                              : "text-slate-400"
                          }`}
                        >
                          ({Math.round((emp.assignedHours / emp.contractedHours) * 100)}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={getDynamicStatus(emp)} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setDetailModalOpen(true);
                          }}
                          title="Ver detalle"
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${dark
                              ? "hover:bg-white/8 text-white/50 hover:text-white"
                              : "hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                            }`}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          title="Editar"
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${dark
                              ? "hover:bg-white/8 text-white/50 hover:text-white"
                              : "hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                            }`}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(emp)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-red-455 hover:text-red-600 cursor-pointer"
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
          className={`flex items-center justify-between px-5 py-3 border-t ${dark ? "border-white/8" : "border-slate-100"
            }`}
        >
          <p className={`text-xs ${dark ? "text-white/30" : "text-slate-400"}`}>
            Mostrando {filteredRows.length > 0 ? startIndex + 1 : 0} a{" "}
            {Math.min(startIndex + itemsPerPage, filteredRows.length)} de {filteredRows.length} empleados
          </p>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer ${pageNum === currentPage
                      ? "text-white"
                      : dark
                        ? "text-white/35 hover:bg-white/6"
                        : "text-slate-500 hover:bg-slate-100"
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

      {/* DETAIL MODAL */}
      {detailModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl border transition-all ${dark ? "bg-[#1E293B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold">Detalle del Empleado</h3>
              <button
                onClick={() => setDetailModalOpen(false)}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${dark ? "text-white/50" : "text-slate-400"
                  }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="py-6 space-y-6">
              <div className="flex items-center gap-4">
                <Avatar name={selectedEmployee.name} size={64} bg={COLORS.primary} />
                <div>
                  <h4 className="text-lg font-semibold">{selectedEmployee.name}</h4>
                  <div className="flex gap-2 mt-1">
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-md ${dark ? "bg-white/8 text-blue-400" : "bg-blue-50 text-blue-700"
                        }`}
                    >
                      {selectedEmployee.code}
                    </span>
                    <StatusBadge status={getDynamicStatus(selectedEmployee)} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className={`block text-xs font-semibold ${dark ? "text-white/40" : "text-slate-400"}`}>
                    CI
                  </span>
                  <span className="font-mono mt-0.5 block">{selectedEmployee.ci}</span>
                </div>
                <div className="col-span-2">
                  <span className={`block text-xs font-semibold ${dark ? "text-white/40" : "text-slate-400"}`}>
                    Correo Electrónico
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Mail size={14} className={dark ? "text-white/45" : "text-slate-400"} />
                    <a href={`mailto:${selectedEmployee.email}`} className="text-blue-500 hover:underline">
                      {selectedEmployee.email}
                    </a>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className={`block text-xs font-semibold ${dark ? "text-white/40" : "text-slate-400"}`}>
                    Teléfono
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Phone size={14} className={dark ? "text-white/45" : "text-slate-400"} />
                    <span>{selectedEmployee.phone}</span>
                  </div>
                </div>
                <div>
                  <span className={`block text-xs font-semibold ${dark ? "text-white/40" : "text-slate-400"}`}>
                    Horas Contratadas
                  </span>
                  <span className="font-semibold text-base mt-0.5 block">
                    {selectedEmployee.contractedHours} horas
                  </span>
                </div>
                <div>
                  <span className={`block text-xs font-semibold ${dark ? "text-white/40" : "text-slate-400"}`}>
                    Horas Asignadas
                  </span>
                  <span className="font-semibold text-base mt-0.5 block">
                    {selectedEmployee.assignedHours} horas
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className={dark ? "text-white/50" : "text-slate-500"}>
                    Porcentaje de Carga Asignada
                  </span>
                  <span>
                    {Math.round((selectedEmployee.assignedHours / selectedEmployee.contractedHours) * 100)}%
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-slate-100"}`}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((selectedEmployee.assignedHours / selectedEmployee.contractedHours) * 100)
                      )}%`,
                      background: COLORS.primary,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 cursor-pointer text-white"
                style={{ background: COLORS.primary }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE & EDIT FORM MODAL */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl border transition-all ${dark ? "bg-[#1E293B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold">{isEditing ? "Editar Empleado" : "Nuevo Empleado"}</h3>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${dark ? "text-white/50" : "text-slate-400"
                  }`}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              {/* Body */}
              <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${dark ? "text-white/60" : "text-slate-500"
                        }`}
                    >
                      Código *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isEditing}
                      value={formValues.code}
                      onChange={(e) => setFormValues({ ...formValues, code: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${dark
                          ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60 disabled:opacity-50"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50 disabled:opacity-50"
                        }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${dark ? "text-white/60" : "text-slate-500"
                        }`}
                    >
                      CI *
                    </label>
                    <input
                      type="text"
                      required
                      value={formValues.ci}
                      onChange={(e) => setFormValues({ ...formValues, ci: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${dark
                          ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                        }`}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${dark ? "text-white/60" : "text-slate-500"}`}
                  >
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formValues.name}
                    onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${dark
                        ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                      }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${dark ? "text-white/60" : "text-slate-500"
                        }`}
                    >
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={formValues.email}
                      onChange={(e) => setFormValues({ ...formValues, email: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${dark
                          ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                        }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${dark ? "text-white/60" : "text-slate-500"
                        }`}
                    >
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={formValues.phone}
                      onChange={(e) => setFormValues({ ...formValues, phone: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${dark
                          ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                        }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${dark ? "text-white/60" : "text-slate-500"
                        }`}
                    >
                      Estado
                    </label>
                    <select
                      value={formValues.status}
                      onChange={(e) => setFormValues({ ...formValues, status: e.target.value as any })}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${dark
                          ? "bg-[#1E293B] border-white/10 text-white focus:border-blue-500/60"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                        }`}
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${dark ? "text-white/60" : "text-slate-500"
                        }`}
                    >
                      Horas Contratadas
                    </label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="contractedHours"
                          checked={formValues.contractedHours === 20}
                          onChange={() => setFormValues({ ...formValues, contractedHours: 20 })}
                          className="accent-[#0F4C97]"
                        />
                        20 horas
                      </label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="contractedHours"
                          checked={formValues.contractedHours === 40}
                          onChange={() => setFormValues({ ...formValues, contractedHours: 40 })}
                          className="accent-[#0F4C97]"
                        />
                        40 horas
                      </label>
                    </div>
                  </div>
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${dark ? "text-white/60" : "text-slate-500"
                        }`}
                    >
                      Horas Asignadas
                    </label>
                    <input
                      type="number"
                      disabled
                      value={formValues.assignedHours}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${dark
                          ? "bg-white/5 border-white/10 text-white/50 cursor-not-allowed"
                          : "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                        }`}
                    />
                    <p className={`text-[10px] mt-1.5 leading-tight ${dark ? "text-white/40" : "text-slate-400"}`}>
                      *Este valor se calcula automáticamente desde el módulo de Horarios.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${dark
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
      {deleteConfirmOpen && employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border transition-all ${dark ? "bg-[#1E293B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}
          >
            <h3 className="text-lg font-bold text-red-500 flex items-center gap-2 mb-2">
              <Trash2 size={20} /> Eliminar Empleado
            </h3>
            <p className={`text-sm mb-6 ${dark ? "text-white/75" : "text-slate-600"}`}>
              ¿Está seguro de que desea eliminar al empleado{" "}
              <span className="font-semibold">{employeeToDelete.name}</span> ({employeeToDelete.code})? Esta
              acción no se puede deshacer.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${dark
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