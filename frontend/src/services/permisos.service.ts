import api from "./api";

export interface PermisoBackend {
  id: number;
  usuarioId: number;
  tipoPermisoId: number;
  fecha: string;
  motivo: string;
  estado: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  observacion?: string | null;
  adjuntoUrl?: string | null;
  revisadoPor?: number | null;
  fechaRevision?: string | null;
  createdAt: string;
  updatedAt: string;
  usuario?: { id: number; nombre: string; codigo?: string; ci?: string };
  tipoPermiso?: { nombre: string };
  periodos?: { periodo: { id: number; nombre: string; horaInicio: string; horaFin: string } }[];
}

export interface CreatePermisoPayload {
  usuarioId: number;
  tipoPermisoNombre: string;
  fecha: string;
  motivo: string;
  periodosIds: number[];
  estado?: string;
  observacion?: string;
}

export async function getPermisos(): Promise<PermisoBackend[]> {
  const { data } = await api.get<{ ok: boolean; data: PermisoBackend[] }>("/permisos");
  if (!data.ok) throw new Error("Error al obtener permisos");
  return data.data;
}

export async function createPermiso(payload: CreatePermisoPayload): Promise<PermisoBackend> {
  const { data } = await api.post<{ ok: boolean; data: PermisoBackend }>("/permisos", payload);
  if (!data.ok) throw new Error("Error al crear permiso");
  return data.data;
}

export interface CambiarEstadoPayload {
  estado: "APROBADO" | "RECHAZADO";
  revisadoPor?: number;
}

export async function getTipoPermisos(): Promise<{ id: number; nombre: string }[]> {
  const { data } = await api.get<{ ok: boolean; data: { id: number; nombre: string }[] }>("/permisos/tipos");
  if (!data.ok) throw new Error("Error al obtener tipos de permiso");
  return data.data;
}

export async function cambiarEstadoPermiso(
  id: number,
  payload: CambiarEstadoPayload
): Promise<PermisoBackend> {
  const { data } = await api.patch<{ ok: boolean; data: PermisoBackend }>(
    `/permisos/${id}/estado`,
    payload
  );
  if (!data.ok) throw new Error("Error al cambiar estado del permiso");
  return data.data;
}
