import api from "./api";

export interface Employee {
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

/**
 * Lista todos los empleados desde el backend.
 * GET /api/usuarios
 */
export async function getEmployees(): Promise<Employee[]> {
  const { data } = await api.get<{ ok: boolean; data: any[] }>("/usuarios");
  if (!data.ok) {
    throw new Error("Error al obtener la lista de empleados");
  }
  return data.data.map((user) => ({
    code: `CC-${String(user.id).padStart(3, "0")}`,
    ci: "N/A",
    name: user.nombre,
    role: user.rol === "ADMIN" ? "Administrador" : "Empleado",
    status: "Activo",
    periods: Math.ceil(user.horasProgramadas / 4),
    email: user.email,
    phone: "N/A",
    contractedHours: user.horasBase === 20 ? 20 : 40,
    assignedHours: user.horasProgramadas,
  }));
}

/**
 * Obtiene un empleado por su código (ID).
 */
export async function getEmployeeByCode(code: string): Promise<Employee | undefined> {
  const idMatch = code.match(/CC-(\d+)/);
  const id = idMatch ? parseInt(idMatch[1], 10) : 0;
  if (!id) return undefined;

  const { data } = await api.get<{ ok: boolean; data: any }>(`/usuarios/${id}`);
  if (!data.ok || !data.data) return undefined;

  const user = data.data;
  return {
    code: `CC-${String(user.id).padStart(3, "0")}`,
    ci: "N/A",
    name: user.nombre,
    role: user.rol === "ADMIN" ? "Administrador" : "Empleado",
    status: "Activo",
    periods: Math.ceil(user.horasProgramadas / 4),
    email: user.email,
    phone: "N/A",
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
export async function updateEmployee(code: string, updatedData: Partial<Employee>): Promise<any> {
  const idMatch = code.match(/CC-(\d+)/);
  const id = idMatch ? parseInt(idMatch[1], 10) : 0;
  if (!id) throw new Error("ID de empleado inválido");

  const payload: any = {};
  if (updatedData.name) payload.nombre = updatedData.name;
  if (updatedData.email) payload.email = updatedData.email;
  if (updatedData.contractedHours) payload.horasBase = updatedData.contractedHours;

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
export async function deleteEmployee(code: string): Promise<void> {
  const idMatch = code.match(/CC-(\d+)/);
  const id = idMatch ? parseInt(idMatch[1], 10) : 0;
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
