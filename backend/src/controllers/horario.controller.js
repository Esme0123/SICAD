// src/controllers/horario.controller.js
// Gestión del catálogo de Periodos y asignación de horarios a empleados

const prisma = require('../config/db');
const { obtenerPeriodoActual } = require('../utils/periodo.utils');

// ── GET /api/horarios/periodos ────────────────────────────────
// Devuelve todos los periodos activos del catálogo
async function getPeriodos(req, res) {
  try {
    const periodos = await prisma.periodo.findMany({
      where: { activo: true },
      orderBy: { horaInicio: 'asc' },
    });
    res.json({ ok: true, data: periodos });
  } catch (error) {
    console.error('[horario.getPeriodos]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener periodos' });
  }
}

// ── GET /api/horarios/:usuarioId ──────────────────────────────
// Devuelve los horarios asignados de un empleado agrupados por día
// Query params: ?periodoAcademico=Invierno%202026
async function getHorarioUsuario(req, res) {
  try {
    const usuarioId = parseInt(req.params.usuarioId);
    if (isNaN(usuarioId)) return res.status(400).json({ ok: false, message: 'ID de usuario inválido' });

    const { periodoAcademico } = req.query;
    const where = { usuarioId };
    if (periodoAcademico) where.periodoAcademico = periodoAcademico;

    const horarios = await prisma.horarioAsignado.findMany({
      where,
      include: { periodo: true },
      orderBy: [{ diaSemana: 'asc' }, { periodo: { horaInicio: 'asc' } }],
    });
    res.json({ ok: true, data: horarios });
  } catch (error) {
    console.error('[horario.getHorarioUsuario]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener horario del usuario' });
  }
}

// ── GET /api/horarios/periodos-academicos ──────────────────────
// Devuelve los periodos académicos distintos asociados a un usuario
// Query params: ?usuarioId=123
async function getPeriodosAcademicos(req, res) {
  try {
    const usuarioId = req.query.usuarioId ? parseInt(req.query.usuarioId) : undefined;

    const where = {};
    if (usuarioId && !isNaN(usuarioId)) where.usuarioId = usuarioId;

    const result = await prisma.horarioAsignado.findMany({
      where,
      select: { periodoAcademico: true },
      distinct: ['periodoAcademico'],
      orderBy: { periodoAcademico: 'desc' },
    });

    const data = result.map(r => r.periodoAcademico);
    res.json({ ok: true, data });
  } catch (error) {
    console.error('[horario.getPeriodosAcademicos]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener periodos académicos' });
  }
}

// ── POST /api/horarios/asignar ────────────────────────────────
// Reemplaza los horarios de un día para un usuario y recalcula horasProgramadas
// Body: { usuarioId: number, diaSemana: string, periodosIds: number[], periodoAcademico?: string }
async function asignar(req, res) {
  try {
    const { usuarioId, diaSemana, periodosIds, periodoAcademico } = req.body;

    if (!usuarioId || !diaSemana || !Array.isArray(periodosIds)) {
      return res.status(400).json({
        ok: false,
        message: 'usuarioId, diaSemana y periodosIds (array) son requeridos',
      });
    }

    const uid = parseInt(usuarioId);
    const periodo = periodoAcademico || obtenerPeriodoActual();

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Eliminar horarios previos de ese usuario en ese día
      await tx.horarioAsignado.deleteMany({
        where: { usuarioId: uid, diaSemana },
      });

      // 2. Insertar los nuevos horarios (si el array no está vacío)
      if (periodosIds.length > 0) {
        await tx.horarioAsignado.createMany({
          data: periodosIds.map((periodoId) => ({
            usuarioId: uid,
            periodoId: parseInt(periodoId),
            diaSemana,
            periodoAcademico: periodo,
          })),
          skipDuplicates: true,
        });
      }

      // 3. Recalcular horasProgramadas: suma total de duración de TODOS los horarios del usuario
      const todosLosHorarios = await tx.horarioAsignado.findMany({
        where: { usuarioId: uid },
        include: { periodo: { select: { duracion: true } } },
      });

      const totalMinutos = todosLosHorarios.reduce(
        (acc, h) => acc + (h.periodo?.duracion ?? 0),
        0
      );
      const horasProgramadas = parseFloat((totalMinutos / 60).toFixed(2));

      // 4. Actualizar el campo horasProgramadas del usuario
      const usuarioActualizado = await tx.usuario.update({
        where: { id: uid },
        data: { horasProgramadas },
        select: { id: true, nombre: true, horasBase: true, horasProgramadas: true },
      });

      return { usuarioActualizado, horariosAsignados: todosLosHorarios.length };
    });

    res.json({ ok: true, data: resultado });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, message: 'Usuario o periodo no encontrado' });
    }
    console.error('[horario.asignar]', error);
    res.status(500).json({ ok: false, message: 'Error al asignar horario' });
  }
}

// ── GET /api/horarios/empleados ──────────────────────────────
// Devuelve todos los empleados con sus horarios asignados
// Query params: ?periodoAcademico=Invierno%202026
async function getHorariosEmpleados(req, res) {
  try {
    const { periodoAcademico } = req.query;
    const horariosWhere = periodoAcademico ? { periodoAcademico } : {};

    const empleados = await prisma.usuario.findMany({
      where: { rol: 'EMPLEADO', activo: true },
      select: {
        id: true,
        nombre: true,
        email: true,
        horasBase: true,
        horasProgramadas: true,
        codigo: true,
        ci: true,
        celular: true,
        activo: true,
        rol: true,
        horariosAsignados: {
          where: horariosWhere,
          include: { periodo: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
    res.json({ ok: true, data: empleados });
  } catch (error) {
    console.error('[horario.getHorariosEmpleados]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener horarios de empleados' });
  }
}

// ── DELETE /api/horarios/:id ──────────────────────────────────
// Elimina un bloque de horario asignado y recalcula horasProgramadas
async function eliminarAsignacion(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });
    const asignacion = await prisma.horarioAsignado.findUnique({ where: { id } });
    if (!asignacion) {
      return res.status(404).json({ ok: false, message: 'Asignación no encontrada' });
    }

    const { usuarioId } = asignacion;

    await prisma.$transaction(async (tx) => {
      await tx.horarioAsignado.delete({ where: { id } });

      // Recalcular horasProgramadas
      const todosLosHorarios = await tx.horarioAsignado.findMany({
        where: { usuarioId },
        include: { periodo: { select: { duracion: true } } },
      });

      const totalMinutos = todosLosHorarios.reduce(
        (acc, h) => acc + (h.periodo?.duracion ?? 0),
        0
      );
      const horasProgramadas = parseFloat((totalMinutos / 60).toFixed(2));

      await tx.usuario.update({
        where: { id: usuarioId },
        data: { horasProgramadas },
      });
    });

    res.json({ ok: true, message: 'Horario eliminado correctamente' });
  } catch (error) {
    console.error('[horario.eliminarAsignacion]', error);
    res.status(500).json({ ok: false, message: 'Error al eliminar horario' });
  }
}

module.exports = { getPeriodos, getHorarioUsuario, asignar, getHorariosEmpleados, eliminarAsignacion, getPeriodosAcademicos };

