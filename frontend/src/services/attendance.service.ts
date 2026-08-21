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
  horaEntrada: string;
  horaSalida: string | null;
  status: AttendanceStatus;
  academicPeriod?: string;
  periodoAcademico?: string;
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
  periodo?: string | null;
  estado?: string | null;
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

    const status: AttendanceStatus = a.estado === "TARDANZA" ? "Tardanza" : "Puntual";

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
      period: a.periodo || (salidaStr ? `${entradaStr}–${salidaStr}` : entradaStr),
      time: entradaStr,
      horaEntrada: entradaStr,
      horaSalida: salidaStr,
      status,
    };
  });
}

export async function registerAttendance(_payload: RegisterAttendancePayload): Promise<AttendanceRecord> {
  return Promise.reject(new Error("Attendance service not connected to backend yet"));
}

export interface EditarAsistenciaPayload {
  horaEntrada?: string | null;
  horaSalida?: string | null;
  motivoEdicion: string;
  motivo?: string;
}

export interface EditarAsistenciaResult {
  id: number;
  estado: string;
  minutosRetraso: number | null;
  horaEntradaStr: string | null;
  horaSalidaStr: string | null;
}

/**
 * PUT /api/asistencia/:id/editar — Edición manual de una marcación
 * Exclusivo para el rol ADMIN (backend valida rol + autenticación).
 */
export async function editarAsistenciaAdmin(
  id: number | string,
  payload: EditarAsistenciaPayload
): Promise<EditarAsistenciaResult> {
  const { data } = await api.put<{ ok: boolean; message: string; data: EditarAsistenciaResult }>(
    `/asistencia/${id}/editar`,
    payload
  );
  if (!data.ok) throw new Error(data.message || "Error al editar la marcación");
  return data.data;
}

/**
 * DELETE /api/asistencia/:id — Eliminación manual de una marcación
 * Exclusivo para el rol ADMIN (backend valida rol + autenticación).
 */
export async function eliminarAsistenciaAdmin(id: number | string): Promise<void> {
  const { data } = await api.delete<{ ok: boolean; message: string }>(`/asistencia/${id}`);
  if (!data.ok) throw new Error(data.message || "Error al eliminar la marcación");
}

export async function getTodaySummary(): Promise<AttendanceSummary> {
  return Promise.reject(new Error("Attendance service not connected to backend yet"));
}

export async function getCurrentQRToken(): Promise<{ token: string; expiresIn: number }> {
  return Promise.reject(new Error("Attendance service not connected to backend yet"));
}

export type EstadoCumplimiento = "En Riesgo" | "En Progreso" | "Cumplido" | "Superado";

export interface DesgloseDiario {
  diaNombre: string;
  fecha: string;
  estado?: string | null;
  horaEntrada: string;
  horaSalida: string;
  subtotalHoras: number;
  acumuladoHoras: number;
  turnosCount: number;
  bloquesDia?: string;
  minutosRetraso?: number;
}

export interface CumplimientoSemanalEmpleado {
  id: number;
  nombre: string;
  codigo: string;
  ci: string;
  horasContratadas: number;
  horasTrabajadas: number;
  porcentajeCumplimiento: number;
  estadoCumplimiento: EstadoCumplimiento;
  bloquesCumplidos: number;
  bloquesProgramados: number;
  minutosRetraso: number;
  desgloseDiario: DesgloseDiario[];
}

export interface CumplimientoSemanalResumen {
  semana: { fechaInicio: string; fechaFin: string; label: string };
  totalEmpleados: number;
  cumplidos: number;
  enProgreso: number;
  enRiesgo: number;
  promedioHoras: number;
}

export interface CumplimientoSemanalResponse {
  data: CumplimientoSemanalEmpleado[];
  resumen: CumplimientoSemanalResumen;
}

export interface CumplimientoSemanalQuery {
  fechaInicio: string;
  fechaFin: string;
  horasContratadas?: string;
  periodoAcademico?: string;
  mensual?: boolean;
}

export async function getCumplimientoSemanal(query: CumplimientoSemanalQuery): Promise<CumplimientoSemanalResponse> {
  const params: Record<string, string> = {
    fechaInicio: query.fechaInicio,
    fechaFin: query.fechaFin,
    horasContratadas: query.horasContratadas ?? "todas",
  };
  if (query.periodoAcademico) params.periodoAcademico = query.periodoAcademico;
  if (query.mensual) params.mensual = "true";

  const { data } = await api.get<{ ok: boolean; data: CumplimientoSemanalEmpleado[]; resumen: CumplimientoSemanalResumen }>(
    "/asistencia/cumplimiento-semanal",
    { params }
  );
  if (!data.ok) throw new Error("Error al obtener el cumplimiento semanal");
  return { data: data.data, resumen: data.resumen };
}

export default {
  getAttendanceHistory,
  registerAttendance,
  getTodaySummary,
  getCurrentQRToken,
};
