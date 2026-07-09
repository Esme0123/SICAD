/**
 * SICAD — Report Service
 * Placeholder para integración con Express + Prisma backend
 *
 * TODO: Reemplazar las funciones stub con llamadas reales a `api`
 */

// ── Interfaces ────────────────────────────────────────────

export interface DailyReportParams {
  startDate: string;
  endDate:   string;
}

export interface DailyReportData {
  date:     string;
  present:  number;
  absent:   number;
  late:     number;
}

export interface ComplianceByPeriod {
  periodLabel: string;
  percentage:  number;
}

export interface ReportSummary {
  generalCompliance: number; // porcentaje
  totalAttendances:  number;
  dailyAverage:      number;
  month:             string;
}

export interface ExportFormat {
  format: "pdf" | "excel" | "csv";
}

// ── Service functions ──────────────────────────────────────

/**
 * Obtiene el reporte de asistencia diaria por rango de fechas.
 * TODO: GET /api/reports/daily?startDate=...&endDate=...
 */
export async function getDailyReport(
  _params: DailyReportParams
): Promise<DailyReportData[]> {
  return Promise.reject(new Error("Report service not connected to backend yet"));
}

/**
 * Obtiene el cumplimiento de asistencia por periodo horario.
 * TODO: GET /api/reports/by-period?month=...
 */
export async function getComplianceByPeriod(
  _month?: string
): Promise<ComplianceByPeriod[]> {
  return Promise.reject(new Error("Report service not connected to backend yet"));
}

/**
 * Obtiene el resumen general del mes.
 * TODO: GET /api/reports/summary?month=...
 */
export async function getReportSummary(
  _month?: string
): Promise<ReportSummary> {
  return Promise.reject(new Error("Report service not connected to backend yet"));
}

/**
 * Exporta el reporte en el formato indicado.
 * TODO: POST /api/reports/export
 */
export async function exportReport(
  _params: DailyReportParams & ExportFormat
): Promise<Blob> {
  return Promise.reject(new Error("Report service not connected to backend yet"));
}

export default {
  getDailyReport,
  getComplianceByPeriod,
  getReportSummary,
  exportReport,
};
