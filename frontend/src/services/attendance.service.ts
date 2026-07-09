/**
 * SICAD — Attendance Service
 * Placeholder para integración con Express + Prisma backend
 *
 * TODO: Reemplazar las funciones stub con llamadas reales a `api`
 */

// ── Interfaces ────────────────────────────────────────────

export type AttendanceStatus = "Puntual" | "Tardanza" | "Ausente";

export interface AttendanceRecord {
  id:         string;
  employeeId: string;
  name:       string;
  code:       string;
  date:       string;
  period:     string;
  time:       string;
  status:     AttendanceStatus;
}

export interface RegisterAttendancePayload {
  employeeId: string;
  periodId:   string;
  qrToken:    string;
}

export interface AttendanceFilters {
  date?:       string;
  employeeId?: string;
  period?:     string;
  status?:     AttendanceStatus;
  page?:       number;
  perPage?:    number;
}

export interface AttendanceSummary {
  total:    number;
  punctual: number;
  late:     number;
  absent:   number;
  rate:     number; // porcentaje de cumplimiento
}

// ── Service functions ──────────────────────────────────────

/**
 * Lista historial de asistencias con filtros.
 * TODO: GET /api/attendance?date=...&employeeId=...
 */
export async function getAttendanceHistory(
  _filters?: AttendanceFilters
): Promise<AttendanceRecord[]> {
  return Promise.reject(new Error("Attendance service not connected to backend yet"));
}

/**
 * Registra una asistencia vía QR.
 * TODO: POST /api/attendance/register
 */
export async function registerAttendance(
  _payload: RegisterAttendancePayload
): Promise<AttendanceRecord> {
  return Promise.reject(new Error("Attendance service not connected to backend yet"));
}

/**
 * Retorna el resumen de asistencias del día.
 * TODO: GET /api/attendance/summary/today
 */
export async function getTodaySummary(): Promise<AttendanceSummary> {
  return Promise.reject(new Error("Attendance service not connected to backend yet"));
}

/**
 * Genera el token QR actual para el periodo activo.
 * TODO: GET /api/attendance/qr-token
 */
export async function getCurrentQRToken(): Promise<{ token: string; expiresIn: number }> {
  return Promise.reject(new Error("Attendance service not connected to backend yet"));
}

export default {
  getAttendanceHistory,
  registerAttendance,
  getTodaySummary,
  getCurrentQRToken,
};
