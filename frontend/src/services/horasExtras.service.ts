import api from "./api";

export type EstadoSolicitudHorasExtras = "PENDIENTE" | "APROBADO" | "RECHAZADO";

export interface BloqueSolicitud {
  id: number;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  duracion: number;
}

export interface SolicitudHorasExtras {
  id: number;
  empleadoId: number;
  fecha: string;
  bloques: BloqueSolicitud[];
  horasTotales: number;
  observacion?: string | null;
  estado: EstadoSolicitudHorasExtras;
  aprobadoPor?: number | null;
  motivoRechazo?: string | null;
  fechaRespuesta?: string | null;
  createdAt: string;
  updatedAt?: string;
  empleado?: { id: number; nombre: string; codigo?: string; ci?: string; email?: string };
}

export interface FiltrosSolicitudesAdmin {
  estado?: string;
  fecha?: string;
  q?: string;
}

export async function getSolicitudesAdmin(filtros?: FiltrosSolicitudesAdmin): Promise<SolicitudHorasExtras[]> {
  const { data } = await api.get<{ ok: boolean; data: SolicitudHorasExtras[] }>("/horas-extras/admin", {
    params: filtros,
  });
  if (!data.ok) throw new Error("Error al obtener solicitudes de horas extras");
  return data.data;
}

export async function aprobarSolicitud(id: number, aprobadoPor?: number): Promise<SolicitudHorasExtras> {
  const { data } = await api.put<{ ok: boolean; data: SolicitudHorasExtras }>(
    `/horas-extras/admin/${id}/aprobar`,
    { aprobadoPor }
  );
  if (!data.ok) throw new Error("Error al aprobar la solicitud");
  return data.data;
}

export async function rechazarSolicitud(
  id: number,
  motivo?: string,
  aprobadoPor?: number
): Promise<SolicitudHorasExtras> {
  const { data } = await api.put<{ ok: boolean; data: SolicitudHorasExtras }>(
    `/horas-extras/admin/${id}/rechazar`,
    { motivo, aprobadoPor }
  );
  if (!data.ok) throw new Error("Error al rechazar la solicitud");
  return data.data;
}

export async function getBloquesDisponibles(fecha: string): Promise<
  (BloqueSolicitud & { estado: "LIBRE" | "ASIGNADO" })[]
> {
  const { data } = await api.get<{ ok: boolean; data: Array<BloqueSolicitud & { estado: "LIBRE" | "ASIGNADO" }> }>(
    "/horas-extras/bloques",
    { params: { fecha } }
  );
  if (!data.ok) throw new Error("Error al obtener bloques disponibles");
  return data.data;
}