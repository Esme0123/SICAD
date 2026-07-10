import React, { useState, useMemo } from "react";
import { Plus, Search, Calendar as CalendarIcon, Clock, Filter, CheckCircle2, X } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { card } from "@/utils/card";

interface LeavesViewProps {
    dark: boolean;
}

// 1. Tipos de Permisos con sus colores definidos
const LEAVE_TYPES = [
    { id: "salud", label: "Motivos de Salud", dot: "bg-blue-500", text: "text-blue-600", textDark: "text-blue-400" },
    { id: "personales", label: "Asuntos Personales", dot: "bg-purple-500", text: "text-purple-600", textDark: "text-purple-400" },
    { id: "academico", label: "Trámite Académico", dot: "bg-orange-500", text: "text-orange-600", textDark: "text-orange-400" },
    { id: "calamidad", label: "Calamidad Doméstica", dot: "bg-red-500", text: "text-red-600", textDark: "text-red-400" },
];

// 2. Mock de Empleados
const MOCK_EMPLOYEES = [
    { id: "e1", name: "Carlos Mamani Quispe", code: "CC-001" },
    { id: "e2", name: "Diego Mamani Cruz", code: "CC-007" },
    { id: "e3", name: "Patricia Rojas Lima", code: "CC-008" },
];

// 3. Historial de permisos ya registrados (Datos iniciales)
const INITIAL_LEAVES = [
    { id: 1, empName: "Diego Mamani Cruz", code: "CC-007", date: "07/07/2026", periods: ["10:15–11:15"], type: "salud", status: "Aprobado" },
    { id: 2, empName: "Patricia Rojas Lima", code: "CC-008", date: "06/07/2026", periods: ["07:15–08:15", "08:15–09:15"], type: "academico", status: "Aprobado" },
];

