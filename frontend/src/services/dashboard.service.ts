import api from "./api";

export interface ChartDataPoint {
  time: string;
  count: number;
}

export interface SystemStatus {
  ram: number;
  db: string;
}

export interface DashboardResumen {
  totalEmpleados: number;
  presentes: number;
  ausentes: number;
  retrasos: number;
  permisos: number;
  chartData: ChartDataPoint[];
  actividadReciente: ActividadReciente[];
  systemStatus: SystemStatus;
}

export interface ActividadReciente {
  id: number;
  usuarioId: number;
  nombre: string;
  codigo: string;
  horaEntrada: string;
  horaSalida: string | null;
  observacion: string | null;
  estado: "Puntual" | "Atraso" | "Permiso";
}

export interface DashboardResponse {
  ok: boolean;
  data: DashboardResumen;
}

export async function getResumen(rango: string = "hoy"): Promise<DashboardResumen> {
  const { data } = await api.get<DashboardResponse>("/dashboard/resumen", {
    params: { rango },
  });
  if (!data.ok) throw new Error("Error al obtener resumen del dashboard");
  return data.data;
}
