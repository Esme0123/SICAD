import React, { useState } from "react";
import {
  Users,
  Shield,
  Database,
  Activity,
  Plus,
  Edit2,
  Trash2,
  Check,
} from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { card } from "@/utils/card";

interface SettingsProps {
  dark: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ dark }) => {
  const [tab, setTab] = useState("usuarios");
  const tabs = [
    { id: "usuarios", label: "Usuarios", icon: <Users size={14} /> },
    { id: "roles", label: "Roles", icon: <Shield size={14} /> },
    { id: "respaldos", label: "Respaldos", icon: <Database size={14} /> },
    { id: "auditoria", label: "Auditoría", icon: <Activity size={14} /> },
  ];
  const users = [
    { name: "Admin UCB", email: "admin@ucb.edu.bo", role: "Administrador", active: true },
    { name: "Aux. Sistemas", email: "aux@ucb.edu.bo", role: "Auxiliar", active: true },
    { name: "Coord. Cómputo", email: "coord@ucb.edu.bo", role: "Coordinador", active: false },
  ];
  const roles = [
    {
      name: "Administrador",
      perms: ["Ver todo", "Crear usuarios", "Editar configuración", "Exportar informes"],
      col: "#6A1B9A", // UCB Purple
    },
    {
      name: "Coordinador",
      perms: ["Ver reportes", "Gestionar empleados", "Exportar"],
      col: "#64B5F6", // Celeste
    },
    {
      name: "Auxiliar",
      perms: ["Ver historial", "Registrar asistencia"],
      col: "#2E7D32", // Success
    },
  ];
  const audits = [
    { action: "Login exitoso", user: "admin@ucb.edu.bo", time: "07/07/2026 10:32", ip: "192.168.1.5" },
    { action: "Empleado creado", user: "admin@ucb.edu.bo", time: "07/07/2026 09:15", ip: "192.168.1.5" },
    { action: "QR generado", user: "Sistema", time: "07/07/2026 10:15", ip: "localhost" },
    { action: "Reporte exportado", user: "coord@ucb.edu.bo", time: "06/07/2026 16:45", ip: "192.168.1.8" },
    { action: "Configuración", user: "admin@ucb.edu.bo", time: "06/07/2026 09:00", ip: "192.168.1.5" },
  ];

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}
    >
      <div className={card(dark, "overflow-hidden")}>
        {/* Tabs */}
        <div className={`flex border-b ${dark ? "border-white/8" : "border-slate-100"}`}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2 cursor-pointer ${
                tab === t.id
                  ? "border-[#6A1B9A] text-[#6A1B9A]"
                  : dark
                  ? "border-transparent text-white/35 hover:text-white/60"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Users */}
          {tab === "usuarios" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className={`font-semibold ${dark ? "text-white" : "text-slate-800"}`}>
                    Gestión de usuarios
                  </h3>
                  <p className={`text-xs mt-0.5 ${dark ? "text-white/35" : "text-slate-400"}`}>
                    {users.length} usuarios registrados
                  </p>
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold cursor-pointer"
                  style={{ background: "#6A1B9A" }}
                >
                  <Plus size={14} /> Nuevo usuario
                </button>
              </div>
              <div className="space-y-3">
                {users.map((u, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-4 rounded-2xl border ${
                      dark ? "border-white/8 bg-white/3" : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <Avatar name={u.name} size={40} bg="#6A1B9A" />
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-800"}`}>
                        {u.name}
                      </p>
                      <p className={`text-xs ${dark ? "text-white/35" : "text-slate-400"}`}>
                        {u.email}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: "rgba(106,27,154,0.1)", color: "#6A1B9A" }}
                    >
                      {u.role}
                    </span>
                    <div
                      className={`flex items-center gap-1.5 text-xs font-semibold ${
                        u.active ? "text-green-500" : "text-red-400"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${u.active ? "bg-green-400" : "bg-red-400"}`} />
                      {u.active ? "Activo" : "Inactivo"}
                    </div>
                    <div className="flex gap-1">
                      <button
                        className={`p-1.5 rounded-lg cursor-pointer ${
                          dark ? "hover:bg-white/8 text-white/35" : "hover:bg-white text-slate-400"
                        }`}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 cursor-pointer">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Roles */}
          {tab === "roles" && (
            <div>
              <h3 className={`font-semibold mb-5 ${dark ? "text-white" : "text-slate-800"}`}>
                Roles y permisos del sistema
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {roles.map((r, i) => (
                  <div
                    key={i}
                    className={`p-5 rounded-2xl border ${
                      dark ? "border-white/8 bg-white/3" : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: `${r.col}15` }}
                      >
                        <Shield size={15} style={{ color: r.col }} />
                      </div>
                      <span className="font-bold text-sm" style={{ color: r.col }}>
                        {r.name}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {r.perms.map((p, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <Check size={11} className="text-green-500 flex-shrink-0" strokeWidth={3} />
                          <span className={`text-xs ${dark ? "text-white/50" : "text-slate-600"}`}>
                            {p}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backups */}
          {tab === "respaldos" && (
            <div>
              <h3 className={`font-semibold mb-5 ${dark ? "text-white" : "text-slate-800"}`}>
                Gestión de respaldos
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-5">
                {[
                  { label: "Último respaldo", value: "07/07/2026 02:00", status: "Exitoso", ok: true },
                  { label: "Próximo respaldo", value: "08/07/2026 02:00", status: "Programado", ok: null },
                ].map((b, i) => (
                  <div
                    key={i}
                    className={`p-5 rounded-2xl border flex items-center gap-4 ${
                      dark ? "border-white/8 bg-white/3" : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(106,27,154,0.1)" }}
                    >
                      <Database size={22} style={{ color: "#6A1B9A" }} />
                    </div>
                    <div>
                      <p className={`text-xs ${dark ? "text-white/35" : "text-slate-400"}`}>{b.label}</p>
                      <p className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>
                        {b.value}
                      </p>
                      <span className={`text-xs font-semibold ${b.ok ? "text-green-500" : "text-blue-500"}`}>
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold cursor-pointer"
                style={{ background: "#6A1B9A" }}
              >
                <Database size={15} /> Crear respaldo ahora
              </button>
            </div>
          )}

          {/* Audit */}
          {tab === "auditoria" && (
            <div>
              <h3 className={`font-semibold mb-5 ${dark ? "text-white" : "text-slate-800"}`}>
                Registro de auditoría del sistema
              </h3>
              <table className="w-full">
                <thead>
                  <tr className={dark ? "bg-white/3" : "bg-slate-50"}>
                    {["Acción", "Usuario", "Fecha y hora", "Dirección IP"].map((c) => (
                      <th
                        key={c}
                        className={`px-4 py-3 text-left text-xs font-semibold ${
                          dark ? "text-white/30" : "text-slate-400"
                        }`}
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a, i) => (
                    <tr key={i} className={`border-t ${dark ? "border-white/6" : "border-slate-100"}`}>
                      <td className={`px-4 py-3 text-sm font-medium ${dark ? "text-white" : "text-slate-800"}`}>
                        {a.action}
                      </td>
                      <td className={`px-4 py-3 text-sm ${dark ? "text-white/50" : "text-slate-500"}`}>
                        {a.user}
                      </td>
                      <td className={`px-4 py-3 text-xs font-mono ${dark ? "text-white/35" : "text-slate-400"}`}>
                        {a.time}
                      </td>
                      <td className={`px-4 py-3 text-xs font-mono ${dark ? "text-white/25" : "text-slate-400"}`}>
                        {a.ip}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
