/**
 * SICAD — Schedule Service
 * Placeholder para integración con Express + Prisma backend
 *
 * TODO: Reemplazar las funciones stub con llamadas reales a `api`
 */

// ── Interfaces ────────────────────────────────────────────

export interface TimeSlot {
  id:        number;
  startTime: string; // "07:15"
  endTime:   string; // "08:15"
  label:     string; // "07:15 – 08:15"
}

export interface EmployeeSchedule {
  employeeId: string;
  slotIds:    number[];
  days:       string[]; // ["Lun", "Mar", ...]
}

export interface AssignSchedulePayload {
  employeeId: string;
  slotIds:    number[];
}

// ── Service functions ──────────────────────────────────────

/**
 * Obtiene todos los periodos disponibles del sistema.
 * TODO: GET /api/schedules/slots
 */
export async function getTimeSlots(): Promise<TimeSlot[]> {
  return Promise.reject(new Error("Schedule service not connected to backend yet"));
}

/**
 * Obtiene la asignación de periodos de un empleado.
 * TODO: GET /api/schedules/employee/:employeeId
 */
export async function getEmployeeSchedule(
  _employeeId: string
): Promise<EmployeeSchedule> {
  return Promise.reject(new Error("Schedule service not connected to backend yet"));
}

/**
 * Asigna periodos a un empleado.
 * TODO: POST /api/schedules/assign
 */
export async function assignSchedule(
  _payload: AssignSchedulePayload
): Promise<EmployeeSchedule> {
  return Promise.reject(new Error("Schedule service not connected to backend yet"));
}

/**
 * Obtiene el periodo activo en este momento.
 * TODO: GET /api/schedules/active
 */
export async function getActivePeriod(): Promise<TimeSlot | null> {
  return Promise.reject(new Error("Schedule service not connected to backend yet"));
}

export default {
  getTimeSlots,
  getEmployeeSchedule,
  assignSchedule,
  getActivePeriod,
};
