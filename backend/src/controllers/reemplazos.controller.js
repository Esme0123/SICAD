// src/controllers/reemplazos.controller.js
// Gestión de solicitudes de Reemplazo entre Empleados.
//
// Flujo:
//   1. El solicitante (App Móvil) pide que un compañero cubra sus bloques en
//      una fecha concreta. Puede ser una petición ABIERTA (cualquier compañero)
//      o dirigida a un EMPLEADO ESPECÍFICO.
//   2. El reemplazante acepta o rechaza desde la App Móvil.
//   3. Al ACEPTAR, el sistema:
//        a. Cambia el estado y asigna el reemplazante.
//        b. Crea un HorarioAsignado excepcional (fechaEspecifica) al REEMPLAZANTE
//           para esa fecha/bloques → habilita su marcación y suma a su
//           Control de Horas.
//        c. El SOLICITANTE figura como "Justificado" en su historial de
//           asistencia con la observación "Reemplazado por [Nombre]"
//           (se calcula en miHistorial / reportes).

const prisma = require('../config/db');
const { crearNotificacion } = require('./notificacion.controller');
const { obtenerOCrearGestionPorNombre } = require('../utils/periodo.utils');

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const ESTADOS = ['PENDIENTE', 'ACEPTADO', 'RECHAZADO'];

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

/**
 * Bloques programados del empleado para una fecha concreta.
 * Incluye horario recurrente (diaSemana del periodo académico de la fecha) y
 * horarios excepcionales (fechaEspecifica). Devuelve el detalle del Periodo.
 */
async function obtenerBloquesDelDia(usuarioId, fechaStr) {
  const diaSemana = DIAS_SEMANA[parseLocalDate(fechaStr).getDay()];
  const periodoAcademico = obtenerPeriodoDeFechaStr(fechaStr);
  const { start, end } = rangoDelDia(fechaStr);

  const horarios = await prisma.horarioAsignado.findMany({
    where: {
      usuarioId,
      OR: [
        { diaSemana, periodoAcademico },
        { fechaEspecifica: { gte: start, lte: end } },
      ],
    },
    include: { periodo: { select: { id: true, nombre: true, horaInicio: true, horaFin: true, duracion: true } } },
  });

  const vistos = new Set();
  const bloques = [];
  for (const h of horarios) {
    const p = h.periodo;
    if (!p) continue;
    if (vistos.has(p.id)) continue; // dedup (recurrente + excepcional del mismo día)
    vistos.add(p.id);
    bloques.push({ id: p.id, nombre: p.nombre, horaInicio: p.horaInicio, horaFin: p.horaFin, duracion: p.duracion });
  }

  // Excluir bloques que ya están cubiertos por una solicitud de reemplazo
  // PENDIENTE/ACEPTADA del mismo solicitante para la misma fecha.
  const previas = await prisma.solicitudReemplazo.findMany({
    where: {
      solicitanteId: usuarioId,
      fecha: { gte: start, lte: end },
      estado: { in: ['PENDIENTE', 'ACEPTADO'] },
    },
    select: { bloques: true },
  });
  const cubiertos = new Set();
  for (const s of previas) {
    for (const b of Array.isArray(s.bloques) ? s.bloques : []) {
      if (b && b.id != null) cubiertos.add(Number(b.id));
    }
  }

  return bloques.filter((b) => !cubiertos.has(b.id));
}

/**
 * Set de periodos ocupados de un empleado para una fecha (recurrente + excepcional).
 * Usado para validar conflictos al aceptar un reemplazo.
 */
async function periodosOcupadosDelDia(usuarioId, fechaStr) {
  const diaSemana = DIAS_SEMANA[parseLocalDate(fechaStr).getDay()];
  const periodoAcademico = obtenerPeriodoDeFechaStr(fechaStr);
  const { start, end } = rangoDelDia(fechaStr);

  const horarios = await prisma.horarioAsignado.findMany({
    where: {
      usuarioId,
      OR: [
        { diaSemana, periodoAcademico },
        { fechaEspecifica: { gte: start, lte: end } },
      ],
    },
    select: { periodoId: true },
  });
  return new Set(horarios.map((h) => h.periodoId));
}

