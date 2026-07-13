/**
 * SICAD — Auth Service
 * Integración con Express + Prisma backend
 */

import api from "./api";

// ── Interfaces ────────────────────────────────────────────

export interface LoginPayload {
  email:    string;
  password: string;
}

/** Shape exacta que devuelve el backend */
export interface UsuarioBackend {
  id:        number;
  nombre:    string;
  email:     string;
  rol:       "ADMIN" | "EMPLEADO";
  horasBase: number;
}

/** Shape normalizada para el contexto / store del frontend */
export interface UserProfile {
  id:    string;
  name:  string;
  email: string;
  role:  string;
}

/** Error tipado que lanza el servicio cuando el backend responde con ok:false */
export class LoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginError";
  }
}

// ── Helpers ───────────────────────────────────────────────

/** Normaliza el usuario del backend al shape del frontend */
function mapUsuario(u: UsuarioBackend): UserProfile {
  return {
    id:    String(u.id),
    name:  u.nombre,
    email: u.email,
    role:  u.rol === "ADMIN" ? "Administrador" : "Empleado",
  };
}

// ── Service functions ──────────────────────────────────────

/**
 * Autentica al usuario con email y contraseña.
 * POST /api/auth/login
 * Devuelve { token, user } ya normalizados para el frontend.
 */
export async function login(
  payload: LoginPayload
): Promise<{ token: string; user: UserProfile }> {
  const { data } = await api.post<{
    ok: boolean;
    token: string;
    usuario: UsuarioBackend;
    message?: string;
  }>("/auth/login", payload);

  if (!data.ok) {
    throw new LoginError(data.message ?? "Credenciales incorrectas");
  }

  return {
    token: data.token,
    user:  mapUsuario(data.usuario),
  };
}

/**
 * Cierra sesión localmente (JWT stateless — no hay endpoint de logout en el backend).
 */
export async function logout(): Promise<void> {
  localStorage.removeItem("sicad_token");
}

/**
 * Retorna el perfil del usuario autenticado.
 * GET /api/auth/me
 */
export async function getProfile(): Promise<UserProfile> {
  const { data } = await api.get<{ ok: boolean; usuario: UsuarioBackend }>("/auth/me");
  return mapUsuario(data.usuario);
}

export default { login, logout, getProfile };
