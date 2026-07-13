// src/utils/qrGenerator.js
// Genera tokens firmados con HMAC SHA-256 para los códigos QR de asistencia.
//
// Estructura del payload:
//   { exp: <unix_timestamp_expiracion>, iat: <unix_timestamp_emision> }
//
// Flujo:
//   1. El backend genera este token y lo envía al frontend.
//   2. El frontend lo convierte visualmente en un QR (con una librería JS).
//   3. El empleado escanea el QR con su cámara.
//   4. El backend valida la firma y la expiración del token recibido.

const crypto = require('crypto');
const { QR_SECRET_KEY, QR_VALIDITY_SECONDS } = require('../config/env');

/**
 * Genera un token QR firmado con HMAC SHA-256.
 * @returns {{ token: string, expiresAt: number }} token codificado en base64url y su timestamp de expiración
 */
function generateQRToken() {
  const iat = Math.floor(Date.now() / 1000);          // Emitido ahora (segundos)
  const exp = iat + QR_VALIDITY_SECONDS;               // Expira en N segundos

  const payload = JSON.stringify({ iat, exp });
  const payloadB64 = Buffer.from(payload).toString('base64url');

  // Firma HMAC SHA-256 del payload
  const signature = crypto
    .createHmac('sha256', QR_SECRET_KEY)
    .update(payloadB64)
    .digest('base64url');

  // Token final: payload.firma  (similar a JWT pero sin header de algoritmo)
  const token = `${payloadB64}.${signature}`;

  return { token, expiresAt: exp };
}

/**
 * Verifica un token QR recibido del escáner.
 * @param {string} token
 * @returns {{ valid: boolean, reason?: string }}
 */
function verifyQRToken(token) {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return { valid: false, reason: 'Formato inválido' };

    // Re-firmar y comparar con timing-safe para evitar timing attacks
    const expectedSignature = crypto
      .createHmac('sha256', QR_SECRET_KEY)
      .update(payloadB64)
      .digest('base64url');

    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      return { valid: false, reason: 'Firma inválida' };
    }

    const { exp } = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    const now = Math.floor(Date.now() / 1000);

    if (now > exp) return { valid: false, reason: 'Token expirado' };

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Error de verificación' };
  }
}

module.exports = { generateQRToken, verifyQRToken };
