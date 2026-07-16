/**
 * Genera una contraseña por defecto basada en el prefijo del email.
 * Toma cada parte del nombre separada por '.', extrae las primeras 3 letras,
 * las concatena y añade "123".
 *
 * Ejemplos:
 *   "esmeralda.medina.p" → "emp123"
 *   "ana.montano"       → "anm123"
 *   "juan.perez.garcia" → "jpe123"
 *
 * @param {string} emailPrefijo  Parte del email antes del @
 * @returns {string}
 */
function generarPasswordPorDefecto(emailPrefijo) {
  const partes = emailPrefijo.split('.');
  const abreviatura = partes
    .map(p => p.slice(0, 3).toLowerCase())
    .join('');
  return `${abreviatura}123`;
}

module.exports = { generarPasswordPorDefecto };
