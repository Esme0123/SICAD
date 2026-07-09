/**
 * SICAD — Mock de Empleados
 * Datos de prueba para desarrollo frontend
 * En producción estos datos vendrán de employee.service.ts → API
 */

export interface Employee {
  code: string;
  ci: string;
  name: string;
  role: string;
  status: "Activo" | "Inactivo" | "Licencia";
  periods: number;
}

export const MOCK_EMPLOYEES: Employee[] = [
  { code: "CC-001", ci: "12345678", name: "Carlos Mamani Quispe",  role: "Auxiliar",     status: "Activo",   periods: 4 },
  { code: "CC-002", ci: "87654321", name: "Ana Flores Mendoza",    role: "Auxiliar",     status: "Activo",   periods: 3 },
  { code: "CC-003", ci: "11223344", name: "Luis Quispe Torrez",    role: "Técnico",      status: "Activo",   periods: 5 },
  { code: "CC-004", ci: "44332211", name: "María Torres García",   role: "Auxiliar",     status: "Inactivo", periods: 0 },
  { code: "CC-005", ci: "55667788", name: "Jorge Condori López",   role: "Técnico",      status: "Activo",   periods: 6 },
  { code: "CC-006", ci: "99887766", name: "Sofía Vargas Choque",   role: "Auxiliar",     status: "Activo",   periods: 4 },
  { code: "CC-007", ci: "33445566", name: "Diego Mamani Cruz",     role: "Auxiliar",     status: "Activo",   periods: 3 },
  { code: "CC-008", ci: "77889900", name: "Patricia Rojas Lima",   role: "Coordinador",  status: "Licencia", periods: 2 },
];
