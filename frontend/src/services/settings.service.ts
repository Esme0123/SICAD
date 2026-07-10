import { SystemSettings, MOCK_SYSTEM_SETTINGS } from "@/mocks/settings";

const STORAGE_KEY = "sicad_system_settings";

function getStoredSettings(): SystemSettings {
  if (typeof window === "undefined") return MOCK_SYSTEM_SETTINGS;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_SYSTEM_SETTINGS));
    return MOCK_SYSTEM_SETTINGS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return MOCK_SYSTEM_SETTINGS;
  }
}

function saveSettings(settings: SystemSettings) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
}

export async function getSystemSettings(): Promise<SystemSettings> {
  return getStoredSettings();
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const current = getStoredSettings();
  const updated = { ...current, ...settings };
  saveSettings(updated);
  return updated;
}

// ── Interfaces ────────────────────────────────────────────

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

// ── Placeholder mocks for other functions (for compatibility) ──────────────────────

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
