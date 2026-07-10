/**
 * SICAD — Mock de Reportes
 * Datos de prueba para la página de reportes y estadísticas
 * En producción estos datos vendrán de report.service.ts → API
 */

import { COLORS } from "@/theme/colors";

export interface DailyReportPoint {
  d: string;
  p: number;
  a: number;
}

export interface PieSegment {
  name:  string;
  value: number;
  col:   string;
}

export interface PeriodCompliancePoint {
  p:   string;
  pct: number;
}

export interface ReportSummary {
  label: string;
  value: string;
  sub:   string;
  col:   string;
}

export const MOCK_DAILY_REPORT: DailyReportPoint[] = [
  { d: "Lun 30", p: 10, a: 2 },
  { d: "Mar 1",  p: 9,  a: 3 },
  { d: "Mié 2",  p: 11, a: 1 },
  { d: "Jue 3",  p: 8,  a: 4 },
  { d: "Vie 4",  p: 12, a: 0 },
  { d: "Lun 7",  p: 6,  a: 2 },
];

export const MOCK_PIE_DATA: PieSegment[] = [
  { name: "Puntual",  value: 68, col: COLORS.success },
  { name: "Tardanza", value: 22, col: COLORS.warning },
  { name: "Ausente",  value: 10, col: COLORS.danger  },
];

export const MOCK_PERIOD_COMPLIANCE: PeriodCompliancePoint[] = [
  { p: "07:15", pct: 92 },
  { p: "08:15", pct: 85 },
  { p: "09:15", pct: 96 },
  { p: "10:15", pct: 78 },
  { p: "11:15", pct: 88 },
  { p: "12:15", pct: 72 },
  { p: "13:15", pct: 65 },
  { p: "14:15", pct: 80 },
  { p: "15:15", pct: 91 },
];

export const MOCK_REPORT_SUMMARY: ReportSummary[] = [
  { label: "Cumplimiento general", value: "87%",  sub: "Este mes",          col: COLORS.success  },
  { label: "Total asistencias",    value: "342",  sub: "Julio 2026",        col: COLORS.primary  },
  { label: "Promedio diario",      value: "11.4", sub: "Registros por día", col: COLORS.warning  },
];
