import api from "./api";

export interface SystemSettings {
  toleranceTime: number;
  qrDuration: number;
  openingHour: string;
  closingHour: string;
  exportFormat: "PDF" | "Excel" | "CSV";
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
    exportFormat: (c.formatoExportacion ?? "xlsx").toUpperCase() === "XLSX" ? "Excel" : (c.formatoExportacion ?? "pdf").toUpperCase() === "PDF" ? "PDF" : "CSV",
    toleranceTime: c.tiempoTolerancia ?? 10,
    qrDuration: c.duracionQR ?? 30,
    openingHour: c.horaApertura ?? "06:00",
    closingHour: c.horaCierre ?? "22:00",
  } as SystemSettings;
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const body: Record<string, any> = {};
  if (settings.institutionName !== undefined) body.nombreInstitucion = settings.institutionName;
  if (settings.exportFormat !== undefined) body.formatoExportacion = settings.exportFormat.toLowerCase();
  if (settings.toleranceTime !== undefined) body.tiempoTolerancia = settings.toleranceTime;
  if (settings.qrDuration !== undefined) body.duracionQR = settings.qrDuration;
  if (settings.openingHour !== undefined) body.horaApertura = settings.openingHour;
  if (settings.closingHour !== undefined) body.horaCierre = settings.closingHour;

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

export default {
  getSystemSettings,
  updateSystemSettings,
  getRoles,
  getAuditLogs,
  getBackups,
  createBackup,
};
