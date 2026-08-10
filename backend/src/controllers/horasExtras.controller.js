// src/controllers/horasExtras.controller.js
// Gestión de solicitudes de Horas Extras / Recuperación de Horas.
//
// Flujo:
//   1. El empleado (App Móvil) solicita recuperar horas en una fecha,
//      seleccionando bloques que estén LIBRES (sin horario asignado).
//   2. El administrador (Panel Web) aprueba o rechaza la solicitud.
//   3. Al aprobar, se crea un HorarioAsignado excepcional (fechaEspecifica)
//      que habilita el marcaje en la App y suma esas horas al control de horas.

const prisma = require('../config/db');
const { crearNotificacion } = require('./notificacion.controller');
const { obtenerOCrearGestionPorNombre } = require('../utils/periodo.utils');

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const ESTADOS = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];

function parseLocalDate(isoStr) {
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Convierte un Date a "YYYY-MM-DD" con getters LOCALES (evita desfase UTC). */
function getLocalDateString(d) {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Rango [00:00:00.000, 23:59:59.999] local de una fecha para consultas @db.Date. */
function rangoDelDia(isoStr) {
  const [y, m, d] = isoStr.split('-').map(Number);
  return {
    start: new Date(y, m - 1, d, 0, 0, 0, 0),
    end: new Date(y, m - 1, d, 23, 59, 59, 999),
  };
}

/**
 * Devuelve el periodo académico al que pertenece una fecha.
 * Ej: "2026-08-14" → "2-2026", "2026-07-15" → "Invierno 2026".
 */
function obtenerPeriodoDeFechaStr(isoStr) {
  const [y, m] = isoStr.split('-').map(Number);
  if (m === 1) return `Verano ${y}`;
  if (m >= 2 && m <= 6) return `1-${y}`;
  if (m === 7) return `Invierno ${y}`;
  return `2-${y}`;
}

function formatoHoras(minutos) {
  const horas = Number(minutos) / 60;
  return Number(horas.toFixed(2));
}

// ── GET /api/horas-extras/bloques?fecha=YYYY-MM-DD ─────────────
// Bloques del catálogo con su disponibilidad para el empleado en la fecha.
// "LIBRE" → seleccionable. "ASIGNADO" → bloqueado (horario recurrente del día,
// horario excepcional de la fecha, o ya solicitado PENDIENTE/APROBADO).
async function bloquesDisponibles(req, res) {
  try {
    const empleadoId = parseInt(req.usuario.id);
    const { fecha } = req.query;
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ ok: false, message: 'La fecha es requerida (formato YYYY-MM-DD)' });
    }

    const diaSemana = DIAS_SEMANA[parseLocalDate(fecha).getDay()];
    const { start, end } = rangoDelDia(fecha);

    // Horarios del empleado: recurrentes (diaSemana) + excepcionales (fecha puntual)
    const horarios = await prisma.horarioAsignado.findMany({
      where: {
        usuarioId: empleadoId,
        OR: [{ diaSemana }, { fechaEspecifica: { gte: start, lte: end } }],
      },
      select: { periodoId: true },
    });
    const asignadoSet = new Set(horarios.map((h) => h.periodoId));

    // Bloques ya solicitados (sin resolver) para la misma fecha
    const previas = await prisma.solicitudHorasExtras.findMany({
      where: { empleadoId, fecha: { gte: start, lte: end }, estado: { in: ['PENDIENTE', 'APROBADO'] } },
      select: { bloques: true },
    });
    const solicitadoSet = new Set();
    for (const s of previas) {
      for (const b of Array.isArray(s.bloques) ? s.bloques : []) {
        if (b && b.id != null) solicitadoSet.add(Number(b.id));
      }
    }

    const periodos = await prisma.periodo.findMany({
      where: { activo: true },
      orderBy: { horaInicio: 'asc' },
      select: { id: true, nombre: true, horaInicio: true, horaFin: true, duracion: true },
    });

    const data = periodos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      horaInicio: p.horaInicio,
      horaFin: p.horaFin,
      duracion: p.duracion,
      estado: asignadoSet.has(p.id) || solicitadoSet.has(p.id) ? 'ASIGNADO' : 'LIBRE',
    }));

    res.json({ ok: true, data });
  } catch (error) {
    console.error('[horasExtras.bloquesDisponibles]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener bloques disponibles' });
  }
}

