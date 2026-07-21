// src/controllers/notificacion.controller.js

const prisma = require('../config/db');

async function crearNotificacion({ titulo, mensaje, usuarioId, permisoId, paraRol }) {
  try {
    return await prisma.notificacion.create({
      data: { titulo, mensaje, usuarioId, permisoId, paraRol },
    });
  } catch (error) {
    console.error('[notificacion.crear]', error);
  }
}

// GET /api/notificaciones/mis-notificaciones
// Devuelve las notificaciones del empleado autenticado
async function misNotificaciones(req, res) {
  try {
    const usuarioId = parseInt(req.usuario.id);

    const notificaciones = await prisma.notificacion.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ ok: true, data: notificaciones });
  } catch (error) {
    console.error('[notificacion.misNotificaciones]', error);
    res.json({ ok: true, data: [] });
  }
}

// GET /api/notificaciones/no-leidas
// Cuenta las notificaciones no leídas del empleado autenticado
async function noLeidas(req, res) {
  try {
    const usuarioId = parseInt(req.usuario.id);
    const count = await prisma.notificacion.count({
      where: { usuarioId, leida: false },
    });
    res.json({ ok: true, data: count });
  } catch (error) {
    console.error('[notificacion.noLeidas]', error);
    res.json({ ok: true, data: 0 });
  }
}

// PATCH /api/notificaciones/:id/leer
// Marca una notificación como leída
async function marcarLeida(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });

    await prisma.notificacion.update({
      where: { id },
      data: { leida: true },
    });

    res.json({ ok: true, message: 'Notificación marcada como leída' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, message: 'Notificación no encontrada' });
    }
    console.error('[notificacion.marcarLeida]', error);
    res.status(500).json({ ok: false, message: 'Error al marcar notificación' });
  }
}

// PATCH /api/notificaciones/leer-todas
// Marca todas las notificaciones del empleado como leídas
async function marcarTodasLeidas(req, res) {
  try {
    const usuarioId = parseInt(req.usuario.id);
    await prisma.notificacion.updateMany({
      where: { usuarioId, leida: false },
      data: { leida: true },
    });

    res.json({ ok: true, message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('[notificacion.marcarTodasLeidas]', error);
    res.status(500).json({ ok: false, message: 'Error al marcar notificaciones' });
  }
}

// ── ADMIN NOTIFICATIONS ───────────────────────────────────────

// GET /api/notificaciones/admin
async function notificacionesAdmin(req, res) {
  try {
    const notificaciones = await prisma.notificacion.findMany({
      where: { paraRol: 'ADMIN' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ ok: true, data: notificaciones });
  } catch (error) {
    console.error('[notificacion.admin]', error);
    res.json({ ok: true, data: [] });
  }
}

// GET /api/notificaciones/admin/no-leidas
async function noLeidasAdmin(req, res) {
  try {
    const count = await prisma.notificacion.count({
      where: { paraRol: 'ADMIN', leida: false },
    });
    res.json({ ok: true, data: count });
  } catch (error) {
    console.error('[notificacion.noLeidasAdmin]', error);
    res.json({ ok: true, data: 0 });
  }
}

// PATCH /api/notificaciones/admin/leer/:id
async function marcarAdminLeida(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });
    await prisma.notificacion.update({ where: { id }, data: { leida: true } });
    res.json({ ok: true, message: 'Notificación marcada como leída' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, message: 'Notificación no encontrada' });
    }
    console.error('[notificacion.marcarAdminLeida]', error);
    res.status(500).json({ ok: false, message: 'Error al marcar notificación' });
  }
}

// PATCH /api/notificaciones/admin/leer-todas
async function marcarAdminTodasLeidas(req, res) {
  try {
    await prisma.notificacion.updateMany({
      where: { paraRol: 'ADMIN', leida: false },
      data: { leida: true },
    });
    res.json({ ok: true, message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('[notificacion.marcarAdminTodasLeidas]', error);
    res.status(500).json({ ok: false, message: 'Error al marcar notificaciones' });
  }
}

module.exports = { crearNotificacion, misNotificaciones, noLeidas, marcarLeida, marcarTodasLeidas, notificacionesAdmin, noLeidasAdmin, marcarAdminLeida, marcarAdminTodasLeidas };