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

module.exports = { obtenerPeriodoActual };
