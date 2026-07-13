// src/controllers/config.controller.js
// Gestión de la configuración global del sistema (singleton id=1)

const prisma = require('../config/db');

// GET /api/configuracion
async function getConfig(req, res) {
  try {
    // Obtiene la única fila; si no existe, la crea con defaults
    const config = await prisma.configuracion.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    res.json({ ok: true, data: config });
  } catch (error) {
    console.error('[config.getConfig]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener la configuración' });
  }
}

// PATCH /api/configuracion
async function updateConfig(req, res) {
  try {
    const {
      nombreInstitucion,
      formatoExportacion,
      tiempoToleranciaMinutos,
      duracionQrSegundos,
      horaAperturaControl,
      horaCierreControl,
    } = req.body;

    const config = await prisma.configuracion.upsert({
      where: { id: 1 },
      update: {
        nombreInstitucion,
        formatoExportacion,
        tiempoToleranciaMinutos,
        duracionQrSegundos,
        horaAperturaControl,
        horaCierreControl,
      },
      create: {
        id: 1,
        nombreInstitucion,
        formatoExportacion,
        tiempoToleranciaMinutos,
        duracionQrSegundos,
        horaAperturaControl,
        horaCierreControl,
      },
    });
    res.json({ ok: true, data: config });
  } catch (error) {
    console.error('[config.updateConfig]', error);
    res.status(500).json({ ok: false, message: 'Error al actualizar la configuración' });
  }
}

module.exports = { getConfig, updateConfig };