async function recalcularHorasProgramadas(tx, usuarioId) {
  const todos = await tx.horarioAsignado.findMany({
    where: { usuarioId },
    include: { periodo: { select: { duracion: true } } },
  });
  const totalMin = todos.reduce((acc, h) => acc + (h.periodo?.duracion ?? 0), 0);
  await tx.usuario.update({
    where: { id: usuarioId },
    data: { horasProgramadas: parseFloat((totalMin / 60).toFixed(2)) },
  });
}

// ── GET /api/reemplazos/bloques?fecha=YYYY-MM-DD ─────────────
// Bloques PROGRAMADOS del empleado autenticado (solicitante) para la fecha.
async function bloquesDelDia(req, res) {
  try {
    const usuarioId = parseInt(req.usuario.id);
    const { fecha } = req.query;
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ ok: false, message: 'La fecha es requerida (formato YYYY-MM-DD)' });
    }

    const bloques = await obtenerBloquesDelDia(usuarioId, fecha);
    res.json({ ok: true, data: bloques });
  } catch (error) {
    console.error('[reemplazos.bloquesDelDia]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener bloques programados' });
  }
}

// ── GET /api/reemplazos/empleados ────────────────────────────
// Catálogo de compañeros activos para dirigir una petición de reemplazo.
async function listarEmpleados(req, res) {
  try {
    const usuarioId = parseInt(req.usuario.id);
    const empleados = await prisma.usuario.findMany({
      where: { id: { not: usuarioId }, rol: 'EMPLEADO', activo: true },
      select: { id: true, nombre: true, codigo: true, ci: true },
      orderBy: { nombre: 'asc' },
    });
    res.json({ ok: true, data: empleados });
  } catch (error) {
    console.error('[reemplazos.listarEmpleados]', error);
    res.json({ ok: true, data: [] });
  }
}

