// src/controllers/qr.controller.js
// Controlador para la generación y verificación de tokens QR de asistencia.

const crypto = require('crypto');
const prisma = require('../config/db');

/**
 * GET /api/qr/generate
 * Genera un token QR temporal firmado. El frontend lo renderiza como código QR visual.
 */
async function generateQR(req, res) {
  try {
    const nonce = crypto.randomBytes(16).toString('hex');

    // Obtener configuración para la duración del QR (default 30 segundos)
    const config = await prisma.configuracion.findUnique({ where: { id: 1 } });
    const duracion = config?.duracionQrSegundos ?? 30;

    const exp = Date.now() + (duracion * 1000);
    const payload = JSON.stringify({ nonce, exp, terminal: 'main', version: '1' });
    const signature = crypto.createHmac('sha256', process.env.QR_SECRET_KEY).update(payload).digest('hex');

    // Guardar nonce en la base de datos
    await prisma.qrNonce.create({
      data: {
        nonce,
        expiresAt: new Date(exp)
      }
    });

    const payloadB64 = Buffer.from(payload).toString('base64');
    const token = `${payloadB64}.${signature}`;

    res.json({
      ok: true,
      token,
      expiresAt: Math.floor(exp / 1000),
      expiresAtISO: new Date(exp).toISOString(),
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

  // Mantenemos una verificación básica si es necesaria para compatibilidad, o retornamos error si se prefiere usar marcar-movil.
  res.status(501).json({ ok: false, message: 'Por favor use marcar-movil para registrar la asistencia.' });
}

module.exports = { generateQR, verifyQR };

