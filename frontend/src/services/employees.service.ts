import api from "./api";

export interface Employee {
  id?: number;
  code: string;
  ci: string;
  name: string;
  role: string;
  status: "Activo" | "Inactivo" | "Licencia";
  periods: number;
  email: string;
  phone: string;
  contractedHours: 20 | 40;
  assignedHours: number;
}

export interface UsuarioBackend {
  id: number;
  nombre: string;
  email: string;
  rol: "ADMIN" | "EMPLEADO";
  horasBase: number;
  horasProgramadas: number;
  codigo?: string | null;
  ci?: string | null;
  celular?: string | null;
  activo?: boolean;
  _count?: { horariosAsignados: number };
}

/**
 * Lista todos los empleados desde el backend.
 * GET /api/usuarios
 */
export async function getEmployees(): Promise<Employee[]> {
  const { data } = await api.get<{ ok: boolean; data: UsuarioBackend[] }>("/usuarios");
  if (!data.ok) {
    throw new Error("Error al obtener la lista de empleados");
  }
  return data.data.map((user) => {
    const periodCount = user._count?.horariosAsignados ?? 0;
    return {
      id: user.id,
      code: user.codigo || `CC-${String(user.id).padStart(3, "0")}`,
      ci: user.ci || "N/A",
      name: user.nombre,
      role: user.rol === "ADMIN" ? "Administrador" : "Empleado",
      status: user.activo ? "Activo" : "Inactivo",
      periods: periodCount,
      email: user.email,
      phone: user.celular || "N/A",
      contractedHours: user.horasBase === 20 ? 20 : 40,
      assignedHours: periodCount,
    };
  });
}

/**
 * Obtiene un empleado por su código (ID).
 */
export async function getEmployeeByCode(code: string): Promise<Employee | undefined> {
  const idMatch = code.match(/CC-(\d+)/);
  const id = idMatch ? parseInt(idMatch[1], 10) : 0;
  if (!id) return undefined;

  const { data } = await api.get<{ ok: boolean; data: UsuarioBackend }>(`/usuarios/${id}`);
  if (!data.ok || !data.data) return undefined;

  const user = data.data;
  return {
    id: user.id,
    code: user.codigo || `CC-${String(user.id).padStart(3, "0")}`,
    ci: user.ci || "N/A",
    name: user.nombre,
    role: user.rol === "ADMIN" ? "Administrador" : "Empleado",
    status: user.activo ? "Activo" : "Inactivo",
    periods: Math.ceil(user.horasProgramadas / 4),
    email: user.email,
    phone: user.celular || "N/A",
    contractedHours: user.horasBase === 20 ? 20 : 40,
    assignedHours: user.horasProgramadas,
  };
}

/**
 * Crea un nuevo empleado en el backend.
 * POST /api/usuarios
 */
export async function createEmployee(employee: Omit<Employee, "periods">): Promise<any> {
  // Generamos un password por defecto basado en su email o un valor seguro
  const password = employee.email ? `${employee.email.split("@")[0]}123` : "sicad123";

  const payload = {
    nombre: employee.name,
    email: employee.email,
    password: password,
    rol: "EMPLEADO",
    horasBase: employee.contractedHours,
    ci: employee.ci ? employee.ci.trim() : null,
    celular: employee.phone ? employee.phone.trim() : null,
    activo: employee.status === "Activo",
  };

  const { data } = await api.post<{ ok: boolean; data: any }>("/usuarios", payload);
  if (!data.ok) {
    throw new Error("Error al crear el empleado");
  }
  return data.data;
}

/**
 * Actualiza un empleado en el backend.
 * PATCH /api/usuarios/:id
 */
export async function updateEmployee(id: number, updatedData: Partial<Employee>): Promise<any> {
  if (!id) throw new Error("ID de empleado inválido");

  const payload: any = {};
  if (updatedData.name !== undefined) payload.nombre = updatedData.name;
  if (updatedData.email !== undefined) payload.email = updatedData.email;
  if (updatedData.contractedHours !== undefined) payload.horasBase = updatedData.contractedHours;
  if (updatedData.status !== undefined) payload.activo = updatedData.status === "Activo";
  if (updatedData.phone !== undefined) payload.celular = updatedData.phone;
  if (updatedData.ci !== undefined) payload.ci = updatedData.ci;

  const { data } = await api.patch<{ ok: boolean; data: any }>(`/usuarios/${id}`, payload);
  if (!data.ok) {
    throw new Error("Error al actualizar el empleado");
  }
  return data.data;
}

/**
 * Elimina un empleado en el backend.
 * DELETE /api/usuarios/:id
 */
export async function deleteEmployee(id: number): Promise<void> {
  if (!id) throw new Error("ID de empleado inválido");

  const { data } = await api.delete<{ ok: boolean }>(`/usuarios/${id}`);
  if (!data.ok) {
    throw new Error("Error al eliminar el empleado");
  }
}

export default {
  getEmployees,
  getEmployeeByCode,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
