/**
 * SICAD — Mock de Permisos y Configuración
 * Datos de prueba para la página de configuración (usuarios, roles, auditoría)
 * En producción estos datos vendrán de settings.service.ts → API
 */

import { COLORS } from "@/theme/colors";

export interface SystemUser {
  name:   string;
  email:  string;
  role:   string;
  active: boolean;
}

export interface Role {
  name:  string;
  perms: string[];
  col:   string;
}

export interface AuditLog {
  action: string;
  user:   string;
  time:   string;
  ip:     string;
}

export interface BackupInfo {
  label:  string;
  value:  string;
  status: string;
  ok:     boolean | null;
}

export const MOCK_SYSTEM_USERS: SystemUser[] = [
  { name: "Admin UCB",      email: "admin@ucb.edu.bo", role: "Administrador", active: true  },
  { name: "Aux. Sistemas",  email: "aux@ucb.edu.bo",   role: "Auxiliar",      active: true  },
  { name: "Coord. Cómputo", email: "coord@ucb.edu.bo", role: "Coordinador",   active: false },
];

export const MOCK_ROLES: Role[] = [
  {
    name:  "Administrador",
    perms: ["Ver todo", "Crear usuarios", "Editar configuración", "Exportar informes"],
    col:   COLORS.primary,
  },
  {
    name:  "Coordinador",
    perms: ["Ver reportes", "Gestionar empleados", "Exportar"],
    col:   COLORS.secondary,
  },
  {
    name:  "Auxiliar",
    perms: ["Ver historial", "Registrar asistencia"],
    col:   COLORS.success,
  },
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { action: "Login exitoso",      user: "admin@ucb.edu.bo",  time: "07/07/2026 10:32", ip: "192.168.1.5" },
  { action: "Empleado creado",    user: "admin@ucb.edu.bo",  time: "07/07/2026 09:15", ip: "192.168.1.5" },
  { action: "QR generado",        user: "Sistema",           time: "07/07/2026 10:15", ip: "localhost"   },
  { action: "Reporte exportado",  user: "coord@ucb.edu.bo",  time: "06/07/2026 16:45", ip: "192.168.1.8" },
  { action: "Configuración",      user: "admin@ucb.edu.bo",  time: "06/07/2026 09:00", ip: "192.168.1.5" },
];

export const MOCK_BACKUPS: BackupInfo[] = [
  { label: "Último respaldo",  value: "07/07/2026 02:00", status: "Exitoso",    ok: true },
  { label: "Próximo respaldo", value: "08/07/2026 02:00", status: "Programado", ok: null },
];
