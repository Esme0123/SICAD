// src/controllers/qr.controller.js
// Controlador para la generación y verificación de tokens QR de asistencia.

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { JWT_SECRET } = require('../config/env');

const QR_JWT_SECRET = JWT_SECRET || 'secret_fallback_key';

/**
 * GET /api/qr/generate
 * Genera un token QR temporal firmado con JWT. El frontend lo renderiza como código QR visual.
 */
async function generateQR(req, res) {
  try {
    const nonce = crypto.randomBytes(16).toString('hex');

    const config = await prisma.configuracionSistema.findUnique({ where: { id: 1 } });
    const duracion = config?.duracionQR ?? 30;

    const exp = Math.floor(Date.now() / 1000) + duracion;
    const payload = { nonce, terminal: 'main', version: '1' };
    const token = jwt.sign(payload, QR_JWT_SECRET, { expiresIn: duracion });

    await prisma.qrNonce.create({
      data: { nonce, expiresAt: new Date(exp * 1000) },
    });

    res.json({
      ok: true,
      token,
      expiresAt: exp,
      expiresAtISO: new Date(exp * 1000).toISOString(),
    });
  } catch (error) {
    console.error('[qr.generateQR]', error);
    res.status(500).json({ ok: false, message: 'Error al generar código QR' });
  }
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
  res.status(501).json({ ok: false, message: 'Por favor use marcar-movil para registrar la asistencia.' });
}

module.exports = { generateQR, verifyQR };

