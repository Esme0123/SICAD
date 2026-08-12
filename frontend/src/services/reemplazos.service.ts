import api from "./api";

export type EstadoReemplazo = "PENDIENTE" | "ACEPTADO" | "RECHAZADO";

export interface BloqueReemplazo {
  id: number;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  duracion: number;
}

export interface EmpleadoRef {
  id: number;
  nombre: string;
  codigo?: string;
  ci?: string;
}

export interface SolicitudReemplazo {
  id: number;
  solicitanteId: number;
  reemplazanteId?: number | null;
  esAbierta: boolean;
  fecha: string;
  bloques: BloqueReemplazo[];
  horasTotales: number;
  comentario?: string | null;
  estado: EstadoReemplazo;
  fechaRespuesta?: string | null;
  createdAt: string;
  updatedAt?: string;
  solicitante?: EmpleadoRef;
  reemplazante?: EmpleadoRef | null;
}

export interface MisReemplazos {
  enviadas: SolicitudReemplazo[];
  recibidas: SolicitudReemplazo[];
}

export interface FiltrosReemplazosAdmin {
  estado?: string;
  fecha?: string;
  q?: string;
}

export async function getMisSolicitudes(): Promise<MisReemplazos> {
  const { data } = await api.get<{ ok: boolean; data: MisReemplazos }>("/reemplazos/mis-solicitudes");
  return data.data;
}

export async function getBloquesDelDia(fecha: string): Promise<BloqueReemplazo[]> {
  const { data } = await api.get<{ ok: boolean; data: BloqueReemplazo[] }>("/reemplazos/bloques", {
    params: { fecha },
  });
  return data.data;
}

export async function getEmpleadosReemplazo(): Promise<EmpleadoRef[]> {
  const { data } = await api.get<{ ok: boolean; data: EmpleadoRef[] }>("/reemplazos/empleados");
  return data.data;
}

export async function solicitarReemplazo(payload: {
  fecha: string;
  bloques: BloqueReemplazo[];
  esAbierta: boolean;
  reemplazanteId?: number;
  comentario?: string;
}): Promise<SolicitudReemplazo> {
  const { data } = await api.post<{ ok: boolean; data: SolicitudReemplazo }>("/reemplazos/solicitar", payload);
  if (!data.ok) throw new Error("Error al enviar la solicitud de reemplazo");
  return data.data;
}

export async function aceptarReemplazo(id: number): Promise<SolicitudReemplazo> {
  const { data } = await api.put<{ ok: boolean; data: SolicitudReemplazo }>(`/reemplazos/${id}/aceptar`);
  if (!data.ok) throw new Error("Error al aceptar el reemplazo");
  return data.data;
}

export async function rechazarReemplazo(id: number): Promise<SolicitudReemplazo> {
  const { data } = await api.put<{ ok: boolean; data: SolicitudReemplazo }>(`/reemplazos/${id}/rechazar`);
  if (!data.ok) throw new Error("Error al rechazar el reemplazo");
  return data.data;
}

export async function getReemplazosAdmin(filtros?: FiltrosReemplazosAdmin): Promise<SolicitudReemplazo[]> {
  const { data } = await api.get<{ ok: boolean; data: SolicitudReemplazo[] }>("/reemplazos/admin", {
    params: filtros,
  });
  if (!data.ok) throw new Error("Error al obtener el historial de reemplazos");
  return data.data;
}