// ── POST /api/horas-extras/solicitar ───────────────────────────
// Body: { fecha: "YYYY-MM-DD", bloques: [{id, nombre, horaInicio, horaFin, duracion}], observacion }
async function solicitar(req, res) {
  try {
    const empleadoId = parseInt(req.usuario.id);
    const { fecha, bloques, observacion } = req.body;

    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ ok: false, message: 'La fecha es requerida (formato YYYY-MM-DD)' });
    }
    if (!Array.isArray(bloques) || bloques.length === 0) {
      return res.status(400).json({ ok: false, message: 'Debes seleccionar al menos un bloque.' });
    }

    const diaSemana = DIAS_SEMANA[parseLocalDate(fecha).getDay()];
    if (diaSemana === 'Domingo') {
      return res.status(400).json({ ok: false, message: 'No se pueden solicitar horas extras para un domingo.' });
    }

    const { start, end } = rangoDelDia(fecha);

    // Normalizar bloques recibidos
    let bloquesNormalizados = bloques.map((b) => ({
      id: Number(b.id),
      nombre: b.nombre || b.name || '',
      horaInicio: b.horaInicio || '',
      horaFin: b.horaFin || '',
      duracion: Number(b.duracion) || 0,
    }));
    if (bloquesNormalizados.some((b) => isNaN(b.id))) {
      return res.status(400).json({ ok: false, message: 'Los bloques enviados no son válidos.' });
    }

    // Recalcular los datos desde el catálogo (evita duraciones manipuladas)
    const catalogo = await prisma.periodo.findMany({
      where: { id: { in: bloquesNormalizados.map((b) => b.id) }, activo: true },
      select: { id: true, nombre: true, horaInicio: true, horaFin: true, duracion: true },
    });
    const mapa = new Map(catalogo.map((p) => [p.id, p]));
    bloquesNormalizados = bloquesNormalizados
      .filter((b) => mapa.has(b.id))
      .map((b) => {
        const c = mapa.get(b.id);
        return { id: c.id, nombre: c.nombre, horaInicio: c.horaInicio, horaFin: c.horaFin, duracion: c.duracion };
      });

    if (bloquesNormalizados.length === 0) {
      return res.status(400).json({ ok: false, message: 'Ninguno de los bloques seleccionados es válido.' });
    }

    // Validar que los bloques estén LIBRES: sin horario asignado (recurrente o excepcional)
    const asignados = await prisma.horarioAsignado.findMany({
      where: {
        usuarioId: empleadoId,
        OR: [{ diaSemana }, { fechaEspecifica: { gte: start, lte: end } }],
      },
      select: { periodoId: true },
    });
    const asignadoSet = new Set(asignados.map((a) => a.periodoId));

    // Sin solicitud previa PENDIENTE/APROBADO en la misma fecha
    const previas = await prisma.solicitudHorasExtras.findMany({
      where: { empleadoId, fecha: { gte: start, lte: end }, estado: { in: ['PENDIENTE', 'APROBADO'] } },
      select: { bloques: true },
    });
    const solicitadoSet = new Set();
    for (const s of previas) {
      for (const b of Array.isArray(s.bloques) ? s.bloques : []) {
        if (b && b.id != null) solicitadoSet.add(Number(b.id));
      }
    }

    const ocupados = bloquesNormalizados.filter((b) => asignadoSet.has(b.id) || solicitadoSet.has(b.id));
    if (ocupados.length > 0) {
      return res.status(400).json({
        ok: false,
        message: `Los bloques ${ocupados.map((b) => b.nombre || `#${b.id}`).join(', ')} no están disponibles en esta fecha.`,
      });
    }

    const horasTotales = bloquesNormalizados.reduce((acc, b) => acc + (Number(b.duracion) || 0), 0);
    if (horasTotales <= 0) {
      return res.status(400).json({ ok: false, message: 'No se pudo calcular el total de horas de los bloques seleccionados.' });
    }

    const solicitud = await prisma.solicitudHorasExtras.create({
      data: {
        empleadoId,
        fecha: start,
        bloques: bloquesNormalizados,
        horasTotales,
        observacion: observacion || null,
      },
      include: { empleado: { select: { id: true, nombre: true, codigo: true, ci: true } } },
    });

    // Notificar a administradores
    crearNotificacion({
      titulo: 'Nueva solicitud de horas extras',
      mensaje: `${solicitud.empleado?.nombre || 'Un empleado'} solicitó recuperar ${formatoHoras(horasTotales)} h el ${fecha} (${bloquesNormalizados.length} bloque(s)).`,
      paraRol: 'ADMIN',
    });

    res.status(201).json({ ok: true, data: solicitud });
  } catch (error) {
    console.error('[horasExtras.solicitar]', error);
    res.status(500).json({ ok: false, message: 'Error al crear la solicitud de horas extras' });
  }
}

