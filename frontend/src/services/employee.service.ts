import api from "./api";
import axios from "axios";

const employeeApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

employeeApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("sicad_emp_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface LoginMovilPayload {
  codigo: string;
  password: string;
}

export interface EmployeeUserResponse {
  id: number;
  nombre: string;
  codigo: string;
  email: string;
  ci: string | null;
  celular: string | null;
  rol: string;
  activo: boolean;
  horasBase: number;
  horasProgramadas: number;
}

export interface LoginMovilResponse {
  ok: boolean;
  token: string;
  usuario: EmployeeUserResponse;
  message?: string;
}

export async function loginMovil(payload: LoginMovilPayload): Promise<LoginMovilResponse> {
  const { data } = await employeeApi.post<LoginMovilResponse>("/auth/login-movil", payload);
  return data;
}

export async function getPerfil(): Promise<EmployeeUserResponse> {
  const { data } = await employeeApi.get<{ ok: boolean; data: EmployeeUserResponse }>("/usuarios/perfil");
  return data.data;
}

export interface CambiarPasswordPayload {
  passwordActual: string;
  nuevaPassword: string;
}

export async function cambiarPassword(payload: CambiarPasswordPayload): Promise<{ ok: boolean; message: string }> {
  const { data } = await employeeApi.patch<{ ok: boolean; message: string }>("/usuarios/cambiar-password", payload);
  return data;
}
