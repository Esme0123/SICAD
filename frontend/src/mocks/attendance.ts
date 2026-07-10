/**
 * SICAD — Mock de Asistencias
 * Datos de prueba para historial de asistencias y QR
 * En producción estos datos vendrán de attendance.service.ts → API
 */

export type AttendanceStatus = "Puntual" | "Tardanza" | "Ausente";

export interface AttendanceRecord {
  name: string;
  code: string;
  date: string;
  period: string;
  time: string;
  status: AttendanceStatus;
}

export interface DaySummary {
  label: string;
  value: string;
}

export interface ServerStatus {
  label: string;
  ok: boolean;
}

export const MOCK_ATTENDANCE_HISTORY: AttendanceRecord[] = [
  { name: "Carlos Mamani Quispe", code: "CC-001", date: "07/07/2026", period: "08:15–09:15", time: "08:18", status: "Puntual"  },
  { name: "Ana Flores Mendoza",   code: "CC-002", date: "07/07/2026", period: "09:15–10:15", time: "09:24", status: "Tardanza" },
  { name: "Luis Quispe Torrez",   code: "CC-003", date: "07/07/2026", period: "10:15–11:15", time: "10:15", status: "Puntual"  },
  { name: "Jorge Condori López",  code: "CC-005", date: "07/07/2026", period: "08:15–09:15", time: "—",     status: "Ausente"  },
  { name: "Sofía Vargas Choque",  code: "CC-006", date: "07/07/2026", period: "11:15–12:15", time: "11:17", status: "Puntual"  },
  { name: "Diego Mamani Cruz",    code: "CC-007", date: "07/07/2026", period: "10:15–11:15", time: "10:15", status: "Puntual"  },
  { name: "Carlos Mamani Quispe", code: "CC-001", date: "06/07/2026", period: "09:15–10:15", time: "09:18", status: "Puntual"  },
  { name: "María Torres García",  code: "CC-004", date: "06/07/2026", period: "08:15–09:15", time: "08:36", status: "Tardanza" },
  { name: "Patricia Rojas Lima",  code: "CC-008", date: "06/07/2026", period: "07:15–08:15", time: "07:15", status: "Puntual"  },
];

export const MOCK_QR_SERVER_STATUS: ServerStatus[] = [
  { label: "Servidor API",  ok: true },
  { label: "Base de datos", ok: true },
  { label: "Motor QR",      ok: true },
  { label: "Red local",     ok: true },
];

export const MOCK_QR_DAY_SUMMARY: DaySummary[] = [
  { label: "Total registradas", value: "47" },
  { label: "Pendientes",        value: "5"  },
  { label: "Ausencias",         value: "2"  },
];

export const MOCK_QR_PERIODS = [
  { label: "07:15–08:15", done: true,  active: false },
  { label: "08:15–09:15", done: true,  active: false },
  { label: "09:15–10:15", done: true,  active: false },
  { label: "10:15–11:15", done: false, active: true  },
  { label: "11:15–12:15", done: false, active: false },
];

export const MOCK_QR_LAST_ATTENDANCE = {
  name:   "Ana Flores Mendoza",
  period: "10:15–11:15",
  time:   "Hace 2 min",
};
