/**
 * SICAD — Employee Service
 * Placeholder para integración con Express + Prisma backend
 *
 * TODO: Reemplazar las funciones stub con llamadas reales a `api`
 */

// ── Interfaces ────────────────────────────────────────────

export type EmployeeStatus = "Activo" | "Inactivo" | "Licencia";

export interface Employee {
  id:      string;
  code:    string;
  ci:      string;
  name:    string;
  role:    string;
  status:  EmployeeStatus;
  periods: number;
}

export interface CreateEmployeePayload {
  ci:      string;
  name:    string;
  role:    string;
  status?: EmployeeStatus;
}

export interface UpdateEmployeePayload extends Partial<CreateEmployeePayload> {
  id: string;
}

export interface PaginatedResponse<T> {
  data:    T[];
  total:   number;
  page:    number;
  perPage: number;
}

// ── Service functions ──────────────────────────────────────

/**
 * Lista todos los empleados con paginación y filtros opcionales.
 * TODO: GET /api/employees?page=1&search=...
 */
export async function getEmployees(
  _page = 1,
  _search = ""
): Promise<PaginatedResponse<Employee>> {
  // Stub — reemplazar con:
  // const { data } = await api.get<PaginatedResponse<Employee>>("/employees", {
  //   params: { page, search },
  // });
  // return data;
  return Promise.reject(new Error("Employee service not connected to backend yet"));
}

/**
 * Obtiene un empleado por ID.
 * TODO: GET /api/employees/:id
 */
export async function getEmployeeById(_id: string): Promise<Employee> {
  return Promise.reject(new Error("Employee service not connected to backend yet"));
}

/**
 * Crea un nuevo empleado.
 * TODO: POST /api/employees
 */
export async function createEmployee(_payload: CreateEmployeePayload): Promise<Employee> {
  return Promise.reject(new Error("Employee service not connected to backend yet"));
}

/**
 * Actualiza un empleado existente.
 * TODO: PUT /api/employees/:id
 */
export async function updateEmployee(_payload: UpdateEmployeePayload): Promise<Employee> {
  return Promise.reject(new Error("Employee service not connected to backend yet"));
}

/**
 * Elimina un empleado por ID.
 * TODO: DELETE /api/employees/:id
 */
export async function deleteEmployee(_id: string): Promise<void> {
  return Promise.reject(new Error("Employee service not connected to backend yet"));
}

export default { getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee };
