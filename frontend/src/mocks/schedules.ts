/**
 * SICAD — Mock de Horarios / Periodos
 * Datos de prueba para asignación de periodos
 * En producción estos datos vendrán de schedule.service.ts → API
 */

export interface TimeSlot {
  id:    number;
  label: string;
}

export interface WeeklyAssignment {
  [day: string]: number[];
}

/** Genera los 14 slots horarios desde 07:15 hasta 21:15 */
const buildSlots = (): TimeSlot[] =>
  Array.from({ length: 14 }, (_, i) => {
    const sh = 7 + i;
    const eh = sh + 1;
    const f = (h: number, m: number) =>
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    return { id: i, label: `${f(sh, 15)} – ${f(eh, 15)}` };
  });

export const MOCK_TIME_SLOTS: TimeSlot[] = buildSlots();

export const MOCK_DEFAULT_SELECTED: number[] = [0, 1, 2, 4, 5, 8];

export const MOCK_WEEKLY_ASSIGNMENTS: WeeklyAssignment = {
  Lun: [0, 1, 4],
  Mar: [1, 2, 5],
  Mié: [0, 3, 4],
  Jue: [2, 4, 5],
  Vie: [1, 3],
  Sáb: [6],
};

export const MOCK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

export interface Schedule {
  id: string;
  employeeCode: string;
  employeeName: string;
  day: "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado";
  startTime: string;
  endTime: string;
  period: string;
  status: "Activo" | "Inactivo";
}

export const MOCK_SCHEDULES: Schedule[] = [
  { id: "SCH-001", employeeCode: "CC-001", employeeName: "Carlos Mamani Quispe", day: "Lunes", startTime: "07:15", endTime: "08:15", period: "Periodo 1", status: "Activo" },
  { id: "SCH-002", employeeCode: "CC-001", employeeName: "Carlos Mamani Quispe", day: "Lunes", startTime: "08:15", endTime: "09:15", period: "Periodo 2", status: "Activo" },
  { id: "SCH-003", employeeCode: "CC-002", employeeName: "Ana Flores Mendoza", day: "Martes", startTime: "08:15", endTime: "09:15", period: "Periodo 2", status: "Activo" },
  { id: "SCH-004", employeeCode: "CC-002", employeeName: "Ana Flores Mendoza", day: "Martes", startTime: "09:15", endTime: "10:15", period: "Periodo 3", status: "Activo" },
  { id: "SCH-005", employeeCode: "CC-003", employeeName: "Luis Quispe Torrez", day: "Miércoles", startTime: "10:15", endTime: "11:15", period: "Periodo 4", status: "Activo" },
  { id: "SCH-006", employeeCode: "CC-003", employeeName: "Luis Quispe Torrez", day: "Miércoles", startTime: "11:15", endTime: "12:15", period: "Periodo 5", status: "Activo" },
  { id: "SCH-007", employeeCode: "CC-004", employeeName: "María Torres García", day: "Jueves", startTime: "07:15", endTime: "08:15", period: "Periodo 1", status: "Inactivo" },
  { id: "SCH-008", employeeCode: "CC-005", employeeName: "Jorge Condori López", day: "Viernes", startTime: "13:15", endTime: "14:15", period: "Periodo 7", status: "Activo" },
  { id: "SCH-009", employeeCode: "CC-006", employeeName: "Sofía Vargas Choque", day: "Sábado", startTime: "09:15", endTime: "10:15", period: "Periodo 3", status: "Activo" },
];
