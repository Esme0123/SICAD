const BO_TIMEZONE = "America/La_Paz";

function boNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: BO_TIMEZONE }));
}

export function obtenerPeriodoActual(fecha?: Date): string {
  const d = fecha ?? boNow();
  const mes = d.getMonth() + 1;
  const year = d.getFullYear();

  if (mes === 1) return `Verano ${year}`;
  if (mes >= 2 && mes <= 6) return `1-${year}`;
  if (mes === 7) return `Invierno ${year}`;
  return `2-${year}`;
}

export interface PeriodOption {
  label: string;
  value: string;
}
