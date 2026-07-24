import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Database,
  Activity,
  Settings as SettingsIcon,
  Shield,
  Download,
  Upload,
  Loader2,
} from "lucide-react";
import { card } from "@/utils/card";
import { COLORS } from "@/theme/colors";
import {
  getSystemSettings,
  updateSystemSettings,
  getAuditLogs,
  getBackups,
  createBackup,
  downloadBackup,
  restoreBackup,
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

  const [restoring, setRestoring] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDownloadBackup = async (id: string) => {
    setDownloadingId(id);
    try {
      await downloadBackup(id);
    } catch (err) {
      console.error(err);
      alert("Error al descargar el respaldo");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRestoreBackup = async (file: File) => {
    if (!window.confirm("¿Estás seguro de restaurar este respaldo? Se sobrescribirán todos los datos actuales de la base de datos.")) return;
    setRestoring(true);
    try {
      await restoreBackup(file);
      alert("Base de datos restaurada exitosamente");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Error al restaurar el respaldo");
    } finally {
      setRestoring(false);
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
        <div className={`flex overflow-x-auto border-b ${dark ? "border-white/8" : "border-slate-100"}`}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2 cursor-pointer whitespace-nowrap ${tab === t.id
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

                {/* Límites de Tiempo */}
                <div
                  className={`p-5 rounded-2xl border space-y-4 ${dark ? "border-white/8 bg-white/3" : "border-slate-100 bg-slate-50"
                    }`}
                >
                  <h4
                    className={`text-xs font-bold uppercase tracking-wider border-b pb-2 ${dark ? "border-white/10 text-white" : "border-slate-200 text-slate-700"
                      }`}
                  >
                    Límites de Tiempo
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
                {[
                  {
                    role: "ADMIN",
                    label: "Administrador",
                    color: "#DC2626",
                    letter: "A",
                    permissions: [
                      "Gestión completa de empleados (CRUD)",
                      "Configuración del sistema",
                      "Gestión de horarios y periodos",
                      "Aprobación y rechazo de permisos",
                      "Acceso a reportes y dashboard",
                      "Gestión de usuarios del sistema",
                      "Visualización de auditoría",
                      "Gestión de respaldos",
                    ],
                  },
                  {
                    role: "COORDINADOR",
                    label: "Coordinador",
                    color: "#2563EB",
                    letter: "C",
                    permissions: [
                      "Visualización de empleados",
                      "Gestión de horarios asignados",
                      "Aprobación de permisos",
                      "Acceso a reportes",
                      "Visualización del dashboard",
                    ],
                    restricted: [
                      "Modificar configuración del sistema",
                      "Gestionar usuarios del sistema",
                    ],
                  },
                  {
                    role: "EMPLEADO",
                    label: "Empleado",
                    color: "#059669",
                    letter: "E",
                    permissions: [
                      "Marcado de asistencia por QR (móvil)",
                      "Visualización de su propio historial",
                      "Solicitud de permisos",
                    ],
                    restricted: [
                      "Acceder al panel administrativo",
                      "Modificar horarios",
                      "Gestionar empleados",
                    ],
                  },
                ].map((r) => (
                  <div
                    key={r.role}
                    className={`rounded-2xl border overflow-hidden ${dark ? "border-white/10 bg-white/3" : "border-slate-200 bg-white"}`}
                    style={{ borderTop: `4px solid ${r.color}` }}
                  >
                    <div className={`px-5 py-4 border-b flex items-center gap-3 ${dark ? "border-white/10" : "border-slate-100"}`}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: r.color }}>
                        {r.letter}
                      </div>
                      <div>
                        <h4 className={`font-bold text-sm ${dark ? "text-white" : "text-slate-800"}`}>{r.label}</h4>
                        <p className={`text-xs ${dark ? "text-white/40" : "text-slate-400"}`}>Rol: {r.role}</p>
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${dark ? "text-white/40" : "text-slate-400"}`}>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Permitido
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {r.permissions.map((p, i) => (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                                dark
                                  ? "bg-green-500/10 border-green-500/25 text-green-400"
                                  : "bg-green-50 border-green-200 text-green-700"
                              }`}
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                      {r.restricted && (
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${dark ? "text-white/40" : "text-slate-400"}`}>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              Restringido
                            </span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {r.restricted.map((p, i) => (
                              <span
                                key={i}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                                  dark
                                    ? "bg-red-500/10 border-red-500/25 text-red-400"
                                    : "bg-red-50 border-red-200 text-red-600"
                                }`}
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className={`font-semibold text-base ${dark ? "text-white" : "text-slate-800"}`}>
                    Gestión de respaldos
                  </h3>
                  <p className={`text-xs mt-0.5 ${dark ? "text-white/35" : "text-slate-400"}`}>
                    Crea, descarga y restaura copias de seguridad de la base de datos
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".sql,.dump,.backup,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { handleRestoreBackup(file); e.target.value = ""; }
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={restoring}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                    style={{
                      background: "color-mix(in srgb, var(--color-warning, #F59E0B) 12%, transparent)",
                      color: "var(--color-warning, #F59E0B)",
                      border: "1px solid color-mix(in srgb, var(--color-warning, #F59E0B) 25%, transparent)",
                    }}
                  >
                    {restoring ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                    {restoring ? "Restaurando..." : "Restaurar Respaldo"}
                  </button>
                  <button
                    onClick={handleCreateBackup}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer transition-all hover:opacity-90"
                    style={{ background: COLORS.primary }}
                  >
                    <Database size={15} /> Crear respaldo ahora
                  </button>
                </div>
              </div>

              {backups.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                    <Database size={24} style={{ color: "var(--muted-foreground)" }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Sin respaldos disponibles</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                    Crea tu primer respaldo usando el botón "Crear respaldo ahora"
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${dark ? "text-white/35" : "text-slate-400"}`}>
                          {b.scheduledAt ? "Respaldo Programado" : "Respaldo Manual"}
                        </p>
                        <p className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>
                          {b.createdAt}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
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
                          {b.sizeKb > 0 && (
                            <span className={`text-[10px] ${dark ? "text-white/25" : "text-slate-400"}`}>
                              {b.sizeKb} KB
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => handleDownloadBackup(b.id)}
                            disabled={downloadingId === b.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                            style={{
                              background: `color-mix(in srgb, ${COLORS.primary} 10%, transparent)`,
                              color: COLORS.primary,
                            }}
                          >
                            {downloadingId === b.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Download size={12} />
                            )}
                            {downloadingId === b.id ? "Descargando..." : "Descargar (.sql)"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
