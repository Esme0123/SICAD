import api from "./api";

export type AttendanceStatus = "Puntual" | "Tardanza" | "Ausente";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  name: string;
  code: string;
  ci: string;
  date: string;
  period: string;
  time: string;
  status: AttendanceStatus;
}

export interface RegisterAttendancePayload {
  employeeId: string;
  periodId: string;
  qrToken: string;
}

export interface AttendanceFilters {
  date?: string;
  employeeId?: string;
  period?: string;
  status?: AttendanceStatus;
  page?: number;
  perPage?: number;
}

export interface AttendanceSummary {
  total: number;
  punctual: number;
  late: number;
  absent: number;
  rate: number;
}

interface AsistenciaBackend {
  id: number;
  usuarioId: number;
  fecha: string;
  horaEntrada: string;
  horaSalida?: string | null;
  observacion?: string | null;
  usuario?: { id: number; nombre: string; codigo?: string; ci?: string };
}

export async function getAttendanceHistory(filters?: AttendanceFilters): Promise<AttendanceRecord[]> {
  const params: Record<string, string> = {};
  if (filters?.date) params.fecha = filters.date;
  if (filters?.employeeId) params.usuarioId = filters.employeeId;

  const { data } = await api.get<{ ok: boolean; data: AsistenciaBackend[] }>("/asistencia", { params });
  if (!data.ok) throw new Error("Error al obtener historial de asistencia");

  return data.data.map((a) => {
    const entrada = new Date(a.horaEntrada);
    const entradaStr = entrada.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
    const salidaStr = a.horaSalida
      ? new Date(a.horaSalida).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })
      : null;

    let status: AttendanceStatus = "Puntual";
    if (a.observacion && a.observacion.startsWith("Llegó")) {
      status = "Tardanza";
    } else if (!a.horaSalida) {
      status = "Ausente";
    }

    const dateStr = entrada.toLocaleDateString("es-BO", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });

    return {
      id: String(a.id),
      employeeId: String(a.usuarioId),
      name: a.usuario?.nombre || "",
      code: a.usuario?.codigo || `CC-${String(a.usuarioId).padStart(3, "0")}`,
      ci: a.usuario?.ci || "",
      date: dateStr,
      period: entradaStr + (salidaStr ? `–${salidaStr}` : ""),
      time: entradaStr,
      status,
    };
  });
}

export async function registerAttendance(_payload: RegisterAttendancePayload): Promise<AttendanceRecord> {
  return Promise.reject(new Error("Attendance service not connected to backend yet"));
}

export async function getTodaySummary(): Promise<AttendanceSummary> {
  return Promise.reject(new Error("Attendance service not connected to backend yet"));
}

export async function getCurrentQRToken(): Promise<{ token: string; expiresIn: number }> {
  return Promise.reject(new Error("Attendance service not connected to backend yet"));
}

export default {
  getAttendanceHistory,
  registerAttendance,
  getTodaySummary,
  getCurrentQRToken,
};
