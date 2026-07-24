import api from "./api";

export interface SystemSettings {
  toleranceTime: number;
  qrDuration: number;
  institutionName: string;
}

export interface RoleDefinition {
  id:          string;
  name:        UserRole;
  permissions: string[];
}

export interface AuditLog {
  id:        string;
  action:    string;
  userId:    string;
  userEmail: string;
  timestamp: string;
  ip:        string;
}

export interface BackupInfo {
  id:          string;
  createdAt:   string;
  scheduledAt: string;
  status:      "success" | "pending" | "failed";
  sizeKb:      number;
}

// ── Configuracion API ──────────────────────────────────────────

export async function getSystemSettings(): Promise<SystemSettings> {
  const { data } = await api.get<{ ok: boolean; data: any }>("/configuracion");
  if (!data.ok) throw new Error("Error al obtener configuración");
  const c = data.data;
  return {
    institutionName: c.nombreInstitucion ?? "SICAD",
    toleranceTime: c.tiempoTolerancia ?? 10,
    qrDuration: c.duracionQR ?? 30,
  } as SystemSettings;
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const body: Record<string, any> = {};
  if (settings.institutionName !== undefined) body.nombreInstitucion = settings.institutionName;
  if (settings.toleranceTime !== undefined) body.tiempoTolerancia = settings.toleranceTime;
  if (settings.qrDuration !== undefined) body.duracionQR = settings.qrDuration;

  const { data } = await api.patch<{ ok: boolean; data: any }>("/configuracion", body);
  if (!data.ok) throw new Error("Error al actualizar configuración");

  return getSystemSettings();
}

export async function getRoles(): Promise<RoleDefinition[]> {
  return [
    { id: "1", name: "Administrador", permissions: ["Ver todo", "Crear usuarios", "Editar configuración", "Exportar informes"] },
    { id: "2", name: "Coordinador", permissions: ["Ver reportes", "Gestionar empleados", "Exportar"] },
    { id: "3", name: "Auxiliar", permissions: ["Ver historial", "Registrar asistencia"] },
  ];
}

// ── Auditoria API ─────────────────────────────────────────────

export async function getAuditLogs(): Promise<AuditLog[]> {
  const { data } = await api.get<{ ok: boolean; data: any[] }>("/auditoria");
  if (!data.ok) throw new Error("Error al obtener registros de auditoría");
  return data.data.map((r: any) => ({
    id: String(r.id),
    action: r.accion,
    userId: String(r.id),
    userEmail: r.usuarioEmail,
    timestamp: new Date(r.fechaHora).toLocaleString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    ip: r.direccionIP,
  }));
}

export async function getBackups(): Promise<BackupInfo[]> {
  const { data } = await api.get<{ ok: boolean; data: any[] }>("/respaldos");
  if (!data.ok) throw new Error("Error al obtener respaldos");
  return data.data.map((r: any) => ({
    id: r.id,
    createdAt: new Date(r.createdAt).toLocaleString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    scheduledAt: "",
    status: r.status,
    sizeKb: r.sizeKb,
  }));
}

export async function createBackup(): Promise<BackupInfo> {
  const { data } = await api.post<{ ok: boolean; data: any }>("/respaldos");
  if (!data.ok) throw new Error("Error al crear respaldo");
  const r = data.data;
  return {
    id: r.id,
    createdAt: new Date(r.createdAt).toLocaleString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    scheduledAt: "",
    status: r.status,
    sizeKb: r.sizeKb,
  };
}

export async function downloadBackup(id: string): Promise<void> {
  const token = localStorage.getItem("sicad_token");
  const response = await fetch(`${import.meta.env.VITE_API_URL}/respaldos/download/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Error al descargar respaldo");
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = id;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

export async function restoreBackup(file: File): Promise<void> {
  const token = localStorage.getItem("sicad_token");
  const formData = new FormData();
  formData.append("backup", file);
  const response = await fetch(`${import.meta.env.VITE_API_URL}/respaldos/restore`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const json = await response.json();
  if (!json.ok) throw new Error(json.message || "Error al restaurar respaldo");
}

export default {
  getSystemSettings,
  updateSystemSettings,
  getRoles,
  getAuditLogs,
  getBackups,
  createBackup,
  downloadBackup,
  restoreBackup,
};
