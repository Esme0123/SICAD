import api from "./api";

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: "ADMIN" | "EMPLEADO";
  horasBase: number;
  horasProgramadas: number;
}

export interface CreateUsuarioPayload {
  nombre: string;
  email: string;
  password?: string;
  rol: "ADMIN" | "EMPLEADO";
  horasBase: number;
}

/**
 * Obtiene todos los usuarios (empleados) del backend.
 * GET /api/usuarios
 */
export async function getUsuarios(): Promise<Usuario[]> {
  const { data } = await api.get<{ ok: boolean; data: Usuario[] }>("/usuarios");
  return data.data;
}

/**
 * Crea un nuevo usuario en el backend.
 * POST /api/usuarios
 */
export async function createUsuario(payload: CreateUsuarioPayload): Promise<Usuario> {
  // Si no se provee contraseña, se genera una por defecto
  const password = payload.password || (payload.email ? `${payload.email.split("@")[0]}123` : "sicad123");
  
  const { data } = await api.post<{ ok: boolean; data: Usuario }>("/usuarios", {
    ...payload,
    password,
  });
  return data.data;
}
