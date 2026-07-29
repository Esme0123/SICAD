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
  rol:       "ADMIN" | "COORDINADOR" | "KIOSKO" | "EMPLEADO";
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
  const roleMap: Record<string, string> = {
    ADMIN: "ADMIN",
    COORDINADOR: "COORDINADOR",
    KIOSKO: "KIOSKO",
    EMPLEADO: "EMPLEADO",
  };
  return {
    id:    String(u.id),
    name:  u.nombre,
    email: u.email,
    role:  roleMap[u.rol] ?? u.rol,
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
 * Solicita restablecimiento de contraseña.
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(email: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { data } = await api.post<{ ok: boolean; message: string }>(
      '/auth/forgot-password',
      { email }
    );
    return data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err.message || 'Error al solicitar restablecimiento';
    throw new Error(message);
  }
}

/**
 * Confirma el nuevo password con el token del correo.
 * POST /api/auth/reset-password
 */
export async function resetPassword(token: string, nuevaPassword: string): Promise<{ ok: boolean; message: string }> {
  const { data } = await api.post<{ ok: boolean; message: string }>(
    '/auth/reset-password',
    { token, nuevaPassword }
  );
  return data;
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

export default { login, logout, getProfile, forgotPassword, resetPassword };
