import api from "./api";

export interface AdminUser {
  id: number;
  nombre: string;
  email: string;
  rol: "ADMIN" | "COORDINADOR";
  activo: boolean;
  codigo?: string | null;
  ci?: string | null;
  celular?: string | null;
  createdAt?: string;
}

export interface CreateAdminUserPayload {
  nombre: string;
  email: string;
  password?: string;
  rol: "ADMIN" | "COORDINADOR";
}

export interface CreateAdminUserResult {
  user: AdminUser;
  defaultPassword?: string;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<{ ok: boolean; data: AdminUser[] }>("/usuarios-sistema");
  if (!data.ok) throw new Error("Error al obtener usuarios del sistema");
  return data.data;
}

export async function getAdminUserById(id: number): Promise<AdminUser> {
  const { data } = await api.get<{ ok: boolean; data: AdminUser }>(`/usuarios-sistema/${id}`);
  if (!data.ok) throw new Error("Error al obtener usuario");
  return data.data;
}

export async function createAdminUser(payload: CreateAdminUserPayload): Promise<CreateAdminUserResult> {
  const { data } = await api.post<{ ok: boolean; data: AdminUser; defaultPassword?: string }>("/usuarios-sistema", payload);
  if (!data.ok) throw new Error("Error al crear usuario");
  return { user: data.data, defaultPassword: data.defaultPassword };
}

export async function updateAdminUser(id: number, payload: Partial<AdminUser>): Promise<AdminUser> {
  const { data } = await api.patch<{ ok: boolean; data: AdminUser }>(`/usuarios-sistema/${id}`, payload);
  if (!data.ok) throw new Error("Error al actualizar usuario");
  return data.data;
}

export async function changeAdminUserPassword(id: number, password: string): Promise<void> {
  const { data } = await api.patch<{ ok: boolean }>(`/usuarios-sistema/${id}/password`, { password });
  if (!data.ok) throw new Error("Error al cambiar contraseña");
}

export async function deleteAdminUser(id: number): Promise<void> {
  const { data } = await api.delete<{ ok: boolean }>(`/usuarios-sistema/${id}`);
  if (!data.ok) throw new Error("Error al eliminar usuario");
}

export default {
  getAdminUsers,
  getAdminUserById,
  createAdminUser,
  updateAdminUser,
  changeAdminUserPassword,
  deleteAdminUser,
};
