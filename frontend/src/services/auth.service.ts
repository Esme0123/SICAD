/**
 * SICAD — Auth Service
 * Placeholder para integración con Express + Prisma backend
 *
 * TODO: Reemplazar las funciones stub con llamadas reales a `api`
 */

import api from "./api";

// ── Interfaces ────────────────────────────────────────────

export interface LoginPayload {
  email:    string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user:  UserProfile;
}

export interface UserProfile {
  id:    string;
  name:  string;
  email: string;
  role:  "Administrador" | "Coordinador" | "Auxiliar";
}

// ── Service functions ──────────────────────────────────────

/**
 * Autentica al usuario con email y contraseña.
 * TODO: POST /api/auth/login
 */
export async function login(_payload: LoginPayload): Promise<LoginResponse> {
  // Stub — reemplazar con:
  // const { data } = await api.post<LoginResponse>("/auth/login", payload);
  // return data;
  return Promise.reject(new Error("Auth service not connected to backend yet"));
}

/**
 * Cierra sesión e invalida el token en el servidor.
 * TODO: POST /api/auth/logout
 */
export async function logout(): Promise<void> {
  // Stub — reemplazar con:
  // await api.post("/auth/logout");
  localStorage.removeItem("sicad_token");
}

/**
 * Retorna el perfil del usuario autenticado.
 * TODO: GET /api/auth/me
 */
export async function getProfile(): Promise<UserProfile> {
  // Stub — reemplazar con:
  // const { data } = await api.get<UserProfile>("/auth/me");
  // return data;
  return Promise.reject(new Error("Auth service not connected to backend yet"));
}

export default { login, logout, getProfile };
