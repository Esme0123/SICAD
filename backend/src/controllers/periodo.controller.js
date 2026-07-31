// src/controllers/periodo.controller.js
// Gestión de periodos académicos (gestiones_academicas) y su visibilidad en la App Móvil

const prisma = require('../config/db');

// ── GET /api/periodos ─────────────────────────────────────────
// Lista las gestiones académicas.
// - Empleados / App Móvil (rol EMPLEADO): solo visibles en móvil o activas.
// - Administradores / Dashboard: todas, con su estado esVisibleMovil.
async function getGestionesAcademicas(req, res) {
  try {
    const esMovil = req.usuario?.rol === 'EMPLEADO';

    const where = esMovil
      ? { OR: [{ esVisibleMovil: true }, { activo: true }] }
      : {};

    const gestiones = await prisma.gestionAcademica.findMany({
      where,
      orderBy: [{ activo: 'desc' }, { fechaInicio: 'desc' }],
    });

    res.json({ ok: true, data: gestiones });
  } catch (error) {
    console.error('[periodo.getGestionesAcademicas]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener los periodos académicos' });
  }
}

// ── PATCH /api/periodos/:id/visibilidad ───────────────────────
// Actualiza la visibilidad de una gestión en la App Móvil.
// Body: { esVisibleMovil: boolean }
async function updateVisibilidadMovil(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ ok: false, message: 'ID inválido' });
    }

    const { esVisibleMovil } = req.body;
    if (typeof esVisibleMovil !== 'boolean') {
      return res.status(400).json({ ok: false, message: 'esVisibleMovil (boolean) es requerido' });
    }

    const gestion = await prisma.gestionAcademica.findUnique({ where: { id } });
    if (!gestion) {
      return res.status(404).json({ ok: false, message: 'Periodo académico no encontrado' });
    }

    const updated = await prisma.gestionAcademica.update({
      where: { id },
      data: { esVisibleMovil },
    });

    res.json({ ok: true, data: updated });
  } catch (error) {
    console.error('[periodo.updateVisibilidadMovil]', error);
    res.status(500).json({ ok: false, message: 'Error al actualizar la visibilidad del periodo' });
  }
}

module.exports = { getGestionesAcademicas, updateVisibilidadMovil };
