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

const PERIOD_LABELS: Record<number, (y: number) => string> = {
  0: (y) => `Verano ${y}`,
  1: (y) => `Semestre 1-${y} (Feb - Jun)`,
  2: (y) => `Invierno ${y}`,
  3: (y) => `Semestre 2-${y} (Ago - Dic)`,
};

const PERIOD_VALUES: Record<number, (y: number) => string> = {
  0: (y) => `Verano ${y}`,
  1: (y) => `1-${y}`,
  2: (y) => `Invierno ${y}`,
  3: (y) => `2-${y}`,
};

function monthToPeriodIndex(mes: number): number {
  if (mes === 1) return 0;       // Verano
  if (mes >= 2 && mes <= 6) return 1; // 1-YYYY
  if (mes === 7) return 2;       // Invierno
  return 3;                       // 2-YYYY
}

export function generatePeriodOptions(count: number = 8): PeriodOption[] {
  const now = boNow();
  const results: PeriodOption[] = [];
  let year = now.getFullYear();
  let idx = monthToPeriodIndex(now.getMonth() + 1);

  const seen = new Set<string>();

  for (let i = 0; i < count; i++) {
    const value = PERIOD_VALUES[idx](year);
    if (!seen.has(value)) {
      seen.add(value);
      results.push({ label: PERIOD_LABELS[idx](year), value });
    }
    idx++;
    if (idx > 3) { idx = 0; year++; }
  }

  return results;
}
