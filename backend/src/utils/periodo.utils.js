/**
 * Determina el periodo académico actual basado en la fecha.
 * Usa la zona horaria de Bolivia (America/La_Paz).
 *
 * Reglas:
 *   Enero       → "Verano YYYY"
 *   Feb-Jun     → "1-YYYY"
 *   Julio       → "Invierno YYYY"
 *   Ago-Dic     → "2-YYYY"
 *
 * @param {Date} [fecha=new Date()]
 * @returns {string} Ej: "1-2026", "Invierno 2026", "Verano 2026"
 */
function obtenerPeriodoActual(fecha) {
  const boliviaDate = !fecha
    ? new Date(new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" }))
    : new Date(new Date(fecha).toLocaleString("en-US", { timeZone: "America/La_Paz" }));

  const mes = boliviaDate.getMonth() + 1; // 1–12
  const year = boliviaDate.getFullYear();

  if (mes === 1) return `Verano ${year}`;
  if (mes >= 2 && mes <= 6) return `1-${year}`;
  if (mes === 7) return `Invierno ${year}`;
  return `2-${year}`;
}

const PERIOD_VALUES = {
  0: (y) => `Verano ${y}`,
  1: (y) => `1-${y}`,
  2: (y) => `Invierno ${y}`,
  3: (y) => `2-${y}`,
};

function parsePeriod(value) {
  let m = value.match(/^(Verano|Invierno)\s(\d{4})$/);
  if (m) {
    const idx = m[1] === 'Verano' ? 0 : 2;
    return { idx, year: parseInt(m[2]) };
  }
  m = value.match(/^1-(\d{4})$/);
  if (m) return { idx: 1, year: parseInt(m[1]) };
  m = value.match(/^2-(\d{4})$/);
  if (m) return { idx: 3, year: parseInt(m[2]) };
  return null;
}

function getPreviousPeriod(value) {
  const parsed = parsePeriod(value);
  if (!parsed) return null;
  let { idx, year } = parsed;
  idx--;
  if (idx < 0) { idx = 3; year--; }
  return PERIOD_VALUES[idx](year);
}

module.exports = { obtenerPeriodoActual, parsePeriod, getPreviousPeriod };
