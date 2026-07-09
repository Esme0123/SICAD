import { useState } from "react";
import { Search, Filter, Plus, Edit2, Calendar, Trash2 } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { card } from "@/utils/card";

interface EmployeesProps {
  dark: boolean;
}

export const Employees: React.FC<EmployeesProps> = ({ dark }) => {
  const [search, setSearch] = useState("");
  const all = [
    {
      code: "CC-001",
      ci: "12345678",
      name: "Carlos Mamani Quispe",
      role: "Auxiliar",
      status: "Activo",
      periods: 4,
    },
    {
      code: "CC-002",
      ci: "87654321",
      name: "Ana Flores Mendoza",
      role: "Auxiliar",
      status: "Activo",
      periods: 3,
    },
    {
      code: "CC-003",
      ci: "11223344",
      name: "Luis Quispe Torrez",
      role: "Técnico",
      status: "Activo",
      periods: 5,
    },
    {
      code: "CC-004",
      ci: "44332211",
      name: "María Torres García",
      role: "Auxiliar",
      status: "Inactivo",
      periods: 0,
    },
    {
      code: "CC-005",
      ci: "55667788",
      name: "Jorge Condori López",
      role: "Técnico",
      status: "Activo",
      periods: 6,
    },
    {
      code: "CC-006",
      ci: "99887766",
      name: "Sofía Vargas Choque",
      role: "Auxiliar",
      status: "Activo",
      periods: 4,
    },
    {
      code: "CC-007",
      ci: "33445566",
      name: "Diego Mamani Cruz",
      role: "Auxiliar",
      status: "Activo",
      periods: 3,
    },
    {
      code: "CC-008",
      ci: "77889900",
      name: "Patricia Rojas Lima",
      role: "Coordinador",
      status: "Licencia",
      periods: 2,
    },
  ];

  const rows = all.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.code.toLowerCase().includes(search.toLowerCase()) ||
      e.ci.includes(search)
  );

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}
    >
      <div className={card(dark, "overflow-hidden")}>
        {/* Toolbar */}
        <div
          className={`flex items-center justify-between p-5 border-b ${
            dark ? "border-white/8" : "border-slate-100"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search
                size={15}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                  dark ? "text-white/30" : "text-slate-400"
                }`}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, código o CI..."
                className={`pl-9 pr-4 py-2 rounded-xl border text-sm outline-none w-72 ${
                  dark
                    ? "bg-white/5 border-white/10 text-white placeholder-white/25 focus:border-purple-500/60"
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:border-purple-600/50"
                }`}
              />
            </div>
            <button
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer ${
                dark
                  ? "border-white/10 text-white/50 hover:bg-white/5"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Filter size={13} /> Filtrar
            </button>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 cursor-pointer"
            style={{ background: "#6A1B9A" }}
          >
            <Plus size={14} /> Nuevo empleado
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={dark ? "bg-white/3" : "bg-slate-50/80"}>
                {["Código", "CI", "Nombre completo", "Cargo", "Estado", "Periodos asignados", "Acciones"].map((col) => (
                  <th
                    key={col}
                    className={`px-5 py-3 text-left text-xs font-semibold tracking-wide ${
                      dark ? "text-white/35" : "text-slate-400"
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((emp, i) => (
                <tr
                  key={i}
                  className={`border-t transition-colors ${
                    dark ? "border-white/6 hover:bg-white/3" : "border-slate-100 hover:bg-purple-50/10"
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-xs font-mono font-bold ${
                        dark ? "text-purple-400" : "text-purple-700"
                      }`}
                    >
                      {emp.code}
                    </span>
                  </td>
                  <td className={`px-5 py-3.5 text-sm font-mono ${dark ? "text-white/50" : "text-slate-500"}`}>
                    {emp.ci}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.name} size={32} bg="#6A1B9A" />
                      <span className={`text-sm font-medium ${dark ? "text-white" : "text-slate-800"}`}>
                        {emp.name}
                      </span>
                    </div>
                  </td>
                  <td className={`px-5 py-3.5 text-sm ${dark ? "text-white/40" : "text-slate-500"}`}>
                    {emp.role}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={emp.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {Array.from({ length: Math.min(emp.periods, 6) }).map((_, j) => (
                          <div key={j} className="w-4 h-1.5 rounded-full" style={{ background: "#6A1B9A" }} />
                        ))}
                      </div>
                      <span className={`text-xs ml-1 ${dark ? "text-white/40" : "text-slate-400"}`}>
                        {emp.periods}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-0.5">
                      <button
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          dark ? "hover:bg-white/8 text-white/40" : "hover:bg-slate-100 text-slate-400"
                        }`}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          dark ? "hover:bg-white/8 text-white/40" : "hover:bg-slate-100 text-slate-400"
                        }`}
                      >
                        <Calendar size={13} />
                      </button>
                      <button className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-red-400 cursor-pointer">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
            Mostrando {rows.length} de {all.length} empleados
          </p>
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  n === 1
                    ? "text-white"
                    : dark
                    ? "text-white/35 hover:bg-white/6"
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
