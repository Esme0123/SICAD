/**
 * SICAD — Settings Service
 * Placeholder para integración con Express + Prisma backend
 *
 * TODO: Reemplazar las funciones stub con llamadas reales a `api`
 */

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

// ── Service functions ──────────────────────────────────────

/**
 * Obtiene lista de usuarios del sistema.
 * TODO: GET /api/settings/users
 */
export async function getSystemUsers(): Promise<SystemUser[]> {
  return Promise.reject(new Error("Settings service not connected to backend yet"));
}

/**
 * Crea un nuevo usuario del sistema.
 * TODO: POST /api/settings/users
 */
export async function createSystemUser(
  _payload: CreateUserPayload
): Promise<SystemUser> {
  return Promise.reject(new Error("Settings service not connected to backend yet"));
}

/**
 * Elimina un usuario del sistema.
 * TODO: DELETE /api/settings/users/:id
 */
export async function deleteSystemUser(_id: string): Promise<void> {
  return Promise.reject(new Error("Settings service not connected to backend yet"));
}

/**
 * Obtiene la definición de roles y permisos.
 * TODO: GET /api/settings/roles
 */
export async function getRoles(): Promise<RoleDefinition[]> {
  return Promise.reject(new Error("Settings service not connected to backend yet"));
}

/**
 * Obtiene el log de auditoría del sistema.
 * TODO: GET /api/settings/audit-logs?page=1
 */
export async function getAuditLogs(_page = 1): Promise<AuditLog[]> {
  return Promise.reject(new Error("Settings service not connected to backend yet"));
}

/**
 * Lista los respaldos disponibles.
 * TODO: GET /api/settings/backups
 */
export async function getBackups(): Promise<BackupInfo[]> {
  return Promise.reject(new Error("Settings service not connected to backend yet"));
}

/**
 * Inicia un respaldo manual.
 * TODO: POST /api/settings/backups
 */
export async function createBackup(): Promise<BackupInfo> {
  return Promise.reject(new Error("Settings service not connected to backend yet"));
}

export default {
  getSystemUsers,
  createSystemUser,
  deleteSystemUser,
  getRoles,
  getAuditLogs,
  getBackups,
  createBackup,
};
