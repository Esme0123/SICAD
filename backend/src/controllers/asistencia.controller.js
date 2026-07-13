// src/controllers/asistencia.controller.js
// NÚCLEO del sistema: lógica de escaneo QR con bloques de entrada/salida

const prisma = require('../config/db');
const { verifyQRToken } = require('../utils/qrGenerator');

// ── Helpers ──────────────────────────────────────────────────

/**
 * Devuelve el inicio (00:00:00.000) y el fin (23:59:59.999) del día UTC
 * correspondiente a una fecha, para usar en rangos de búsqueda en BD.
 */
function getDayRange(date = new Date()) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

// ── Endpoints ────────────────────────────────────────────────

/**
 * POST /api/asistencia/registrar
 * Body: { token: string, usuarioId: number }
 *
 * Flujo:
 *  1. Verifica token QR (HMAC SHA-256) → 401 si inválido
 *  2. Busca asistencia abierta HOY (horaEntrada existe, horaSalida es null)
 *  3. Si NO existe → crea nueva asistencia (horaEntrada = ahora)
 *  4. Si SÍ existe → cierra la asistencia abierta (horaSalida = ahora)
 */
async function registrar(req, res) {
  try {
    const { token, usuarioId } = req.body;

    if (!token || !usuarioId) {
      return res.status(400).json({ ok: false, message: 'token y usuarioId son requeridos' });
    }

    // 1. Validar token QR
    const verificacion = verifyQRToken(token);
    if (!verificacion.valid) {
      return res.status(401).json({ ok: false, message: `Token QR inválido: ${verificacion.reason}` });
    }

    const ahora = new Date();
    const { start, end } = getDayRange(ahora);
    const uid = parseInt(usuarioId);

    // 2. Buscar asistencia abierta del día (sin horaSalida)
    const asistenciaAbierta = await prisma.asistencia.findFirst({
      where: {
        usuarioId: uid,
        fecha: { gte: start, lte: end },
        horaSalida: null,
        salidaOmitida: false,
      },
      orderBy: { horaEntrada: 'desc' },
    });

    let resultado;
    let accion;

    if (!asistenciaAbierta) {
      // 3. No hay asistencia abierta → registrar ENTRADA
      resultado = await prisma.asistencia.create({
        data: {
          usuarioId: uid,
          fecha: ahora,
          horaEntrada: ahora,
        },
        include: { usuario: { select: { nombre: true } } },
      });
      accion = 'ENTRADA';
    } else {
      // 4. Hay asistencia abierta → registrar SALIDA
      resultado = await prisma.asistencia.update({
        where: { id: asistenciaAbierta.id },
        data: { horaSalida: ahora },
        include: { usuario: { select: { nombre: true } } },
      });
      accion = 'SALIDA';
    }

    res.status(201).json({
      ok: true,
      accion,
      mensaje: accion === 'ENTRADA'
        ? `Entrada registrada para ${resultado.usuario.nombre}`
        : `Salida registrada para ${resultado.usuario.nombre}`,
      data: resultado,
    });
  } catch (error) {
    console.error('[asistencia.registrar]', error);
    res.status(500).json({ ok: false, message: 'Error al registrar asistencia' });
  }
}

// GET /api/asistencia
// Listado general con filtros opcionales: ?usuarioId=&fecha=YYYY-MM-DD
async function getAll(req, res) {
  try {
    const { usuarioId, fecha } = req.query;
    const where = {};

    if (usuarioId) where.usuarioId = parseInt(usuarioId);

    if (fecha) {
      const { start, end } = getDayRange(new Date(fecha));
      where.fecha = { gte: start, lte: end };
    }

    const asistencias = await prisma.asistencia.findMany({
      where,
      include: { usuario: { select: { id: true, nombre: true } } },
      orderBy: [{ fecha: 'desc' }, { horaEntrada: 'desc' }],
    });

    res.json({ ok: true, data: asistencias });
  } catch (error) {
    console.error('[asistencia.getAll]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener asistencias' });
  }
}

// GET /api/asistencia/:id
async function getById(req, res) {
  try {
    const id = parseInt(req.params.id);
    const asistencia = await prisma.asistencia.findUnique({
      where: { id },
      include: { usuario: { select: { id: true, nombre: true } } },
    });
    if (!asistencia) return res.status(404).json({ ok: false, message: 'Asistencia no encontrada' });
    res.json({ ok: true, data: asistencia });
  } catch (error) {
    console.error('[asistencia.getById]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener asistencia' });
  }
}

// PATCH /api/asistencia/:id/cerrar
// Uso del cronjob: cierra turnos sin salida y marca salidaOmitida = true
async function cerrarTurno(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { observacion } = req.body;

    const asistencia = await prisma.asistencia.update({
      where: { id },
      data: {
        horaSalida: new Date(),
        salidaOmitida: true,
        observacion: observacion || 'Turno cerrado automáticamente por el sistema',
      },
    });
    res.json({ ok: true, data: asistencia });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, message: 'Asistencia no encontrada' });
    }
    console.error('[asistencia.cerrarTurno]', error);
    res.status(500).json({ ok: false, message: 'Error al cerrar turno' });
  }
}

module.exports = { registrar, getAll, getById, cerrarTurno };