export const LeavesView: React.FC<LeavesViewProps> = ({ dark }) => {
    const [leaves, setLeaves] = useState(INITIAL_LEAVES);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Estados para Filtros Principales
    const [filterDate, setFilterDate] = useState("");
    const [filterEmp, setFilterEmp] = useState("");
    const [filterType, setFilterType] = useState("");

    // Estados del Formulario (Modal)
    const [selectedEmp, setSelectedEmp] = useState<any>(null);
    const [formDate, setFormDate] = useState("");
    const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
    const [formType, setFormType] = useState("salud");
    const [modalSearchQuery, setModalSearchQuery] = useState("");

    // Lógica Dinámica: Simular que buscamos los periodos asignados a un empleado en una fecha específica
    const availablePeriods = useMemo(() => {
        if (!selectedEmp || !formDate) return [];

        // Aquí iría tu llamada a la API real. Por ahora, simulamos turnos de un Centro de Cómputo
        // Cambiamos los turnos dependiendo del día seleccionado para simular dinamismo.
        const day = new Date(formDate).getDay();
        if (day === 1 || day === 3) { // Lunes y Miércoles
            return [
                { id: "p1", time: "07:15–08:15", task: "Apertura y Revisión de Salas" },
                { id: "p2", time: "08:15–09:15", task: "Soporte a Usuarios" },
            ];
        } else { // Otros días
            return [
                { id: "p3", time: "10:15–11:15", task: "Mantenimiento Preventivo" },
                { id: "p4", time: "11:15–12:15", task: "Soporte a Usuarios" },
                { id: "p5", time: "14:15–15:15", task: "Atención en Sala" },
            ];
        }
    }, [selectedEmp, formDate]);

    // Lógica de filtrado para la tabla principal
    const filteredLeaves = useMemo(() => {
        return leaves.filter((l) => {
            const matchDate = !filterDate || l.date === filterDate;
            const matchEmp = !filterEmp || l.empName.toLowerCase().includes(filterEmp.toLowerCase());
            const matchType = !filterType || l.type === filterType;
            return matchDate && matchEmp && matchType;
        });
    }, [leaves, filterDate, filterEmp, filterType]);

    const handleSave = () => {
        if (!selectedEmp || !formDate || selectedPeriods.length === 0) return;

        const newLeave = {
            id: Date.now(),
            empName: selectedEmp.name,
            code: selectedEmp.code,
            date: new Date(formDate).toLocaleDateString("es-BO", { day: '2-digit', month: '2-digit', year: 'numeric' }),
            periods: selectedPeriods,
            type: formType,
            status: "Aprobado"
        };

        setLeaves([newLeave, ...leaves]);
        setIsModalOpen(false);

        // Reset form
        setSelectedEmp(null);
        setFormDate("");
        setSelectedPeriods([]);
        setModalSearchQuery("");
    };

    const renderStatusBadge = (typeId: string) => {
        const typeInfo = LEAVE_TYPES.find(t => t.id === typeId);
        if (!typeInfo) return null;
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${dark ? 'bg-white/5' : 'bg-slate-50'} ${dark ? typeInfo.textDark : typeInfo.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${typeInfo.dot}`}></span>
                {typeInfo.label}
            </span>
        );
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 relative" style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}>

            {/* Cabecera y Botón Nuevo */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className={`text-xl font-bold ${dark ? "text-white" : "text-slate-800"}`}>Gestión de Permisos</h2>
                    <p className={`text-sm mt-1 ${dark ? "text-white/50" : "text-slate-500"}`}>
                        Registra justificaciones por periodo o por día completo.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg shadow-purple-500/20 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                    style={{ background: "#6A1B9A" }}
                >
                    <Plus size={18} />
                    Nuevo Permiso
                </button>
            </div>

            <div className={card(dark, "overflow-hidden")}>
                {/* Filtros */}
                <div className={`flex flex-wrap items-center gap-3 p-5 border-b ${dark ? "border-white/8" : "border-slate-100"}`}>
                    <div className="relative flex-1 md:max-w-xs">
                        <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
                        <input
                            type="text"
                            placeholder="Buscar empleado..."
                            value={filterEmp}
                            onChange={(e) => setFilterEmp(e.target.value)}
                            className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none transition-all ${dark ? "bg-white/5 border-white/10 text-white focus:border-[#6A1B9A]/60" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#6A1B9A]/50 focus:bg-white"}`}
                        />
                    </div>

                    <div className="relative">
                        <CalendarIcon size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className={`pl-9 pr-4 py-2 rounded-xl text-sm border outline-none transition-all ${dark ? "bg-white/5 border-white/10 text-white/70 focus:border-[#6A1B9A]/60" : "bg-slate-50 border-slate-200 text-slate-600 focus:border-[#6A1B9A]/50 focus:bg-white"}`}
                        />
                    </div>

                    <div className="relative">
                        <Filter size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className={`pl-9 pr-8 py-2 rounded-xl text-sm border outline-none appearance-none cursor-pointer transition-all ${dark ? "bg-white/5 border-white/10 text-white/70 focus:border-[#6A1B9A]/60" : "bg-slate-50 border-slate-200 text-slate-600 focus:border-[#6A1B9A]/50 focus:bg-white"}`}
                        >
                            <option value="">Todos los motivos</option>
                            {LEAVE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full">
                        <thead>
                            <tr className={dark ? "bg-white/3" : "bg-slate-50/80"}>
                                {["Empleado", "Fecha", "Periodos Afectados", "Motivo", "Estado"].map((c) => (
                                    <th key={c} className={`px-5 py-3 text-left text-xs font-semibold tracking-wide ${dark ? "text-white/30" : "text-slate-400"}`}>
                                        {c}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeaves.length > 0 ? (
                                filteredLeaves.map((leave) => (
                                    <tr key={leave.id} className={`border-t transition-colors ${dark ? "border-white/6 hover:bg-white/3" : "border-slate-100 hover:bg-purple-50/10"}`}>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={leave.empName} size={32} bg="#6A1B9A" />
                                                <div>
                                                    <div className={`text-sm font-medium ${dark ? "text-white" : "text-slate-800"}`}>{leave.empName}</div>
                                                    <div className={`text-xs font-mono mt-0.5 ${dark ? "text-purple-400" : "text-purple-700"}`}>{leave.code}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`px-5 py-4 text-sm ${dark ? "text-white/70" : "text-slate-600"}`}>{leave.date}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {leave.periods.map((p, i) => (
                                                    <span key={i} className={`px-2 py-1 rounded text-xs font-mono font-medium ${dark ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-700"}`}>
                                                        {p}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {renderStatusBadge(leave.type)}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${dark ? "text-green-400" : "text-green-600"}`}>
                                                <CheckCircle2 size={16} /> {leave.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className={`px-5 py-8 text-center text-sm ${dark ? "text-white/40" : "text-slate-500"}`}>
                                        No se encontraron permisos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE REGISTRO */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${dark ? "bg-[#1E293B] border border-white/10" : "bg-white"}`}>

                        <div className={`flex items-center justify-between px-6 py-4 border-b ${dark ? "border-white/10" : "border-slate-100"}`}>
                            <h3 className={`text-lg font-bold ${dark ? "text-white" : "text-slate-800"}`}>Registrar Permiso</h3>
                            <button onClick={() => setIsModalOpen(false)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${dark ? "text-white/50 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">

                            {/* Empleado */}
                            <div>
                                <label className={`block text-xs font-medium mb-1.5 ${dark ? "text-white/60" : "text-slate-500"}`}>Empleado</label>
                                {!selectedEmp ? (
                                    <div className="relative">
                                        <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
                                        <input
                                            type="text"
                                            placeholder="Buscar empleado..."
                                            value={modalSearchQuery}
                                            onChange={(e) => setModalSearchQuery(e.target.value)}
                                            className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none ${dark ? "bg-white/5 border-white/10 text-white focus:border-purple-500" : "bg-white border-slate-200 text-slate-800 focus:border-purple-500"}`}
                                        />
                                        {modalSearchQuery.length > 0 && (
                                            <div className={`absolute z-10 w-full mt-1 rounded-xl shadow-lg border overflow-hidden ${dark ? "bg-[#0B0F19] border-white/10" : "bg-white border-slate-200"}`}>
                                                {MOCK_EMPLOYEES.filter(e => e.name.toLowerCase().includes(modalSearchQuery.toLowerCase())).map(emp => (
                                                    <div
                                                        key={emp.id}
                                                        onClick={() => { setSelectedEmp(emp); setModalSearchQuery(""); }}
                                                        className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-purple-500/10 ${dark ? "text-white" : "text-slate-800"}`}
                                                    >
                                                        {emp.name} <span className="text-xs text-purple-500 ml-2">{emp.code}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className={`flex items-center justify-between p-3 rounded-xl border ${dark ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                                        <div className="flex items-center gap-3">
                                            <Avatar name={selectedEmp.name} size={30} bg="#6A1B9A" />
                                            <div>
                                                <div className={`text-sm font-medium ${dark ? "text-white" : "text-slate-800"}`}>{selectedEmp.name}</div>
                                                <div className={`text-xs ${dark ? "text-white/50" : "text-slate-500"}`}>{selectedEmp.code}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => { setSelectedEmp(null); setSelectedPeriods([]); }} className="text-xs text-red-500 font-medium hover:underline cursor-pointer">Cambiar</button>
                                    </div>
                                )}
                            </div>

                            {/* Fecha */}
                            <div>
                                <label className={`block text-xs font-medium mb-1.5 ${dark ? "text-white/60" : "text-slate-500"}`}>Fecha del Permiso</label>
                                <div className="relative">
                                    <CalendarIcon size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-slate-400"}`} />
                                    <input
                                        type="date"
                                        value={formDate}
                                        onChange={(e) => {
                                            setFormDate(e.target.value);
                                            setSelectedPeriods([]); // Resetear periodos al cambiar fecha
                                        }}
                                        className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none ${dark ? "bg-white/5 border-white/10 text-white focus:border-purple-500" : "bg-white border-slate-200 text-slate-800 focus:border-purple-500"}`}
                                    />
                                </div>
                            </div>

                            {/* Periodos Dinámicos */}
                            <div className={`p-4 rounded-xl border ${dark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <label className={`text-xs font-semibold ${dark ? "text-white/80" : "text-slate-700"}`}>
                                        Seleccionar Periodos Afectados
                                    </label>
                                    {availablePeriods.length > 0 && (
                                        <button
                                            onClick={() => setSelectedPeriods(availablePeriods.map(p => p.time))}
                                            className="text-xs text-[#9C27B0] font-medium hover:underline cursor-pointer"
                                        >
                                            Marcar todo el día
                                        </button>
                                    )}
                                </div>

                                {(!selectedEmp || !formDate) ? (
                                    <p className={`text-xs text-center py-4 ${dark ? "text-white/40" : "text-slate-400"}`}>
                                        Selecciona un empleado y una fecha para ver sus periodos asignados.
                                    </p>
                                ) : availablePeriods.length === 0 ? (
                                    <p className={`text-xs text-center py-4 ${dark ? "text-white/40" : "text-slate-400"}`}>
                                        El empleado no tiene periodos asignados en esta fecha.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {availablePeriods.map((period) => (
                                            <label key={period.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${dark ? "bg-transparent border-white/10 hover:bg-white/5" : "bg-white border-slate-200 hover:bg-slate-50"}`}>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedPeriods.includes(period.time) ? "bg-[#9C27B0] border-[#9C27B0]" : (dark ? "border-white/30" : "border-slate-300")}`}>
                                                    {selectedPeriods.includes(period.time) && <CheckCircle2 size={12} className="text-white" />}
                                                </div>
                                                <div>
                                                    <div className={`text-sm font-medium ${dark ? "text-white" : "text-slate-700"}`}>{period.task}</div>
                                                    <div className={`text-xs font-mono mt-0.5 ${dark ? "text-white/50" : "text-slate-500"}`}><Clock size={10} className="inline mr-1" />{period.time}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tipo de Permiso */}
                            <div>
                                <label className={`block text-xs font-medium mb-1.5 ${dark ? "text-white/60" : "text-slate-500"}`}>Motivo del Permiso</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {LEAVE_TYPES.map((type) => (
                                        <div
                                            key={type.id}
                                            onClick={() => setFormType(type.id)}
                                            className={`px-3 py-2.5 rounded-lg border cursor-pointer text-xs font-medium text-center transition-all ${formType === type.id
                                                    ? (dark ? `bg-white/10 border-white/20 text-white` : `bg-slate-100 border-slate-300 text-slate-800`)
                                                    : (dark ? "bg-transparent border-white/10 text-white/50 hover:bg-white/5" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")
                                                }`}
                                        >
                                            {type.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                        {/* Footer Modal */}
                        <div className={`flex items-center justify-center gap-4 px-6 py-4 border-t ${dark ? "border-white/10 bg-[#1E293B]" : "border-slate-100 bg-white"}`}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${dark ? "text-white/70 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"}`}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!selectedEmp || !formDate || selectedPeriods.length === 0}
                                className={`px-6 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg transition-transform ${(!selectedEmp || !formDate || selectedPeriods.length === 0) ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95 cursor-pointer"}`}
                                style={{ background: "#BA68C8" }} // Morado más suave (botón Registrar Permiso)
                            >
                                Registrar Permiso
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};