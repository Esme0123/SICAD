// src/controllers/periodo.controller.js
// Gestión de periodos académicos (gestiones_academicas) y su visibilidad en la App Móvil

const prisma = require('../config/db');

/**
 * Deriva el nombre del periodo académico al que pertenece una fecha.
 * Ej: 2026-08-03 → "2-2026", 2026-07-15 → "Invierno 2026"
 *
 * @param {Date|string} fecha
 * @returns {string|null} Ej: "1-2026", "Invierno 2026", "2-2026"
 */
function obtenerPeriodoDeFecha(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const iso = d.toISOString().split('T')[0];
  const [y, m] = iso.split('-').map(Number);
  if (m === 1) return `Verano ${y}`;
  if (m >= 2 && m <= 6) return `1-${y}`;
  if (m === 7) return `Invierno ${y}`;
  if (m >= 8 && m <= 12) return `2-${y}`;
  return null;
}

/**
 * Clave numérica de ordenamiento de un periodo académico
 * (mayor = más reciente). Ej: "2-2026" → 20263, "1-2026" → 20261
 *
 * @param {string} nombre
 * @returns {number}
 */
function sortKeyPeriodo(nombre) {
  let m = nombre.match(/^(Verano|Invierno)\s(\d{4})$/);
  if (m) return parseInt(m[2], 10) * 10 + (m[1] === 'Verano' ? 0 : 2);
  m = nombre.match(/^1-(\d{4})$/);
  if (m) return parseInt(m[1], 10) * 10 + 1;
  m = nombre.match(/^2-(\d{4})$/);
  if (m) return parseInt(m[1], 10) * 10 + 3;
  return 0;
}

// ── GET /api/periodos/disponibles ─────────────────────────────
// Devuelve SOLO los periodos académicos que tienen datos reales
// registrados: horarios asignados (HorarioAsignado) y/o marcaciones
// (Asistencia).
// Query: ?usuarioId=123 (opcional — filtra por empleado)
// Response: { ok: true, data: [{ value, label }] } ordenado de más
// reciente a más antiguo.
async function getPeriodosDisponibles(req, res) {
  try {
    const usuarioId = req.query.usuarioId ? parseInt(req.query.usuarioId) : undefined;
    const usuarioWhere = {};
    if (usuarioId && !isNaN(usuarioId)) usuarioWhere.usuarioId = usuarioId;

    const periodos = new Set();

    // 1) Periodos presentes en las asignaciones de horarios
    const conHorarios = await prisma.horarioAsignado.findMany({
      where: usuarioWhere,
      select: { periodoAcademico: true },
      distinct: ['periodoAcademico'],
    });
    for (const h of conHorarios) {
      if (h.periodoAcademico) periodos.add(h.periodoAcademico);
    }

    // 2) Periodos con marcaciones de asistencia (derivados de la fecha)
    const conAsistencias = await prisma.asistencia.findMany({
      where: usuarioWhere,
      select: { fecha: true },
      distinct: ['fecha'],
    });
    for (const a of conAsistencias) {
      const nombre = obtenerPeriodoDeFecha(a.fecha);
      if (nombre) periodos.add(nombre);
    }

    const data = Array.from(periodos)
      .map((nombre) => ({ value: nombre, label: nombre }))
      .sort((a, b) => sortKeyPeriodo(b.value) - sortKeyPeriodo(a.value));

    res.json({ ok: true, data });
  } catch (error) {
    console.error('[periodo.getPeriodosDisponibles]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener los periodos disponibles' });
  }
}

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

module.exports = { getGestionesAcademicas, updateVisibilidadMovil, getPeriodosDisponibles };
