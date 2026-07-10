import { Employee, MOCK_EMPLOYEES } from "@/mocks/employees";

const STORAGE_KEY = "sicad_employees";

function getStoredEmployees(): Employee[] {
  if (typeof window === "undefined") return MOCK_EMPLOYEES;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_EMPLOYEES));
    return MOCK_EMPLOYEES;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return MOCK_EMPLOYEES;
  }
}

function saveEmployees(employees: Employee[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
  }
}

export async function getEmployees(): Promise<Employee[]> {
  return getStoredEmployees();
}

export async function getEmployeeByCode(code: string): Promise<Employee | undefined> {
  const employees = getStoredEmployees();
  return employees.find((e) => e.code === code);
}

export async function createEmployee(employee: Employee): Promise<Employee> {
  const employees = getStoredEmployees();
  employees.push(employee);
  saveEmployees(employees);
  return employee;
}

export async function updateEmployee(code: string, updatedData: Partial<Employee>): Promise<Employee> {
  const employees = getStoredEmployees();
  const idx = employees.findIndex((e) => e.code === code);
  if (idx === -1) {
    throw new Error("Empleado no encontrado");
  }
  const updated = { ...employees[idx], ...updatedData };
  employees[idx] = updated;
  saveEmployees(employees);
  return updated;
}

export async function deleteEmployee(code: string): Promise<void> {
  const employees = getStoredEmployees();
  const filtered = employees.filter((e) => e.code !== code);
  saveEmployees(filtered);
}

export default {
  getEmployees,
  getEmployeeByCode,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