// ── GET /api/horas-extras/mis-solicitudes ─────────────────────
// Query: ?estado=PENDIENTE|APROBADO|RECHAZADO&fecha=YYYY-MM-DD
async function misSolicitudes(req, res) {
  try {
    const empleadoId = parseInt(req.usuario.id);
    const { estado, fecha } = req.query;
    const where = { empleadoId };

    if (estado && ESTADOS.includes(estado)) where.estado = estado;
    if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const r = rangoDelDia(fecha);
      where.fecha = { gte: r.start, lte: r.end };
    }

    const solicitudes = await prisma.solicitudHorasExtras.findMany({
      where,
      include: { empleado: { select: { id: true, nombre: true, codigo: true, ci: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ ok: true, data: solicitudes });
  } catch (error) {
    console.error('[horasExtras.misSolicitudes]', error);
    res.json({ ok: true, data: [] });
  }
}

// ── GET /api/horas-extras/admin ───────────────────────────────
// Query: ?estado=&fecha=YYYY-MM-DD&empleadoId=&q=nombre|codigo|ci
async function adminListar(req, res) {
  try {
    const { estado, fecha, empleadoId, q } = req.query;
    const where = {};

    if (estado && ESTADOS.includes(estado)) where.estado = estado;
    if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const r = rangoDelDia(fecha);
      where.fecha = { gte: r.start, lte: r.end };
    }
    if (empleadoId && !isNaN(parseInt(empleadoId))) where.empleadoId = parseInt(empleadoId);
    if (q && q.trim()) {
      const qLike = q.trim().toLowerCase();
      where.empleado = {
        OR: [
          { nombre: { contains: qLike, mode: 'insensitive' } },
          { codigo: { contains: qLike, mode: 'insensitive' } },
          { ci: { contains: qLike, mode: 'insensitive' } },
        ],
      };
    }

    const solicitudes = await prisma.solicitudHorasExtras.findMany({
      where,
      include: { empleado: { select: { id: true, nombre: true, codigo: true, ci: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ ok: true, data: solicitudes });
  } catch (error) {
    console.error('[horasExtras.adminListar]', error);
    res.status(500).json({ ok: false, message: 'Error al listar solicitudes de horas extras' });
  }
}

// ── PUT /api/horas-extras/admin/:id/aprobar ───────────────────
// Aprueba la solicitud y crea el horario excepcional (fechaEspecifica)
// para que el sistema permita el marcaje en la App.
async function aprobar(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });
    const aprobadoPor = req.body.aprobadoPor ? parseInt(req.body.aprobadoPor) : undefined;

    const solicitud = await prisma.solicitudHorasExtras.findUnique({ where: { id } });
    if (!solicitud) return res.status(404).json({ ok: false, message: 'Solicitud no encontrada' });
    if (solicitud.estado !== 'PENDIENTE') {
      return res.status(400).json({
        ok: false,
        message: `La solicitud ya fue ${solicitud.estado === 'APROBADO' ? 'aprobada' : 'rechazada'}.`,
      });
    }

    const bloques = Array.isArray(solicitud.bloques) ? solicitud.bloques : [];
    if (bloques.length === 0) {
      return res.status(400).json({ ok: false, message: 'La solicitud no tiene bloques asociados.' });
    }

    const fechaStr = getLocalDateString(solicitud.fecha);
    const { start, end } = rangoDelDia(fechaStr);
    const diaSemana = DIAS_SEMANA[parseLocalDate(fechaStr).getDay()];
    const periodoAcademico = obtenerPeriodoDeFechaStr(fechaStr);

    // Validar que los bloques siguen LIBRES (no fueron asignados/cambiados en el ínterin)
    const asignados = await prisma.horarioAsignado.findMany({
      where: {
        usuarioId: solicitud.empleadoId,
        OR: [{ diaSemana }, { fechaEspecifica: { gte: start, lte: end } }],
      },
      select: { periodoId: true },
    });
    const asignadoSet = new Set(asignados.map((a) => a.periodoId));
    const enConflicto = bloques.filter((b) => asignadoSet.has(Number(b.id)));
    if (enConflicto.length > 0) {
      return res.status(409).json({
        ok: false,
        message: `No se puede aprobar: los bloques ${enConflicto.map((b) => b.nombre || `#${b.id}`).join(', ')} ya tienen horario asignado en esa fecha.`,
      });
    }

    const gestion = await obtenerOCrearGestionPorNombre(prisma, periodoAcademico);

    await prisma.$transaction(async (tx) => {
      // Horario excepcional (fechaEspecifica) para permitir el marcaje
      await tx.horarioAsignado.createMany({
        data: bloques.map((b) => ({
          usuarioId: solicitud.empleadoId,
          periodoId: Number(b.id),
          diaSemana,
          periodoAcademico,
          gestionId: gestion.id,
          fechaEspecifica: start,
        })),
        skipDuplicates: true,
      });

      // Recalcular horasProgramadas (incluye el horario excepcional creado)
      const todos = await tx.horarioAsignado.findMany({
        where: { usuarioId: solicitud.empleadoId },
        include: { periodo: { select: { duracion: true } } },
      });
      const totalMin = todos.reduce((acc, h) => acc + (h.periodo?.duracion ?? 0), 0);
      await tx.usuario.update({
        where: { id: solicitud.empleadoId },
        data: { horasProgramadas: parseFloat((totalMin / 60).toFixed(2)) },
      });

      await tx.solicitudHorasExtras.update({
        where: { id },
        data: { estado: 'APROBADO', aprobadoPor, fechaRespuesta: new Date() },
      });
    });

    const actualizada = await prisma.solicitudHorasExtras.findUnique({
      where: { id },
      include: { empleado: { select: { id: true, nombre: true, codigo: true, ci: true } } },
    });

    // Notificar al empleado
    crearNotificacion({
      titulo: 'Horas extras aprobadas',
      mensaje: `Tu solicitud de horas extras para el ${fechaStr} (${formatoHoras(solicitud.horasTotales)} h) fue APROBADA. Ya puedes marcar tu asistencia en la App.`,
      usuarioId: solicitud.empleadoId,
      paraRol: 'EMPLEADO',
    });

    res.json({ ok: true, data: actualizada });
  } catch (error) {
    console.error('[horasExtras.aprobar]', error);
    res.status(500).json({ ok: false, message: 'Error al aprobar la solicitud' });
  }
}

// ── PUT /api/horas-extras/admin/:id/rechazar ──────────────────
// Rechaza la solicitud. Body: { motivo?, aprobadoPor? }
async function rechazar(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });
    const aprobadoPor = req.body.aprobadoPor ? parseInt(req.body.aprobadoPor) : undefined;
    const motivo = req.body.motivo ? String(req.body.motivo).trim() : null;

    const solicitud = await prisma.solicitudHorasExtras.findUnique({ where: { id } });
    if (!solicitud) return res.status(404).json({ ok: false, message: 'Solicitud no encontrada' });
    if (solicitud.estado !== 'PENDIENTE') {
      return res.status(400).json({
        ok: false,
        message: `La solicitud ya fue ${solicitud.estado === 'APROBADO' ? 'aprobada' : 'rechazada'}.`,
      });
    }

    const actualizada = await prisma.solicitudHorasExtras.update({
      where: { id },
      data: { estado: 'RECHAZADO', aprobadoPor, motivoRechazo: motivo || null, fechaRespuesta: new Date() },
      include: { empleado: { select: { id: true, nombre: true, codigo: true, ci: true } } },
    });

    crearNotificacion({
      titulo: 'Horas extras rechazadas',
      mensaje: `Tu solicitud de horas extras para el ${getLocalDateString(solicitud.fecha)} fue RECHAZADA${motivo ? `: ${motivo}` : ''}.`,
      usuarioId: solicitud.empleadoId,
      paraRol: 'EMPLEADO',
    });

    res.json({ ok: true, data: actualizada });
  } catch (error) {
    console.error('[horasExtras.rechazar]', error);
    res.status(500).json({ ok: false, message: 'Error al rechazar la solicitud' });
  }
}

module.exports = { bloquesDisponibles, solicitar, misSolicitudes, adminListar, aprobar, rechazar };