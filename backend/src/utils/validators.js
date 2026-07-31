/**
 * Regla estricta de contraseña:
 *   - Mínimo 8 caracteres
 *   - Al menos una minúscula, una mayúscula, un número y un símbolo
 *     (@$!%*?&.#_-)
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#_$-])[A-Za-z\d@$!%*?&.#_$-]{8,}$/;

const PASSWORD_ERROR_MESSAGE = 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.';

/**
 * Valida que una contraseña cumpla la regla estricta.
 * @param {string} password
 * @returns {boolean}
 */
function isValidPassword(password) {
  return typeof password === 'string' && PASSWORD_REGEX.test(password);
}

module.exports = { PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE, isValidPassword };
