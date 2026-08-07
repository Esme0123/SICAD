// src/controllers/feriado.controller.js
// Gestión de feriados: días no laborables con acreditación de horas.

const prisma = require('../config/db');
const { registrarAuditoria } = require('./auditoria.controller');

async function getAll(req, res) {
  try {
    const feriados = await prisma.feriado.findMany({
      orderBy: { fecha: 'desc' },
    });
    res.json({ ok: true, data: feriados });
  } catch (error) {
    console.error('[feriado.getAll]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener los feriados' });
  }
}

async function create(req, res) {
  try {
    const { fecha, descripcion, periodoAcademico, esAcreditado } = req.body;

    if (!fecha || !descripcion || !periodoAcademico) {
      return res.status(400).json({
        ok: false,
        message: 'fecha, descripcion y periodoAcademico son requeridos',
      });
    }

    // @db.Date en PostgreSQL: almacena la fecha calendario (medianoche UTC)
    const fechaUTC = new Date(`${fecha}T00:00:00Z`);
    if (Number.isNaN(fechaUTC.getTime())) {
      return res.status(400).json({ ok: false, message: 'Fecha inválida. Usa formato YYYY-MM-DD' });
    }

    const existente = await prisma.feriado.findUnique({ where: { fecha: fechaUTC } });
    if (existente) {
      return res.status(400).json({ ok: false, message: 'Ya existe un feriado registrado para esa fecha' });
    }

    const feriado = await prisma.feriado.create({
      data: {
        fecha: fechaUTC,
        descripcion: String(descripcion).slice(0, 255),
        periodoAcademico: String(periodoAcademico),
        esAcreditado: esAcreditado === undefined ? true : Boolean(esAcreditado),
      },
    });

    const direccionIP = req.ip || req.connection?.remoteAddress || 'unknown';
    await registrarAuditoria(
      `FERIADO_CREADO: ${fecha} — ${feriado.descripcion}`,
      req.usuario?.email || 'sistema',
      direccionIP
    );

    res.status(201).json({ ok: true, data: feriado });
  } catch (error) {
    console.error('[feriado.create]', error);
    res.status(500).json({ ok: false, message: 'Error al crear el feriado' });
  }
}

async function remove(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ ok: false, message: 'ID inválido' });
    }

    const existente = await prisma.feriado.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ ok: false, message: 'Feriado no encontrado' });
    }

    await prisma.feriado.delete({ where: { id } });

    const direccionIP = req.ip || req.connection?.remoteAddress || 'unknown';
    await registrarAuditoria(
      `FERIADO_ELIMINADO: ${existente.fecha.toISOString().split('T')[0]} — ${existente.descripcion}`,
      req.usuario?.email || 'sistema',
      direccionIP
    );

    res.json({ ok: true, data: existente });
  } catch (error) {
    console.error('[feriado.remove]', error);
    res.status(500).json({ ok: false, message: 'Error al eliminar el feriado' });
  }
}

module.exports = { getAll, create, remove };
