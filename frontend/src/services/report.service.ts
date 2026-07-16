import api from "./api";

export interface AnalisisParams {
  startDate: string;
  endDate: string;
  search?: string;
  cargo?: string;
}

export interface Kpis {
  cumplimientoGeneral: number;
  totalAsistencias: number;
  promedioDiario: number;
  permisosAprobados: number;
}

export interface BarraItem {
  fecha: string;
  presentes: number;
  ausentes: number;
}

export interface DonaData {
  puntual: number;
  tardanza: number;
  ausente: number;
}

export interface FranjaItem {
  hora: string;
  puntualidad: number;
}

export interface MotivoPermiso {
  tipo: string;
  cantidad: number;
  porcentaje: number;
}

export interface AnalisisResponse {
  kpis: Kpis;
  graficoBarras: BarraItem[];
  graficoDona: DonaData;
  franjaHoraria: FranjaItem[];
  motivosPermiso: MotivoPermiso[];
}

export async function getAnalisis(params: AnalisisParams): Promise<AnalisisResponse> {
  const queryParams: Record<string, string> = {
    startDate: params.startDate,
    endDate: params.endDate,
  };
  if (params.search) queryParams.search = params.search;
  if (params.cargo && params.cargo !== "Todos") queryParams.cargo = params.cargo;

  const res = await api.get("/reportes/analisis", { params: queryParams });
  return res.data.data;
}

export async function exportReport(
  _params: AnalisisParams & { format: "pdf" | "excel" | "csv" }
): Promise<Blob> {
  return Promise.reject(new Error("Server-side export not implemented. Use client-side export utils."));
}

export default { getAnalisis, exportReport };
