/**
 * SICAD — Mock del Dashboard
 * Datos de prueba para el panel principal
 * En producción estos datos vendrán de attendance.service.ts y employee.service.ts → API
 */

import { COLORS } from "@/theme/colors";

export interface AreaDataPoint {
  h: string;
  n: number;
}

export interface WeekDataPoint {
  d: string;
  p: number;
  a: number;
}

export interface ActivityItem {
  name:   string;
  action: string;
  period: string;
  t:      string;
  col:    string;
}

export interface StatCard {
  label: string;
  value: string;
  trend: string;
  col:   string;
}

export const MOCK_AREA_DATA: AreaDataPoint[] = [
  { h: "07:15", n: 2 },
  { h: "08:15", n: 5 },
  { h: "09:15", n: 4 },
  { h: "10:15", n: 8 },
  { h: "11:15", n: 6 },
  { h: "12:15", n: 3 },
  { h: "13:15", n: 5 },
  { h: "14:15", n: 7 },
  { h: "15:15", n: 4 },
  { h: "16:15", n: 3 },
];

export const MOCK_WEEK_DATA: WeekDataPoint[] = [
  { d: "Lun", p: 10, a: 2 },
  { d: "Mar", p: 9,  a: 3 },
  { d: "Mié", p: 11, a: 1 },
  { d: "Jue", p: 8,  a: 4 },
  { d: "Vie", p: 12, a: 0 },
];

export const MOCK_ACTIVITY: ActivityItem[] = [
  { name: "Ana Flores Mendoza",   action: "Asistencia registrada", period: "10:15–11:15", t: "hace 2 min",  col: COLORS.success },
  { name: "Carlos Mamani Quispe", action: "Asistencia registrada", period: "10:15–11:15", t: "hace 6 min",  col: COLORS.success },
  { name: "Luis Quispe Torrez",   action: "Llegada tardía",        period: "09:15–10:15", t: "hace 14 min", col: COLORS.warning },
  { name: "Sofía Vargas Choque",  action: "Asistencia registrada", period: "09:15–10:15", t: "hace 20 min", col: COLORS.success },
  { name: "Jorge Condori López",  action: "Ausencia detectada",    period: "08:15–09:15", t: "hace 1h",     col: COLORS.danger  },
];

export const MOCK_STATS: Omit<StatCard, "icon">[] = [
  { label: "Empleados registrados", value: "12",         trend: "+2 este mes",      col: COLORS.primary  },
  { label: "Periodo actual",        value: "10:15–11:15", trend: "En curso",         col: COLORS.warning  },
  { label: "Próximo periodo",       value: "11:15–12:15", trend: "42 min",           col: COLORS.secondary},
  { label: "Asistencias hoy",       value: "47",          trend: "87% cumplimiento", col: COLORS.success  },
];
