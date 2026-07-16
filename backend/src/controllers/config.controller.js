const prisma = require('../config/db');

async function getConfig(req, res) {
  try {
    const config = await prisma.configuracionSistema.upsert({
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

async function updateConfig(req, res) {
  try {
    const {
      nombreInstitucion,
      formatoExportacion,
      tiempoTolerancia,
      duracionQR,
      horaApertura,
      horaCierre,
    } = req.body;

    const config = await prisma.configuracionSistema.upsert({
      where: { id: 1 },
      update: {
        nombreInstitucion,
        formatoExportacion,
        tiempoTolerancia,
        duracionQR,
        horaApertura,
        horaCierre,
      },
      create: {
        id: 1,
        nombreInstitucion,
        formatoExportacion,
        tiempoTolerancia,
        duracionQR,
        horaApertura,
        horaCierre,
      },
    });
    res.json({ ok: true, data: config });
  } catch (error) {
    console.error('[config.updateConfig]', error);
    res.status(500).json({ ok: false, message: 'Error al actualizar la configuración' });
  }
}

module.exports = { getConfig, updateConfig };
