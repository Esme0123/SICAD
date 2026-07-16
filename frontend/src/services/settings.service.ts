import api from "./api";

export interface SystemSettings {
  toleranceTime: number;
  qrDuration: number;
  openingHour: string;
  closingHour: string;
  exportFormat: "PDF" | "Excel" | "CSV";
  institutionName: string;
}

export type UserRole = "Administrador" | "Coordinador" | "Auxiliar";

export interface SystemUser {
  id:     string;
  name:   string;
  email:  string;
  role:   UserRole;
  active: boolean;
}

export interface CreateUserPayload {
  name:     string;
  email:    string;
  password: string;
  role:     UserRole;
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

// ── Placeholder for users, roles, backups (no backend yet) ─────

export async function getSystemUsers(): Promise<SystemUser[]> {
  return [
    { id: "1", name: "Admin UCB", email: "admin@ucb.edu.bo", role: "Administrador", active: true },
    { id: "2", name: "Aux. Sistemas", email: "aux@ucb.edu.bo", role: "Auxiliar", active: true },
    { id: "3", name: "Coord. Cómputo", email: "coord@ucb.edu.bo", role: "Coordinador", active: false },
  ];
}

export async function createSystemUser(_payload: CreateUserPayload): Promise<SystemUser> {
  return { id: Math.random().toString(), ..._payload, active: true };
}

export async function deleteSystemUser(_id: string): Promise<void> {
  return;
}

export async function getRoles(): Promise<RoleDefinition[]> {
  return [
    { id: "1", name: "Administrador", permissions: ["Ver todo", "Crear usuarios", "Editar configuración", "Exportar informes"] },
    { id: "2", name: "Coordinador", permissions: ["Ver reportes", "Gestionar empleados", "Exportar"] },
    { id: "3", name: "Auxiliar", permissions: ["Ver historial", "Registrar asistencia"] },
  ];
}

// ── Auditoria API ─────────────────────────────────────────────

export async function getAuditLogs(_page = 1): Promise<AuditLog[]> {
  return [
    { id: "1", action: "Login exitoso", userId: "1", userEmail: "admin@ucb.edu.bo", timestamp: "07/07/2026 10:32", ip: "192.168.1.5" },
    { id: "2", action: "Empleado creado", userId: "1", userEmail: "admin@ucb.edu.bo", timestamp: "07/07/2026 09:15", ip: "192.168.1.5" },
    { id: "3", action: "QR generado", userId: "System", userEmail: "Sistema", timestamp: "07/07/2026 10:15", ip: "localhost" },
    { id: "4", action: "Reporte exportado", userId: "3", userEmail: "coord@ucb.edu.bo", timestamp: "06/07/2026 16:45", ip: "192.168.1.8" },
    { id: "5", action: "Configuración", userId: "1", userEmail: "admin@ucb.edu.bo", timestamp: "06/07/2026 09:00", ip: "192.168.1.5" },
  ];
}

export async function getBackups(): Promise<BackupInfo[]> {
  return [
    { id: "1", createdAt: "07/07/2026 02:00", scheduledAt: "07/07/2026 02:00", status: "success", sizeKb: 2048 },
    { id: "2", createdAt: "—", scheduledAt: "08/07/2026 02:00", status: "pending", sizeKb: 0 },
  ];
}

export async function createBackup(): Promise<BackupInfo> {
  return { id: Math.random().toString(), createdAt: new Date().toLocaleString(), scheduledAt: "", status: "success", sizeKb: 1024 };
}

export default {
  getSystemSettings,
  updateSystemSettings,
  getSystemUsers,
  createSystemUser,
  deleteSystemUser,
  getRoles,
  getAuditLogs,
  getBackups,
  createBackup,
};
