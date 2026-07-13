// src/controllers/qr.controller.js
// Controlador para la generación y verificación de tokens QR de asistencia.

const { generateQRToken, verifyQRToken } = require('../utils/qrGenerator');

/**
 * GET /api/qr/generate
 * Genera un token QR temporal firmado. El frontend lo renderiza como código QR visual.
 */
function generateQR(req, res) {
  const { token, expiresAt } = generateQRToken();

  res.json({
    ok: true,
    token,
    expiresAt,          // Unix timestamp (segundos) — el frontend lo usa para countdown
    expiresAtISO: new Date(expiresAt * 1000).toISOString(),
  });
}

/**
 * POST /api/qr/verify
 * Verifica un token QR recibido del escáner (uso interno / testing).
 * Body: { token: string }
 */
function verifyQR(req, res) {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ ok: false, message: 'Token requerido' });
  }

  const result = verifyQRToken(token);

  if (!result.valid) {
    return res.status(401).json({ ok: false, message: result.reason });
  }

  res.json({ ok: true, message: 'Token válido' });
}

module.exports = { generateQR, verifyQR };