// ── POST /api/reemplazos/solicitar ───────────────────────────
// Body: { fecha, bloques: [{id,...}], esAbierta, reemplazanteId?, comentario }
async function solicitar(req, res) {
  try {
    const solicitanteId = parseInt(req.usuario.id);
    const { fecha, bloques, esAbierta, reemplazanteId, comentario } = req.body;

    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ ok: false, message: 'La fecha es requerida (formato YYYY-MM-DD)' });
    }
    if (!Array.isArray(bloques) || bloques.length === 0) {
      return res.status(400).json({ ok: false, message: 'Debes seleccionar al menos un bloque.' });
    }

    const abierta = esAbierta !== false;
    const destinatarioId = !abierta ? parseInt(reemplazanteId) : null;
    if (!abierta) {
      if (!destinatarioId || isNaN(destinatarioId)) {
        return res.status(400).json({ ok: false, message: 'Debes seleccionar un empleado para la petición específica.' });
      }
      if (destinatarioId === solicitanteId) {
        return res.status(400).json({ ok: false, message: 'No puedes pedirte reemplazo a ti mismo.' });
      }
      const destinatario = await prisma.usuario.findUnique({
        where: { id: destinatarioId },
        select: { id: true, rol: true, activo: true },
      });
      if (!destinatario || !destinatario.activo || destinatario.rol !== 'EMPLEADO') {
        return res.status(400).json({ ok: false, message: 'El empleado seleccionado no existe o no está activo.' });
      }
    }

    // Normalizar bloques
    let bloquesIds = bloques.map((b) => Number(b.id)).filter((id) => !isNaN(id));
    if (bloquesIds.length === 0) {
      return res.status(400).json({ ok: false, message: 'Los bloques enviados no son válidos.' });
    }

    // ── Validación clave: los bloques deben ser parte del horario ACTIVO del
    //    solicitante en esa fecha.
    const activos = await obtenerBloquesDelDia(solicitanteId, fecha);
    if (activos.length === 0) {
      return res.status(400).json({ ok: false, message: `No tienes bloques programados para el ${fecha}.` });
    }
    const activoSet = new Set(activos.map((b) => b.id));
    const noActivos = bloquesIds.filter((id) => !activoSet.has(id));
    if (noActivos.length > 0) {
      return res.status(400).json({
        ok: false,
        message: `Los bloques ${noActivos.join(', ')} no forman parte de tu horario programado en esa fecha.`,
      });
    }

    // Usar los datos del catálogo (evita duraciones manipulas)
    const bloquesCatalogo = activos.filter((b) => bloquesIds.includes(b.id));
    const horasTotales = bloquesCatalogo.reduce((acc, b) => acc + (Number(b.duracion) || 0), 0);
    if (horasTotales <= 0) {
      return res.status(400).json({ ok: false, message: 'No se pudo calcular el total de horas de los bloques seleccionados.' });
    }

    const { start } = rangoDelDia(fecha);

    const solicitud = await prisma.solicitudReemplazo.create({
      data: {
        solicitanteId,
        reemplazanteId: abierta ? null : destinatarioId,
        esAbierta: abierta,
        fecha: start,
        bloques: bloquesCatalogo,
        horasTotales,
        comentario: comentario ? String(comentario).trim() || null : null,
      },
      include: {
        solicitante: { select: { id: true, nombre: true, codigo: true, ci: true } },
        reemplazante: { select: { id: true, nombre: true, codigo: true, ci: true } },
      },
    });

    const nombreSolicitante = solicitud.solicitante?.nombre || 'Un empleado';
    if (!abierta && destinatarioId) {
      crearNotificacion({
        titulo: '¡Te piden un reemplazo!',
        mensaje: `${nombreSolicitante} te pidió cubrir ${bloquesCatalogo.length} bloque(s) el ${fecha}. Revisa la sección Reemplazos.`,
        usuarioId: destinatarioId,
        paraRol: 'EMPLEADO',
      });
    } else {
      crearNotificacion({
        titulo: 'Nueva petición de reemplazo',
        mensaje: `${nombreSolicitante} pide reemplazo abierto para el ${fecha} (${formatoHoras(horasTotales)} h).`,
        paraRol: 'ADMIN',
      });
    }

    res.status(201).json({ ok: true, data: solicitud });
  } catch (error) {
    console.error('[reemplazos.solicitar]', error);
    res.status(500).json({ ok: false, message: 'Error al crear la solicitud de reemplazo' });
  }
}

