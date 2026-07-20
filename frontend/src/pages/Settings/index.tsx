import React, { useState, useEffect } from "react";
import {
  Users,
  Database,
  Activity,
  Settings as SettingsIcon,
  Shield,
} from "lucide-react";
import { card } from "@/utils/card";
import { COLORS } from "@/theme/colors";
import {
  getSystemSettings,
  updateSystemSettings,
  getAuditLogs,
  getBackups,
  createBackup,
  SystemSettings,
  AuditLog,
  BackupInfo,
} from "@/services/settings.service";
import { UsersView } from "@/pages/Users";

interface SettingsProps {
  dark: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ dark }) => {
  const [tab, setTab] = useState("sistema");
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    toleranceTime: 10,
    qrDuration: 15,
    openingHour: "07:00",
    closingHour: "22:00",
    institutionName: "Universidad Católica Boliviana San Pablo",
  });
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      const [settings, auditList, backupList] = await Promise.all([
        getSystemSettings(),
        getAuditLogs(),
        getBackups(),
      ]);
      setSystemSettings(settings);
      setAudits(auditList);
      setBackups(backupList);
    } catch (err) {
      console.error("Error al cargar configuración:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSystemSettings(systemSettings);
      const updated = await getSystemSettings();
      setSystemSettings(updated);
      alert("Configuración del sistema guardada exitosamente");
    } catch (err) {
      console.error(err);
      alert("Error al guardar la configuración");
    }
  };

  const handleCreateBackup = async () => {
    try {
      const newBackup = await createBackup();
      setBackups((prev) => [newBackup, ...prev]);
      alert("Respaldo manual creado exitosamente");
    } catch (err) {
      console.error(err);
      alert("Error al crear el respaldo");
    }
  };

  const tabs = [
    { id: "sistema", label: "Sistema", icon: <SettingsIcon size={14} /> },
    { id: "usuarios", label: "Usuarios", icon: <Users size={14} /> },
    { id: "roles", label: "Roles", icon: <Shield size={14} /> },
    { id: "auditoria", label: "Auditoría", icon: <Activity size={14} /> },
    { id: "respaldos", label: "Respaldos", icon: <Database size={14} /> },
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
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2 cursor-pointer ${tab === t.id
                  ? "text-blue-600 font-semibold"
                  : dark
                    ? "border-transparent text-white/35 hover:text-white/60"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              style={tab === t.id ? { color: COLORS.primary, borderColor: COLORS.primary } : {}}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* TAB: SISTEMA */}
          {tab === "sistema" && (
            <form onSubmit={handleSaveSettings}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`font-semibold text-base ${dark ? "text-white" : "text-slate-800"}`}>
                    Configuración del Sistema
                  </h3>
                  <p className={`text-xs mt-0.5 ${dark ? "text-white/35" : "text-slate-400"}`}>
                    Ajusta los parámetros operativos de la plataforma
                  </p>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 cursor-pointer"
                  style={{ background: COLORS.primary }}
                >
                  Guardar cambios
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Parámetros Generales */}
                <div
                  className={`p-5 rounded-2xl border space-y-4 ${dark ? "border-white/8 bg-white/3" : "border-slate-100 bg-slate-50"
                    }`}
                >
                  <h4
                    className={`text-xs font-bold uppercase tracking-wider border-b pb-2 ${dark ? "border-white/10 text-white" : "border-slate-200 text-slate-700"
                      }`}
                  >
                    Parámetros Generales
                  </h4>
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1.5 ${dark ? "text-white/60" : "text-slate-500"
                        }`}
                    >
                      Nombre de la Institución
                    </label>
                    <input
                      type="text"
                      required
                      value={systemSettings.institutionName}
                      onChange={(e) =>
                        setSystemSettings({ ...systemSettings, institutionName: e.target.value })
                      }
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${dark
                          ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                        }`}
                    />
                  </div>


                </div>

                {/* Límites y Horarios */}
                <div
                  className={`p-5 rounded-2xl border space-y-4 ${dark ? "border-white/8 bg-white/3" : "border-slate-100 bg-slate-50"
                    }`}
                >
                  <h4
                    className={`text-xs font-bold uppercase tracking-wider border-b pb-2 ${dark ? "border-white/10 text-white" : "border-slate-200 text-slate-700"
                      }`}
                  >
                    Límites y Horarios
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        className={`block text-xs font-semibold mb-1.5 ${dark ? "text-white/60" : "text-slate-500"
                          }`}
                      >
                        Tiempo de Tolerancia (minutos)
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={systemSettings.toleranceTime}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            toleranceTime: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${dark
                            ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                          }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-xs font-semibold mb-1.5 ${dark ? "text-white/60" : "text-slate-500"
                          }`}
                      >
                        Duración del QR (segundos)
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={systemSettings.qrDuration}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            qrDuration: parseInt(e.target.value, 10) || 0,
                          })
                        }
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
                        className={`block text-xs font-semibold mb-1.5 ${dark ? "text-white/60" : "text-slate-500"
                          }`}
                      >
                        Hora Apertura Control
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="HH:MM"
                        value={systemSettings.openingHour}
                        onChange={(e) =>
                          setSystemSettings({ ...systemSettings, openingHour: e.target.value })
                        }
                        className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${dark
                            ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                          }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-xs font-semibold mb-1.5 ${dark ? "text-white/60" : "text-slate-500"
                          }`}
                      >
                        Hora Cierre Control
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="HH:MM"
                        value={systemSettings.closingHour}
                        onChange={(e) =>
                          setSystemSettings({ ...systemSettings, closingHour: e.target.value })
                        }
                        className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${dark
                            ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                          }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB: USUARIOS */}
          {tab === "usuarios" && (
            <UsersView dark={dark} />
          )}

          {/* TAB: ROLES */}
          {tab === "roles" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`font-semibold text-base ${dark ? "text-white" : "text-slate-800"}`}>
                    Gestión de Roles del Sistema
                  </h3>
                  <p className={`text-xs mt-0.5 ${dark ? "text-white/35" : "text-slate-400"}`}>
                    Descripción de los roles y sus permisos asociados en la plataforma
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* ADMIN (Sistema) */}
                <div className={`rounded-2xl border overflow-hidden ${dark ? "border-white/10 bg-white/3" : "border-slate-200 bg-white"}`}>
                  <div className={`px-5 py-4 border-b flex items-center gap-3 ${dark ? "border-white/10" : "border-slate-100"}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: "#DC2626" }}>
                      A
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${dark ? "text-white" : "text-slate-800"}`}>Administrador</h4>
                      <p className={`text-xs ${dark ? "text-white/40" : "text-slate-400"}`}>Rol: ADMIN</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-white/40" : "text-slate-400"}`}>Permisos</p>
                    <ul className="space-y-2">
                      {[
                        "Gestión completa de empleados (CRUD)",
                        "Configuración del sistema",
                        "Gestión de horarios y periodos",
                        "Aprobación y rechazo de permisos",
                        "Acceso a reportes y dashboard",
                        "Gestión de usuarios del sistema",
                        "Visualización de auditoría",
                        "Gestión de respaldos",
                      ].map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                          <span className={dark ? "text-white/70" : "text-slate-600"}>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* COORDINADOR */}
                <div className={`rounded-2xl border overflow-hidden ${dark ? "border-white/10 bg-white/3" : "border-slate-200 bg-white"}`}>
                  <div className={`px-5 py-4 border-b flex items-center gap-3 ${dark ? "border-white/10" : "border-slate-100"}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: "#2563EB" }}>
                      C
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${dark ? "text-white" : "text-slate-800"}`}>Coordinador</h4>
                      <p className={`text-xs ${dark ? "text-white/40" : "text-slate-400"}`}>Rol: COORDINADOR</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-white/40" : "text-slate-400"}`}>Permisos</p>
                    <ul className="space-y-2">
                      {[
                        "Visualización de empleados",
                        "Gestión de horarios asignados",
                        "Aprobación de permisos",
                        "Acceso a reportes",
                        "Visualización del dashboard",
                        "No puede modificar configuración del sistema",
                        "No puede gestionar usuarios del sistema",
                      ].map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                          <span className={dark ? "text-white/70" : "text-slate-600"}>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* EMPLEADO */}
                <div className={`rounded-2xl border overflow-hidden ${dark ? "border-white/10 bg-white/3" : "border-slate-200 bg-white"}`}>
                  <div className={`px-5 py-4 border-b flex items-center gap-3 ${dark ? "border-white/10" : "border-slate-100"}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: "#059669" }}>
                      E
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${dark ? "text-white" : "text-slate-800"}`}>Empleado</h4>
                      <p className={`text-xs ${dark ? "text-white/40" : "text-slate-400"}`}>Rol: EMPLEADO</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-white/40" : "text-slate-400"}`}>Permisos</p>
                    <ul className="space-y-2">
                      {[
                        "Marcado de asistencia por QR (móvil)",
                        "Visualización de su propio historial",
                        "Solicitud de permisos",
                        "No puede acceder al panel administrativo",
                        "No puede modificar horarios",
                        "No puede gestionar empleados",
                      ].map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                          <span className={dark ? "text-white/70" : "text-slate-600"}>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AUDITORIA */}
          {tab === "auditoria" && (
            <div>
              <h3 className={`font-semibold mb-5 ${dark ? "text-white" : "text-slate-800"}`}>
                Registro de auditoría del sistema
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={dark ? "bg-white/3" : "bg-slate-50"}>
                      {["Acción", "Usuario", "Fecha y hora", "Dirección IP"].map((c) => (
                        <th
                          key={c}
                          className={`px-4 py-3 text-left text-xs font-semibold ${dark ? "text-white/30" : "text-slate-400"
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
                        <td
                          className={`px-4 py-3 text-sm font-medium ${dark ? "text-white" : "text-slate-800"
                            }`}
                        >
                          {a.action}
                        </td>
                        <td className={`px-4 py-3 text-sm ${dark ? "text-white/50" : "text-slate-500"}`}>
                          {a.userEmail}
                        </td>
                        <td
                          className={`px-4 py-3 text-xs font-mono ${dark ? "text-white/35" : "text-slate-400"
                            }`}
                        >
                          {a.timestamp}
                        </td>
                        <td
                          className={`px-4 py-3 text-xs font-mono ${dark ? "text-white/25" : "text-slate-400"
                            }`}
                        >
                          {a.ip}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: RESPALDOS */}
          {tab === "respaldos" && (
            <div>
              <h3 className={`font-semibold mb-5 ${dark ? "text-white" : "text-slate-800"}`}>
                Gestión de respaldos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {backups.map((b, i) => (
                  <div
                    key={i}
                    className={`p-5 rounded-2xl border flex items-center gap-4 ${dark ? "border-white/8 bg-white/3" : "border-slate-100 bg-slate-50"
                      }`}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${COLORS.primary}12` }}
                    >
                      <Database size={22} style={{ color: COLORS.primary }} />
                    </div>
                    <div>
                      <p className={`text-xs ${dark ? "text-white/35" : "text-slate-400"}`}>{b.scheduledAt ? "Respaldo Programado" : "Respaldo Manual"}</p>
                      <p className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>
                        {b.createdAt}
                      </p>
                      <span
                        className={`text-xs font-semibold ${b.status === "success"
                            ? "text-green-500"
                            : b.status === "pending"
                              ? "text-blue-500"
                              : "text-red-500"
                          }`}
                      >
                        {b.status === "success"
                          ? "Exitoso"
                          : b.status === "pending"
                            ? "Programado"
                            : "Fallido"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleCreateBackup}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold cursor-pointer transition-all hover:opacity-90"
                style={{ background: COLORS.primary }}
              >
                <Database size={15} /> Crear respaldo ahora
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
