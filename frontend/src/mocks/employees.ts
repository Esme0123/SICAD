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
  email: string;
  phone: string;
  contractedHours: 20 | 40;
  assignedHours: number;
}

export const MOCK_EMPLOYEES: Employee[] = [
  { code: "CC-001", ci: "12345678", name: "Carlos Mamani Quispe",  role: "Auxiliar",     status: "Activo",   periods: 4, email: "carlos.mamani@ucb.edu.bo", phone: "71234567", contractedHours: 40, assignedHours: 16 },
  { code: "CC-002", ci: "87654321", name: "Ana Flores Mendoza",    role: "Auxiliar",     status: "Activo",   periods: 3, email: "ana.flores@ucb.edu.bo", phone: "72345678", contractedHours: 20, assignedHours: 12 },
  { code: "CC-003", ci: "11223344", name: "Luis Quispe Torrez",    role: "Técnico",      status: "Activo",   periods: 5, email: "luis.quispe@ucb.edu.bo", phone: "73456789", contractedHours: 40, assignedHours: 20 },
  { code: "CC-004", ci: "44332211", name: "María Torres García",   role: "Auxiliar",     status: "Inactivo", periods: 0, email: "maria.torres@ucb.edu.bo", phone: "74567890", contractedHours: 20, assignedHours: 0 },
  { code: "CC-005", ci: "55667788", name: "Jorge Condori López",   role: "Técnico",      status: "Activo",   periods: 6, email: "jorge.condori@ucb.edu.bo", phone: "75678901", contractedHours: 40, assignedHours: 24 },
  { code: "CC-006", ci: "99887766", name: "Sofía Vargas Choque",   role: "Auxiliar",     status: "Activo",   periods: 4, email: "sofia.vargas@ucb.edu.bo", phone: "76789012", contractedHours: 20, assignedHours: 16 },
  { code: "CC-007", ci: "33445566", name: "Diego Mamani Cruz",     role: "Auxiliar",     status: "Activo",   periods: 3, email: "diego.mamani@ucb.edu.bo", phone: "77890123", contractedHours: 40, assignedHours: 12 },
  { code: "CC-008", ci: "77889900", name: "Patricia Rojas Lima",   role: "Coordinador",  status: "Licencia", periods: 2, email: "patricia.rojas@ucb.edu.bo", phone: "78901234", contractedHours: 20, assignedHours: 8 },
];
