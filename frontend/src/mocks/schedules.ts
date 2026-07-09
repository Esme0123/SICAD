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
