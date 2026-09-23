// src/utils/fechaPura.utils.js
// ─────────────────────────────────────────────────────────────
// Helpers para fechas "puras" (YYYY-MM-DD) ↔ columnas PostgreSQL DATE
// (campos `DateTime @db.Date` del schema de Prisma).
//
// CONVENCIÓN DEL PROYECTO (importante — no romperla):
//  - Prisma lee una columna DATE como un objeto Date a las 00:00 UTC de ese
//    día. Para formatear la fecha calendario de un valor leído de @db.Date hay
//    que usar SIEMPRE getters UTC (getUTCFullYear/getUTCMonth/getUTCDate) o
//    `fechaPuraStr()`. Usar getters locales en un servidor con offset negativo
//    (UTC-4, America/La_Paz) desplaza la fecha al día anterior.
//  - Para escribir una fecha en una columna DATE hay que construir el Date como
//    medianoche UTC (`new Date(Date.UTC(y, m-1, d))`). Combinado con
//    `process.env.TZ = 'UTC'` (ver src/config/env.js) garantiza que el valor
//    guardado sea EXACTAMENTE el día calendario pedido, sin importar la zona
//    horaria ni el serializador que use el driver.
//  - Los rangos de consulta de un día deben ir de 00:00:00.000Z a
//    23:59:59.999Z (UTC medianoche). NUNCA usar horas de mediodía ni horas
//    locales para delimitarlos.
// ─────────────────────────────────────────────────────────────

/**
 * Convierte "YYYY-MM-DD" en un Date a medianoche UTC.
 * @param {string} fechaStr "2026-09-12"
 * @returns {Date|null}
 */
function parseFechaPura(fechaStr) {
  if (typeof fechaStr !== 'string') return null;
  const m = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mm = Number(m[2]);
  const d = Number(m[3]);
  if (mm < 1 || mm > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mm - 1, d));
}

/**
 * Formatea una fecha a "YYYY-MM-DD" usando getters UTC.
 * Pensado para valores leídos de columnas DATE (@db.Date).
 * @param {Date|string} d
 * @returns {string} "2026-09-12"
 */
function fechaPuraStr(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Rango [start, end] de un día calendario expresado en clave UTC.
 * start = 00:00:00.000Z, end = 23:59:59.999Z.
 * @param {string} fechaStr "2026-09-12"
 * @returns {{start: Date, end: Date}|null}
 */
function rangoFechaPura(fechaStr) {
  const start = parseFechaPura(fechaStr);
  if (!start) return null;
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}

/**
 * Día de la semana (0=Domingo … 6=Sábado) de una fecha pura, independiente
 * de la zona horaria del servidor.
 * @param {string} fechaStr "2026-09-12"
 * @returns {number|null}
 */
function diaSemanaDeFechaStr(fechaStr) {
  const d = parseFechaPura(fechaStr);
  return d ? d.getUTCDay() : null;
}

/**
 * Suma días a una fecha pura y devuelve otra fecha pura.
 * @param {string} fechaStr "2026-09-12"
 * @param {number} dias
 * @returns {string|null}
 */
function sumarDias(fechaStr, dias) {
  const d = parseFechaPura(fechaStr);
  if (!d) return null;
  d.setUTCDate(d.getUTCDate() + dias);
  return fechaPuraStr(d);
}

module.exports = { parseFechaPura, fechaPuraStr, rangoFechaPura, diaSemanaDeFechaStr, sumarDias };