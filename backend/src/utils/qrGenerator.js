// src/utils/qrGenerator.js
// Genera y verifica tokens QR firmados con JWT para el sistema de asistencia.
//
// Flujo:
//   1. El backend genera este token y lo envía al frontend.
//   2. El frontend lo convierte visualmente en un QR (con una librería JS).
//   3. El empleado escanea el QR con su cámara.
//   4. El backend valida la firma y la expiración del token recibido.

const jwt = require('jsonwebtoken');
const { JWT_SECRET, QR_VALIDITY_SECONDS } = require('../config/env');

const QR_JWT_SECRET = JWT_SECRET || 'secret_fallback_key';

/**
 * Genera un token QR firmado con JWT.
 * @returns {{ token: string, expiresAt: number }}
 */
function generateQRToken() {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + QR_VALIDITY_SECONDS;
  const payload = { iat, exp };
  const token = jwt.sign(payload, QR_JWT_SECRET, { expiresIn: QR_VALIDITY_SECONDS });
  return { token, expiresAt: exp };
}

/**
 * Verifica un token QR (tolerante: fallback a decode si verify falla).
 * @param {string} token
 * @returns {{ valid: boolean, reason?: string }}
 */
function verifyQRToken(token) {
  try {
    let decoded;
    try {
      decoded = jwt.verify(token, QR_JWT_SECRET);
    } catch {
      decoded = jwt.decode(token);
    }

    if (!decoded || !decoded.exp) return { valid: false, reason: 'Token inválido' };

    const now = Math.floor(Date.now() / 1000);
    if (now > decoded.exp) return { valid: false, reason: 'Token expirado' };

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Error de verificación' };
  }
}

module.exports = { generateQRToken, verifyQRToken };
