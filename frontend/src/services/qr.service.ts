import api from "./api";

export interface QRTokenResponse {
  ok: boolean;
  token: string;
  expiresAt: number;      // Unix timestamp en segundos
  expiresAtISO: string;
}

export interface MarcarResponse {
  ok:       boolean;
  accion:   "ENTRADA" | "SALIDA";
  estado:   "A tiempo" | "Atraso" | "Salida" | "Fuera de horario";
  periodo:  string | null;
  mensaje:  string;
  empleado: { id: number; nombre: string };
  expired?: boolean;
}

/**
 * Genera un token QR temporal firmado desde el backend.
 * GET /api/qr/generate
 */
export async function generateQRToken(): Promise<QRTokenResponse> {
  const { data } = await api.get<QRTokenResponse>("/qr/generate");
  if (!data.ok) {
    throw new Error("Error al generar el token QR");
  }
  return data;
}

/**
 * Marca asistencia enviando el token QR escaneado.
 * POST /api/asistencias/marcar
 * El bearer token del empleado debe estar ya en el header (via api interceptor).
 */
export async function marcarAsistencia(token: string): Promise<MarcarResponse> {
  const { data } = await api.post<MarcarResponse>("/asistencias/marcar", { token });
  return data;
}

/**
 * Marca asistencia en la ruta móvil pública sin requerir JWT de sesión previo,
 * enviando el token QR y las credenciales del empleado.
 * POST /api/asistencias/marcar-movil
 */
export async function marcarAsistenciaMovil(
  qrToken: string,
  codigo: string,
  password: string
): Promise<MarcarResponse> {
  const { data } = await api.post<MarcarResponse>("/asistencias/marcar-movil", {
    qrToken,
    codigo,
    password,
  });
  return data;
}

export interface QrDashboardPeriod {
  id: number;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  estado: "PENDIENTE" | "ACTIVO" | "RETRASO" | "FINALIZADO";
  activo: boolean;
}

export interface QrDashboardData {
  totalAsistencias: number;
  atrasos: number;
  ultimoRegistro: {
    nombre: string;
    codigo: string;
    hora: string;
    estado: string;
  } | null;
  periodos: QrDashboardPeriod[];
}

export async function getQrDashboard(): Promise<QrDashboardData> {
  const { data } = await api.get<{ ok: boolean; data: QrDashboardData }>("/asistencias/qr-dashboard");
  if (!data.ok) throw new Error("Error al obtener dashboard QR");
  return data.data;
}

export interface EstadoHoyPeriodo {
  id: number;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
  totalEmpleados: number;
  marcaron: number;
  ausentes: number;
  estado: "PENDIENTE" | "ACTIVO" | "RETRASO" | "FINALIZADO";
}

export interface EstadoHoyResponse {
  periodos: EstadoHoyPeriodo[];
  totalAusentes: number;
}

export async function getEstadoHoy(): Promise<EstadoHoyResponse> {
  const { data } = await api.get<{ ok: boolean; data: EstadoHoyResponse }>("/asistencia/estado-hoy");
  if (!data.ok) throw new Error("Error al obtener estado del día");
  return data.data;
}

export default { generateQRToken, marcarAsistencia, marcarAsistenciaMovil, getQrDashboard, getEstadoHoy };
