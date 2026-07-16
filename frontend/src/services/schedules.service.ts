import api from "./api";

export interface Schedule {
  id: string;
  employeeCode: string;
  employeeName: string;
  day: "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado";
  startTime: string;
  endTime: string;
  period: string;
  periodId?: number;
  status: "Activo" | "Inactivo";
}

export interface CreateSchedulePayload {
  usuarioId: number;
  diaSemana: string;
  periodosIds: number[];
  periodoAcademico?: string;
}

export interface Periodo {
  id: number;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  duracion: number;
  activo: boolean;
}

const mapDayToFrontend = (day: string): "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado" => {
  if (day === "Miercoles") return "Miércoles";
  if (day === "Sabado") return "Sábado";
  return day as any;
};

const mapDayToBackend = (day: string): string => {
  if (day === "Miércoles") return "Miercoles";
  if (day === "Sábado") return "Sabado";
  return day;
};

export async function getSchedules(): Promise<Schedule[]> {
  const { data } = await api.get<{ ok: boolean; data: any[] }>("/horarios/empleados");
  if (!data.ok) {
    throw new Error("Error al obtener la lista de horarios");
  }

  const schedules: Schedule[] = [];
  data.data.forEach((emp) => {
    if (emp.horariosAsignados && Array.isArray(emp.horariosAsignados)) {
      emp.horariosAsignados.forEach((h: any) => {
        schedules.push({
          id: String(h.id),
          employeeCode: emp.codigo || `CC-${String(emp.id).padStart(3, "0")}`,
          employeeName: emp.nombre,
          day: mapDayToFrontend(h.diaSemana),
          startTime: h.periodo?.horaInicio || "",
          endTime: h.periodo?.horaFin || "",
          period: h.periodo?.nombre || "",
          periodId: h.periodo?.id,
          status: emp.activo ? "Activo" : "Inactivo",
        });
      });
    }
  });
  return schedules;
}

export async function createSchedule(payload: CreateSchedulePayload): Promise<any> {
  const { data } = await api.post<{ ok: boolean; data: any }>("/horarios/asignar", {
    usuarioId: payload.usuarioId,
    diaSemana: mapDayToBackend(payload.diaSemana),
    periodosIds: payload.periodosIds,
    periodoAcademico: payload.periodoAcademico,
  });
  if (!data.ok) {
    throw new Error("Error al asignar horarios");
  }
  return data.data;
}

export async function deleteSchedule(id: string): Promise<void> {
  const { data } = await api.delete<{ ok: boolean }>(`/horarios/${id}`);
  if (!data.ok) {
    throw new Error("Error al eliminar el periodo de horario");
  }
}

export async function getPeriods(): Promise<Periodo[]> {
  const { data } = await api.get<{ ok: boolean; data: Periodo[] }>("/horarios/periodos");
  if (!data.ok) {
    throw new Error("Error al obtener la lista de periodos");
  }
  return data.data;
}

export default {
  getSchedules,
  createSchedule,
  deleteSchedule,
  getPeriods,
};