// ── GET /api/reemplazos/mis-solicitudes ──────────────────────
// Devuelve:
//   enviadas  → solicitudes creadas por el empleado (solicitanteId = yo)
//   recibidas → dirigidas a él (reemplazanteId = yo) o peticiones ABIERTAS
//               pendientes de otros empleados.
async function misSolicitudes(req, res) {
  try {
    const usuarioId = parseInt(req.usuario.id);

    const [enviadas, recibidas] = await Promise.all([
      prisma.solicitudReemplazo.findMany({
        where: { solicitanteId: usuarioId },
        include: {
          solicitante: { select: { id: true, nombre: true, codigo: true, ci: true } },
          reemplazante: { select: { id: true, nombre: true, codigo: true, ci: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.solicitudReemplazo.findMany({
        where: {
          OR: [
            { reemplazanteId: usuarioId },
            { esAbierta: true, estado: 'PENDIENTE', solicitanteId: { not: usuarioId } },
          ],
        },
        include: {
          solicitante: { select: { id: true, nombre: true, codigo: true, ci: true } },
          reemplazante: { select: { id: true, nombre: true, codigo: true, ci: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({ ok: true, data: { enviadas, recibidas } });
  } catch (error) {
    console.error('[reemplazos.misSolicitudes]', error);
    res.json({ ok: true, data: { enviadas: [], recibidas: [] } });
  }
}

// ── PUT /api/reemplazos/:id/aceptar ──────────────────────────
// El reemplazante acepta la solicitud.
// 1. Estado → ACEPTADO y reemplazante_id = yo.
// 2. HorarioAsignado excepcional (fechaEspecifica) al reemplazante → habilitar
//    marcación y sumar al Control de Horas.
// 3. El solicitante queda "Justificado" en su historial (se evalúa en
//    miHistorial/reportes con la observación "Reemplazado por [Nombre]").
async function aceptar(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });

    const reemplazanteId = parseInt(req.usuario.id);

    const solicitud = await prisma.solicitudReemplazo.findUnique({
      where: { id },
      include: {
        solicitante: { select: { id: true, nombre: true } },
        reemplazante: { select: { id: true, nombre: true } },
      },
    });
    if (!solicitud) return res.status(404).json({ ok: false, message: 'Solicitud no encontrada' });

    if (solicitud.estado !== 'PENDIENTE') {
      return res.status(400).json({
        ok: false,
        message: `La solicitud ya fue ${solicitud.estado === 'ACEPTADO' ? 'aceptada' : 'rechazada'}.`,
      });
    }
    if (solicitud.solicitanteId === reemplazanteId) {
      return res.status(400).json({ ok: false, message: 'No puedes aceptar tu propia petición de reemplazo.' });
    }
    if (!solicitud.esAbierta && solicitud.reemplazanteId !== reemplazanteId) {
      return res.status(403).json({ ok: false, message: 'Esta petición está dirigida a otro empleado.' });
    }

    const bloques = Array.isArray(solicitud.bloques) ? solicitud.bloques : [];
    if (bloques.length === 0) {
      return res.status(400).json({ ok: false, message: 'La solicitud no tiene bloques asociados.' });
    }

    const fechaStr = getLocalDateString(solicitud.fecha);
    const diaSemana = DIAS_SEMANA[parseLocalDate(fechaStr).getDay()];
    const periodoAcademico = obtenerPeriodoDeFechaStr(fechaStr);
    const { start } = rangoDelDia(fechaStr);

    // Validar que el reemplazante no tenga ya ocupados esos bloques en la fecha
    const ocupados = await periodosOcupadosDelDia(reemplazanteId, fechaStr);
    const enConflicto = bloques.filter((b) => ocupados.has(Number(b.id)));
    if (enConflicto.length > 0) {
      return res.status(409).json({
        ok: false,
        message: `Tienes un conflicto de horario en los bloques ${enConflicto.map((b) => b.nombre || `#${b.id}`).join(', ')} para esa fecha.`,
      });
    }

    const gestion = await obtenerOCrearGestionPorNombre(prisma, periodoAcademico);

    await prisma.$transaction(async (tx) => {
      // Horario excepcional del REEMPLAZANTE (habilita marcación + Control de Horas)
      await tx.horarioAsignado.createMany({
        data: bloques.map((b) => ({
          usuarioId: reemplazanteId,
          periodoId: Number(b.id),
          diaSemana,
          periodoAcademico,
          gestionId: gestion.id,
          fechaEspecifica: start,
        })),
        skipDuplicates: true,
      });

      await recalcularHorasProgramadas(tx, reemplazanteId);

      await tx.solicitudReemplazo.update({
        where: { id },
        data: { estado: 'ACEPTADO', reemplazanteId, fechaRespuesta: new Date() },
      });
    });

    const actualizada = await prisma.solicitudReemplazo.findUnique({
      where: { id },
      include: {
        solicitante: { select: { id: true, nombre: true, codigo: true, ci: true } },
        reemplazante: { select: { id: true, nombre: true, codigo: true, ci: true } },
      },
    });

    crearNotificacion({
      titulo: '¡Reemplazo aceptado!',
      mensaje: `${actualizada.reemplazante?.nombre || 'Un compañero'} aceptó cubrir ${bloques.length} bloque(s) el ${fechaStr}.`,
      usuarioId: solicitud.solicitanteId,
      paraRol: 'EMPLEADO',
    });

    res.json({ ok: true, data: actualizada });
  } catch (error) {
    console.error('[reemplazos.aceptar]', error);
    res.status(500).json({ ok: false, message: 'Error al aceptar la solicitud de reemplazo' });
  }
}

// ── PUT /api/reemplazos/:id/rechazar ─────────────────────────
// El reemplazante rechaza la solicitud, o el solicitante cancela la suya.
async function rechazar(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });

    const usuarioId = parseInt(req.usuario.id);

    const solicitud = await prisma.solicitudReemplazo.findUnique({
      where: { id },
      include: { solicitante: { select: { id: true, nombre: true } } },
    });
    if (!solicitud) return res.status(404).json({ ok: false, message: 'Solicitud no encontrada' });

    if (solicitud.estado !== 'PENDIENTE') {
      return res.status(400).json({
        ok: false,
        message: `La solicitud ya fue ${solicitud.estado === 'ACEPTADO' ? 'aceptada' : 'rechazada'}.`,
      });
    }

    const esSolicitante = solicitud.solicitanteId === usuarioId;
    const esDestinatario = solicitud.reemplazanteId === usuarioId;
    if (!esSolicitante && !esDestinatario) {
      return res.status(403).json({ ok: false, message: 'No tienes permiso para rechazar esta solicitud.' });
    }

    const actualizada = await prisma.solicitudReemplazo.update({
      where: { id },
      data: { estado: 'RECHAZADO', fechaRespuesta: new Date() },
      include: {
        solicitante: { select: { id: true, nombre: true, codigo: true, ci: true } },
        reemplazante: { select: { id: true, nombre: true, codigo: true, ci: true } },
      },
    });

    if (esDestinatario) {
      crearNotificacion({
        titulo: 'Reemplazo rechazado',
        mensaje: `${actualizada.solicitante?.nombre || 'Tu'} solicitud de reemplazo del ${getLocalDateString(solicitud.fecha)} fue RECHAZADA por ${actualizada.reemplazante?.nombre || 'el compañero'}.`,
        usuarioId: solicitud.solicitanteId,
        paraRol: 'EMPLEADO',
      });
    } else if (esSolicitante) {
      crearNotificacion({
        titulo: 'Reemplazo cancelado',
        mensaje: `Cancelaste tu petición de reemplazo del ${getLocalDateString(solicitud.fecha)}.`,
        paraRol: 'ADMIN',
      });
    }

    res.json({ ok: true, data: actualizada });
  } catch (error) {
    console.error('[reemplazos.rechazar]', error);
    res.status(500).json({ ok: false, message: 'Error al rechazar la solicitud de reemplazo' });
  }
}

// ── GET /api/reemplazos/admin ────────────────────────────────
// Historial general para el Panel Web. Query: ?estado=&fecha=&q=
async function adminListar(req, res) {
  try {
    const { estado, fecha, q } = req.query;
    const where = {};

    if (estado && ESTADOS.includes(estado)) where.estado = estado;
    if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const r = rangoDelDia(fecha);
      where.fecha = { gte: r.start, lte: r.end };
    }
    if (q && q.trim()) {
      const qLike = q.trim().toLowerCase();
      where.OR = [
        { solicitante: { OR: [{ nombre: { contains: qLike, mode: 'insensitive' } }, { codigo: { contains: qLike, mode: 'insensitive' } }, { ci: { contains: qLike, mode: 'insensitive' } }] } },
        { reemplazante: { OR: [{ nombre: { contains: qLike, mode: 'insensitive' } }, { codigo: { contains: qLike, mode: 'insensitive' } }, { ci: { contains: qLike, mode: 'insensitive' } }] } },
      ];
    }

    const solicitudes = await prisma.solicitudReemplazo.findMany({
      where,
      include: {
        solicitante: { select: { id: true, nombre: true, codigo: true, ci: true } },
        reemplazante: { select: { id: true, nombre: true, codigo: true, ci: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ ok: true, data: solicitudes });
  } catch (error) {
    console.error('[reemplazos.adminListar]', error);
    res.status(500).json({ ok: false, message: 'Error al listar solicitudes de reemplazo' });
  }
}

module.exports = { bloquesDelDia, listarEmpleados, solicitar, misSolicitudes, aceptar, rechazar, adminListar };