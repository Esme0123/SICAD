// src/controllers/asistencia.controller.js
// NÚCLEO del sistema: lógica de escaneo QR con bloques de entrada/salida

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { verifyQRToken } = require('../utils/qrGenerator');
const { obtenerPeriodoActual, obtenerOCrearGestionActiva } = require('../utils/periodo.utils');

const QR_JWT_SECRET = process.env.JWT_SECRET || 'secret_fallback_key';

// ── Helpers ──────────────────────────────────────────────────

/**
 * Convierte "HH:MM" al número de minutos desde medianoche.
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Devuelve el nombre del día en español (sin tilde en Miercoles/Sabado)
 * según el formato que usa HorarioAsignado.diaSemana.
 */
function getDiaSemanaHoy() {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  return dias[getBoliviaDate().getDay()];
}

function toBoliviaDateStr(date = new Date()) {
  const bd = getBoliviaDate(date);
  const y = bd.getFullYear();
  const m = String(bd.getMonth() + 1).padStart(2, '0');
  const d = String(bd.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateOnly(date = new Date()) {
  const str = toBoliviaDateStr(date);
  return new Date(`${str}T00:00:00`);
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Devuelve el inicio (00:00:00.000) y el fin (23:59:59.999) del día UTC
 * correspondiente a una fecha, para usar en rangos de búsqueda en BD.
 */
function getBoliviaDate(date = new Date()) {
  return new Date(new Date(date).toLocaleString("en-US", { timeZone: "America/La_Paz" }));
}

function getDayRange(date = new Date()) {
  const bd = getBoliviaDate(date);
  const y = bd.getFullYear();
  const m = bd.getMonth();
  const d = bd.getDate();
  const start = new Date(Date.UTC(y, m, d, 4, 0, 0, 0));
  const end   = new Date(Date.UTC(y, m, d, 27, 59, 59, 999));
  return { start, end };
}

function getBoliviaTimeMinutes(date = new Date()) {
  const bd = getBoliviaDate(date);
  return bd.getHours() * 60 + bd.getMinutes();
}

/**
 * Formatea un Date a string "HH:mm" en hora Bolivia.
 */
function toBoliviaTimeStr(date) {
  const bd = getBoliviaDate(date);
  return `${String(bd.getHours()).padStart(2, '0')}:${String(bd.getMinutes()).padStart(2, '0')}`;
}

/**
 * Extrae la hora de inicio "HH:mm" del label de periodo "HH:mm–HH:mm".
 */
function extraerHoraInicio(periodoStr) {
  if (!periodoStr) return null;
  return periodoStr.split('–')[0] || null;
}

/**
 * Calcula PUNTUAL vs TARDANZA comparando matemáticamente la hora de entrada
 * contra el inicio del periodo más la tolerancia.
 *
 * @param {string} horaEntradaStr  - "HH:mm" en hora Bolivia
 * @param {string} horaInicioPeriodoStr - "HH:mm" del inicio del periodo
 * @param {number} toleranciaMinutos - minutos de tolerancia (default 20)
 * @returns {'PUNTUAL' | 'TARDANZA'}
 */
function calcularEstadoAsistencia(horaEntradaStr, horaInicioPeriodoStr, toleranciaMinutos = 20) {
  if (!horaEntradaStr || !horaInicioPeriodoStr) return 'PUNTUAL';

  const [hEnt, mEnt] = horaEntradaStr.split(':').map(Number);
  const [hIni, mIni] = horaInicioPeriodoStr.split(':').map(Number);

  const minutosEntrada = hEnt * 60 + mEnt;
  const minutosInicioLimite = (hIni * 60 + mIni) + Number(toleranciaMinutos);

  return minutosEntrada > minutosInicioLimite ? 'TARDANZA' : 'PUNTUAL';
}

// ── Bloques Continuos ────────────────────────────────────────

/**
 * Agrupa periodos consecutivos en Bloques Continuos.
 * Dos periodos son consecutivos si horaFin del primero === horaInicio del siguiente.
 * @param {Array} horarios - Array de { periodo: { horaInicio, horaFin, id, nombre } }
 * @returns {Array<{ horarios: Array, horaInicio: string, horaFin: string }>}
 */
function agruparBloquesContinuos(horarios) {
  if (!horarios || horarios.length === 0) return [];
  const sorted = [...horarios].sort((a, b) =>
    timeToMinutes(a.periodo.horaInicio) - timeToMinutes(b.periodo.horaInicio)
  );
  const bloques = [];
  let bloqueActual = { horarios: [sorted[0]], horaInicio: sorted[0].periodo.horaInicio, horaFin: sorted[0].periodo.horaFin };
  for (let i = 1; i < sorted.length; i++) {
    const anterior = sorted[i - 1];
    const actual = sorted[i];
    if (anterior.periodo.horaFin === actual.periodo.horaInicio) {
      bloqueActual.horarios.push(actual);
      bloqueActual.horaFin = actual.periodo.horaFin;
    } else {
      bloques.push(bloqueActual);
      bloqueActual = { horarios: [actual], horaInicio: actual.periodo.horaInicio, horaFin: actual.periodo.horaFin };
    }
  }
  bloques.push(bloqueActual);
  return bloques;
}

/**
 * Agrupa horarios de un mismo día en bloques maestros (Jornada Continua).
 * Dos horarios son contiguos si horaFin del primero === horaInicio del siguiente.
 * @param {Array} horarios - Array de { horaInicio, horaFin }
 * @returns {Array<{ horarios: Array, horaInicio: string, horaFin: string }>}
 */
function agruparHorariosContiguos(horarios) {
  if (!horarios || horarios.length === 0) return [];
  const sorted = [...horarios].sort((a, b) =>
    timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio)
  );
  const bloques = [];
  let bloque = { horarios: [sorted[0]], horaInicio: sorted[0].horaInicio, horaFin: sorted[0].horaFin };
  for (let i = 1; i < sorted.length; i++) {
    const anterior = sorted[i - 1];
    const actual = sorted[i];
    if (anterior.horaFin === actual.horaInicio) {
      bloque.horarios.push(actual);
      bloque.horaFin = actual.horaFin;
    } else {
      bloques.push(bloque);
      bloque = { horarios: [actual], horaInicio: actual.horaInicio, horaFin: actual.horaFin };
    }
  }
  bloques.push(bloque);
  return bloques;
}

/**
 * Encuentra el bloque activo y el periodo activo dentro del bloque
 * considerando tolerancia de 20 min antes del inicio.
 * @param {Array} bloques - Bloques continuos
 * @param {number} ahoraMin - Minutos actuales desde medianoche
 * @param {number} toleranciaMin - Minutos de tolerancia
 * @returns {{ bloque: Object|null, periodoActivo: Object|null, posicion: number }}
 */
function encontrarBloqueYPeriodoActivo(bloques, ahoraMin, toleranciaMin = 20) {
  for (const bloque of bloques) {
    const inicioBloqueMin = timeToMinutes(bloque.horaInicio) - toleranciaMin;
    const finBloqueMin = timeToMinutes(bloque.horaFin);
    if (ahoraMin >= inicioBloqueMin && ahoraMin <= finBloqueMin) {
      for (let i = 0; i < bloque.horarios.length; i++) {
        const h = bloque.horarios[i];
        const inicioPeriodoMin = timeToMinutes(h.periodo.horaInicio) - toleranciaMin;
        const finPeriodoMin = timeToMinutes(h.periodo.horaFin);
        if (ahoraMin >= inicioPeriodoMin && ahoraMin <= finPeriodoMin) {
          return { bloque, periodoActivo: h, posicion: i };
        }
      }
      // Si está en el bloque pero no dentro de un periodo específico (entre periodos)
      const ultimo = bloque.horarios[bloque.horarios.length - 1];
      return { bloque, periodoActivo: ultimo, posicion: bloque.horarios.length - 1 };
    }
  }
  return { bloque: null, periodoActivo: null, posicion: -1 };
}

/**
 * Verifica si un periodo específico dentro de un bloque está cubierto por un permiso APROBADO.
 */
async function periodoEstaJustificado(usuarioId, fecha, periodoId, tx) {
  const db = tx || prisma;
  const permiso = await db.permiso.findFirst({
    where: {
      usuarioId,
      estado: 'APROBADO',
      fecha: dateOnly(fecha),
      periodos: { some: { periodoId } },
    },
  });
  return !!permiso;
}

/**
 * Calcula el bloque activo considerando justificaciones.
 * Si el primer periodo del bloque está justificado, el bloque activo
 * comienza desde el siguiente periodo no justificado.
 */
async function calcularBloqueYEstado(usuarioId, horarios, ahoraMin, toleranciaMin, tx) {
  const bloques = agruparBloquesContinuos(horarios);
  let encontrado = encontrarBloqueYPeriodoActivo(bloques, ahoraMin, 20);
  if (!encontrado.bloque) {
    return { estado: 'Fuera de horario', periodoLabel: null, periodoConsolidado: null, observacion: null, bloque: null, periodoActivo: null };
  }

  // Rango consolidado de la jornada completa (bloque maestro), ej. "07:00–16:15"
  const periodoConsolidado = `${encontrado.bloque.horaInicio}–${encontrado.bloque.horaFin}`;

  // Verificar justificaciones dentro del bloque
  const ahora = new Date();
  for (let i = 0; i < encontrado.bloque.horarios.length; i++) {
    const h = encontrado.bloque.horarios[i];
    const justificado = await periodoEstaJustificado(usuarioId, ahora, h.periodo.id, tx);
    if (justificado) {
      // Si el periodo activo está justificado, todo el bloque está cubierto
      if (i === encontrado.posicion) {
        return { estado: 'PUNTUAL', periodoLabel: `${h.periodo.horaInicio}–${h.periodo.horaFin}`, periodoConsolidado, observacion: 'Cubierto por permiso', bloque: encontrado.bloque, periodoActivo: h };
      }
      continue;
    }
    // Primer periodo no justificado → desde aquí se evalúa entrada
    const inicioMin = timeToMinutes(h.periodo.horaInicio);
    const diferenciaMin = ahoraMin - inicioMin;
    let estado = 'TARDANZA';
    let observacion = `Llegó ${diferenciaMin} min tarde (tolerancia: ${toleranciaMin} min)`;
    if (diferenciaMin <= toleranciaMin) {
      estado = 'PUNTUAL';
      observacion = null;
    }
    return { estado, periodoLabel: `${h.periodo.horaInicio}–${h.periodo.horaFin}`, periodoConsolidado, observacion, bloque: encontrado.bloque, periodoActivo: h };
  }

  // Todos los periodos del bloque están justificados
  const ultimo = encontrado.bloque.horarios[encontrado.bloque.horarios.length - 1];
  return { estado: 'PUNTUAL', periodoLabel: `${ultimo.periodo.horaInicio}–${ultimo.periodo.horaFin}`, periodoConsolidado, observacion: 'Cubierto por permiso', bloque: encontrado.bloque, periodoActivo: ultimo };
}

// ── Endpoints ────────────────────────────────────────────────

/**
 * POST /api/asistencia/registrar
 * Body: { token: string, usuarioId: number }
 *
 * Flujo:
 *  1. Busca al empleado real en BD (prisma.usuario.findUnique)
 *  2. Verifica token QR (HMAC SHA-256)
 *  3. Obtiene hora exacta de Bolivia (America/La_Paz)
 *  4. Verifica horario asignado para el día actual
 *  5. Busca asistencia abierta HOY — si existe cierra (SALIDA),
 *     si no existe crea una nueva (ENTRADA)
 */
async function registrar(req, res) {
  try {
    const { token, usuarioId } = req.body;
    if (!token || !usuarioId) {
      return res.status(400).json({ ok: false, message: 'token y usuarioId son requeridos' });
    }

    const uid = parseInt(usuarioId);
    if (isNaN(uid)) return res.status(400).json({ ok: false, message: 'ID de usuario inválido' });

    // 1. Buscar empleado real
    const empleado = await prisma.usuario.findUnique({ where: { id: uid } });
    if (!empleado) return res.status(404).json({ ok: false, message: 'Empleado no encontrado' });

    // 2. Validar token QR (JWT tolerante)
    let decoded;
    try {
      decoded = jwt.verify(token, QR_JWT_SECRET);
    } catch {
      decoded = jwt.decode(token);
    }
    if (!decoded || !decoded.exp) {
      return res.status(401).json({ ok: false, message: 'Token QR inválido' });
    }
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ ok: false, message: 'Token QR inválido: expirado' });
    }

    // 3. Hora exacta de Bolivia
    const ahora = getBoliviaDate();
    const { start, end } = getDayRange(ahora);
    const diaSemana = getDiaSemanaHoy();

    // 4. Verificar horarios asignados para hoy en el periodo académico actual
    const horariosHoy = await prisma.horarioAsignado.findMany({
      where: { usuarioId: uid, diaSemana, periodoAcademico: obtenerPeriodoActual() },
      include: { periodo: true },
      orderBy: { periodo: { horaInicio: 'asc' } },
    });

    const config = await prisma.configuracionSistema.findUnique({ where: { id: 1 } });
    const toleranciaMin = config?.tiempoTolerancia ?? 20;
    const ahoraMin = getBoliviaTimeMinutes(ahora);

    // Identificar el bloque activo de la jornada (soporta puentes / jornadas partidas)
    let bloqueInfo = null;
    if (horariosHoy.length > 0) {
      bloqueInfo = await calcularBloqueYEstado(uid, horariosHoy, ahoraMin, toleranciaMin);
    }
    const periodoBloque = bloqueInfo?.periodoConsolidado || null;

    // 5. Buscar asistencia abierta SOLO del bloque activo, para no cruzar
    //    entrada/salida entre turnos separados por un puente en el mismo día
    const asistenciaAbierta = await prisma.asistencia.findFirst({
      where: {
        usuarioId: uid,
        fecha: { gte: start, lte: end },
        horaSalida: null,
        salidaOmitida: false,
        ...(periodoBloque ? { periodo: periodoBloque } : {}),
      },
      orderBy: { horaEntrada: 'desc' },
    });

    let resultado;
    let accion;
    let estado = 'PUNTUAL';
    let observacion = null;
    let periodoLabel = null;

    if (!asistenciaAbierta) {
      if (bloqueInfo) {
        estado = bloqueInfo.estado;
        observacion = bloqueInfo.observacion;
        // Guardar el rango consolidado del bloque activo (ej. "07:00–09:15")
        periodoLabel = bloqueInfo.periodoConsolidado || bloqueInfo.periodoLabel;
      }

      resultado = await prisma.asistencia.create({
        data: {
          usuarioId: uid,
          fecha: dateOnly(ahora),
          horaEntrada: ahora,
          minutosTolerancia: toleranciaMin,
          observacion: observacion,
          periodo: periodoLabel,
        },
        include: { usuario: { select: { id: true, nombre: true, codigo: true } } },
      });
      accion = 'ENTRADA';
    } else {
      resultado = await prisma.asistencia.update({
        where: { id: asistenciaAbierta.id },
        data: { horaSalida: ahora },
        include: { usuario: { select: { id: true, nombre: true, codigo: true } } },
      });
      accion = 'SALIDA';
      estado = 'Salida';
    }

    if (req.io && accion === 'ENTRADA') {
      req.io.emit('asistencia_registrada', {
        empleadoNombre: resultado.usuario.nombre,
        horaEntradaStr: toBoliviaTimeStr(resultado.horaEntrada),
        estado,
      });
    }

    res.status(201).json({
      ok: true,
      accion,
      estado,
      mensaje: `${accion === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada para ${resultado.usuario.nombre}`,
      empleado: { id: resultado.usuario.id, nombre: resultado.usuario.nombre, codigo: resultado.usuario.codigo },
      tieneHorario: horariosHoy.length > 0,
      data: resultado,
    });
  } catch (error) {
    console.error('[asistencia.registrar]', error);
    res.status(500).json({ ok: false, message: `Error al registrar asistencia: ${error.message}` });
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
      select: {
        id: true,
        usuarioId: true,
        fecha: true,
        horaEntrada: true,
        horaSalida: true,
        observacion: true,
        periodo: true,
        minutosTolerancia: true,
        usuario: { select: { id: true, nombre: true, codigo: true, ci: true } },
      },
      orderBy: [{ fecha: 'desc' }, { horaEntrada: 'desc' }],
    });

    // Horarios asignados para resolver dinámicamente el rango consolidado de cada registro
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const horariosAsignados = await prisma.horarioAsignado.findMany({
      select: {
        usuarioId: true,
        diaSemana: true,
        periodo: { select: { horaInicio: true, horaFin: true } },
      },
    });
    const horariosPorUsuarioDia = new Map(); // key: `${usuarioId}_${diaSemana}`
    for (const h of horariosAsignados) {
      const key = `${h.usuarioId}_${h.diaSemana}`;
      if (!horariosPorUsuarioDia.has(key)) horariosPorUsuarioDia.set(key, []);
      horariosPorUsuarioDia.get(key).push({ inicio: h.periodo.horaInicio, fin: h.periodo.horaFin });
    }

    /**
     * Resuelve el rango consolidado de la jornada (ej. "07:00–16:15") según los
     * bloques contiguos asignados al empleado en la fecha del registro.
     */
    const resolverPeriodoConsolidado = (a) => {
      if (!a.fecha) return null;
      const fechaStr = a.fecha instanceof Date ? a.fecha.toISOString().split('T')[0] : String(a.fecha).split('T')[0];
      const diaSemana = diasSemana[new Date(fechaStr + 'T12:00:00Z').getUTCDay()];
      const bloques = horariosPorUsuarioDia.get(`${a.usuarioId}_${diaSemana}`) || [];
      if (bloques.length === 0) return null;

      bloques.sort((x, y) => timeToMinutes(x.inicio) - timeToMinutes(y.inicio));

      // Consolidar bloques contiguos (fin del anterior === inicio del siguiente)
      const consolidados = [];
      let bloque = { inicio: bloques[0].inicio, fin: bloques[0].fin };
      for (let i = 1; i < bloques.length; i++) {
        const anterior = bloques[i - 1];
        const actual = bloques[i];
        if (anterior.fin === actual.inicio) {
          bloque.fin = actual.fin;
        } else {
          consolidados.push(bloque);
          bloque = { inicio: actual.inicio, fin: actual.fin };
        }
      }
      consolidados.push(bloque);

      // Hora de referencia: inicio del periodo guardado o, en su defecto, la hora de entrada
      let inicioPeriodo = null;
      if (a.periodo) {
        if (a.periodo.includes('–')) inicioPeriodo = a.periodo.split('–')[0].trim();
        else if (a.periodo.includes('-')) inicioPeriodo = a.periodo.split('-')[0].trim();
      }
      const horaEntradaMin = a.horaEntrada
        ? getBoliviaDate(a.horaEntrada).getHours() * 60 + getBoliviaDate(a.horaEntrada).getMinutes()
        : null;
      const referenciaMin = inicioPeriodo ? timeToMinutes(inicioPeriodo) : horaEntradaMin;
      if (referenciaMin === null) return null;

      const match = consolidados.find(c => {
        const inicioC = timeToMinutes(c.inicio) - 20;
        const finC = timeToMinutes(c.fin);
        return referenciaMin >= inicioC && referenciaMin <= finC;
      });

      return match ? `${match.inicio}–${match.fin}` : null;
    };

    const config = await prisma.configuracionSistema.findUnique({ where: { id: 1 } });
    const toleranciaGlobal = config?.tiempoTolerancia ?? 20;

    const data = asistencias.map(a => {
      const horaEntradaStr = a.horaEntrada ? toBoliviaTimeStr(a.horaEntrada) : null;
      const horaInicioStr = extraerHoraInicio(a.periodo);
      const tolerancia = a.minutosTolerancia ?? toleranciaGlobal;

      const estado = horaEntradaStr && horaInicioStr
        ? calcularEstadoAsistencia(horaEntradaStr, horaInicioStr, tolerancia)
        : (horaEntradaStr ? 'PUNTUAL' : 'AUSENTE');

      // Reemplazar el periodo guardado por el rango consolidado cuando se puede resolver
      const periodoResuelto = resolverPeriodoConsolidado(a);

      return { ...a, periodo: periodoResuelto || a.periodo, estado };
    });

    res.json({ ok: true, data });
  } catch (error) {
    console.error('[asistencia.getAll]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener asistencias' });
  }
}

// GET /api/asistencia/:id
async function getById(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });
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
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });
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

/**
 * POST /api/asistencias/marcar
 * Body: { token: string }
 * Auth: req.usuario.id (viene del authMiddleware)
 *
 * Flujo:
 *  1. Verifica token QR — 400 si expirado
 *  2. Lee tiempoToleranciaMinutos de Configuracion (id=1)
 *  3. Busca los horarios del empleado para el día de hoy
 *  4. Encuentra el periodo más cercano a la hora actual
 *  5. Calcula estado: "A tiempo" | "Atraso" | "Fuera de horario"
 *  6. Registra la asistencia (entrada o salida según estado abierto)
 */
async function marcar(req, res) {
  try {
    const { token } = req.body;
    const usuarioId = req.usuario?.id;

    if (!token) {
      return res.status(400).json({ ok: false, message: 'token es requerido' });
    }
    if (!usuarioId) {
      return res.status(401).json({ ok: false, message: 'No autenticado' });
    }

    // 1. Verificar token QR (JWT tolerante)
    let decoded;
    try {
      decoded = jwt.verify(token, QR_JWT_SECRET);
    } catch {
      decoded = jwt.decode(token);
    }
    if (!decoded || !decoded.exp) {
      return res.status(400).json({ ok: false, message: 'Token QR inválido' });
    }
    const ahoraSec = Math.floor(Date.now() / 1000);
    if (decoded.exp < ahoraSec) {
      return res.status(400).json({ ok: false, message: 'El código QR ha expirado', expired: true });
    }

    const ahora      = new Date();
    const ahoraMin   = getBoliviaTimeMinutes(ahora);
    const diaSemana  = getDiaSemanaHoy();
    const uid        = parseInt(usuarioId);

    // 2. Leer configuración de tolerancia
    const config = await prisma.configuracionSistema.findUnique({ where: { id: 1 } });
    const toleranciaMin = config?.tiempoTolerancia ?? 10;

    // 3. Buscar horarios del empleado para hoy en el periodo académico actual
    const horarios = await prisma.horarioAsignado.findMany({
      where: { usuarioId: uid, diaSemana, periodoAcademico: obtenerPeriodoActual() },
      include: { periodo: true },
      orderBy: { periodo: { horaInicio: 'asc' } },
    });

    // 4. Calcular estado de marcación
    let estado = 'Fuera de horario';
    let observacion = null;
    let periodoLabel = null;
    let bloqueInfo = null;

    if (horarios.length > 0) {
      bloqueInfo = await calcularBloqueYEstado(uid, horarios, ahoraMin, toleranciaMin);
      estado = bloqueInfo.estado;
      observacion = bloqueInfo.observacion;
      // Guardar el rango consolidado del bloque activo (ej. "07:00–09:15")
      periodoLabel = bloqueInfo.periodoConsolidado || bloqueInfo.periodoLabel;
    }

    // 5. Registrar entrada o salida (por bloque para soportar jornadas discontinuas / puentes)
    const { start, end } = getDayRange(ahora);

    const asistenciaAbierta = await prisma.asistencia.findFirst({
      where: {
        usuarioId: uid,
        fecha: { gte: start, lte: end },
        horaSalida: null,
        salidaOmitida: false,
        ...(bloqueInfo?.periodoConsolidado ? { periodo: bloqueInfo.periodoConsolidado } : {}),
      },
      orderBy: { horaEntrada: 'desc' },
    });

    let resultado;
    let accion;

    if (!asistenciaAbierta) {
      resultado = await prisma.asistencia.create({
        data: {
          usuarioId:         uid,
          fecha:             dateOnly(ahora),
          horaEntrada:       ahora,
          minutosTolerancia: toleranciaMin,
          observacion:       observacion,
          periodo:           periodoLabel,
        },
        include: { usuario: { select: { id: true, nombre: true } } },
      });
      accion = 'ENTRADA';
    } else {
      resultado = await prisma.asistencia.update({
        where: { id: asistenciaAbierta.id },
        data:  { horaSalida: ahora },
        include: { usuario: { select: { id: true, nombre: true } } },
      });
      accion = 'SALIDA';
      estado = 'Salida';
    }

    const horaEntradaStr = resultado?.horaEntrada
      ? toBoliviaTimeStr(resultado.horaEntrada)
      : null;

    if (req.io && accion === 'ENTRADA') {
      req.io.emit('asistencia_registrada', {
        empleadoNombre: resultado.usuario.nombre,
        horaEntradaStr,
        estado,
      });
    }

    res.status(201).json({
      ok: true,
      accion,
      estado,
      horaEntrada: horaEntradaStr,
      periodo: periodoLabel,
      mensaje: `${accion === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada para ${resultado.usuario.nombre}${estado === 'TARDANZA' ? ' (con tardanza)' : ''}`,
      empleado: { id: resultado.usuario.id, nombre: resultado.usuario.nombre },
      data: resultado,
    });
  } catch (error) {
    console.error('[asistencia.marcar]', error);
    res.status(500).json({ ok: false, message: 'Error al marcar asistencia' });
  }
}

/**
 * POST /api/asistencias/marcar-movil
 * Body: { qrToken, codigo, password }
 *
 * Flujo:
 *  1. Verifica firma del token con HMAC SHA256 usando timingSafeEqual.
 *  2. Verifica expiración del token.
 *  3. Abre transacción:
 *     - Busca y valida/consume el nonce.
 *     - Busca usuario y verifica password usando bcrypt.
 *     - Calcula tolerancia de asistencia y registra Entrada/Salida.
 *  4. Registra auditoría.
 */
async function marcarMovil(req, res) {
  try {
    console.log("[QR MÓVIL] ¡Entrando a la ruta correcta sin restricciones!");
    const { qrToken, codigo, password } = req.body;

    if (!qrToken || !codigo || !password) {
      return res.status(400).json({ ok: false, message: 'qrToken, codigo y password son requeridos' });
    }

    // 1. Validar Token QR (JWT tolerante: verify → decode)
    let decoded;
    try {
      decoded = jwt.verify(qrToken, QR_JWT_SECRET);
    } catch {
      decoded = jwt.decode(qrToken);
    }

    if (!decoded || !decoded.nonce) {
      return res.status(400).json({ ok: false, message: 'Token QR no válido o expirado' });
    }

    const ahoraSec = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < ahoraSec) {
      return res.status(400).json({ ok: false, message: 'El código QR ha expirado' });
    }

    const data = decoded;

    // 2. Transacción para prevención de replay, verificación y registro
    let resultadoTransaccion;
    try {
      resultadoTransaccion = await prisma.$transaction(async (tx) => {
        // Validar y consumir Nonce
        const nonceRecord = await tx.qrNonce.findUnique({
          where: { nonce: data.nonce }
        });
        if (!nonceRecord) {
          throw new Error('El token QR no es válido o ya venció.');
        }
        if (nonceRecord.consumed) {
          throw new Error('El código QR ya ha sido utilizado');
        }

        await tx.qrNonce.update({
          where: { nonce: data.nonce },
          data: { consumed: true }
        });

        // Validar Usuario
        const usuario = await tx.usuario.findFirst({
          where: { codigo }
        });
        if (!usuario) {
          throw new Error('Código de empleado o contraseña incorrectos');
        }

        // Verificar password
        const validPassword = await bcrypt.compare(password, usuario.password);
        if (!validPassword) {
          throw new Error('Código de empleado o contraseña incorrectos');
        }

        const ahora = new Date();
        const ahoraMin = getBoliviaTimeMinutes(ahora);
        const diaSemana = getDiaSemanaHoy();

        // Configuración de tolerancia
        const config = await tx.configuracionSistema.findUnique({ where: { id: 1 } });
        const toleranciaMin = config?.tiempoTolerancia ?? 10;

        // Horarios de hoy en el periodo académico actual
        const horarios = await tx.horarioAsignado.findMany({
          where: { usuarioId: usuario.id, diaSemana, periodoAcademico: obtenerPeriodoActual() },
          include: { periodo: true },
          orderBy: { periodo: { horaInicio: 'asc' } },
        });

        let estado = 'Fuera de horario';
        let observacion = null;
        let periodoLabel = null;
        let bloqueInfo = null;

        if (horarios.length > 0) {
          bloqueInfo = await calcularBloqueYEstado(usuario.id, horarios, ahoraMin, toleranciaMin, tx);
          estado = bloqueInfo.estado;
          observacion = bloqueInfo.observacion;
          // Guardar el rango consolidado del bloque activo (ej. "07:00–09:15")
          periodoLabel = bloqueInfo.periodoConsolidado || bloqueInfo.periodoLabel;
        }

        // Registrar entrada o salida (por bloque para soportar jornadas discontinuas / puentes)
        const { start, end } = getDayRange(ahora);

        const asistenciaAbierta = await tx.asistencia.findFirst({
          where: {
            usuarioId: usuario.id,
            fecha: { gte: start, lte: end },
            horaSalida: null,
            salidaOmitida: false,
            ...(bloqueInfo?.periodoConsolidado ? { periodo: bloqueInfo.periodoConsolidado } : {}),
          },
          orderBy: { horaEntrada: 'desc' },
        });

        let resultado;
        let accion;

        if (!asistenciaAbierta) {
          resultado = await tx.asistencia.create({
            data: {
              usuarioId:         usuario.id,
              fecha:             dateOnly(ahora),
              horaEntrada:       ahora,
              minutosTolerancia: toleranciaMin,
              observacion:       observacion,
              periodo:           periodoLabel,
            },
          });
          accion = 'ENTRADA';
        } else {
          resultado = await tx.asistencia.update({
            where: { id: asistenciaAbierta.id },
            data:  { horaSalida: ahora },
          });
          accion = 'SALIDA';
          estado = 'Salida';
        }

        return { resultado, accion, estado, periodoLabel, usuario };
      });
    } catch (txError) {
      return res.status(400).json({ ok: false, message: txError.message });
    }

    // 4. Registro de auditoría
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    console.log(`[AUDIT] Asistencia móvil: UsuarioId=${resultadoTransaccion.usuario.id}, Codigo=${codigo}, Acción=${resultadoTransaccion.accion}, Estado=${resultadoTransaccion.estado}, IP=${ip}, UserAgent=${userAgent}, Fecha=${new Date().toISOString()}`);

    const horaEntradaStr = resultadoTransaccion.resultado?.horaEntrada
      ? toBoliviaTimeStr(resultadoTransaccion.resultado.horaEntrada)
      : null;

    if (req.io && resultadoTransaccion.accion === 'ENTRADA') {
      req.io.emit('asistencia_registrada', {
        empleadoNombre: resultadoTransaccion.usuario.nombre,
        horaEntradaStr,
        estado: resultadoTransaccion.estado,
      });
    }

    res.status(201).json({
      ok: true,
      accion: resultadoTransaccion.accion,
      estado: resultadoTransaccion.estado,
      horaEntrada: horaEntradaStr,
      periodo: resultadoTransaccion.periodoLabel,
      mensaje: `${resultadoTransaccion.accion === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada para ${resultadoTransaccion.usuario.nombre}${resultadoTransaccion.estado === 'TARDANZA' ? ' (con tardanza)' : ''}`,
      empleado: { id: resultadoTransaccion.usuario.id, nombre: resultadoTransaccion.usuario.nombre },
      data: resultadoTransaccion.resultado,
    });
  } catch (error) {
    console.error('[asistencia.marcarMovil]', error);
    res.status(500).json({ ok: false, message: 'Error al marcar asistencia en móvil' });
  }
}

/**
 * GET /api/asistencias/qr-dashboard
 * Calcula y retorna la información del día actual para la vista de control QR.
 */
async function getQrDashboard(req, res) {
  try {
    const ahora = getBoliviaDate();
    const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
    const { start, end } = getDayRange(ahora);

    // 1. Total Asistencias hoy
    const totalAsistencias = await prisma.asistencia.count({
      where: { fecha: { gte: start, lte: end } },
    });

    // 2. Atrasos hoy (observacion empieza con 'Llegó')
    const atrasos = await prisma.asistencia.count({
      where: {
        fecha: { gte: start, lte: end },
        observacion: { startsWith: 'Llegó' },
      },
    });

    // 3. Último registro hoy
    const ultimo = await prisma.asistencia.findFirst({
      where: { fecha: { gte: start, lte: end } },
      include: { usuario: { select: { nombre: true, codigo: true } } },
      orderBy: { horaEntrada: 'desc' },
    });

    let ultimoRegistro = null;
    if (ultimo) {
      let estadoRegistro = 'A tiempo';
      let horaMarcada = ultimo.horaEntrada;
      if (ultimo.horaSalida) {
        estadoRegistro = 'Salida';
        horaMarcada = ultimo.horaSalida;
      } else if (ultimo.observacion && ultimo.observacion.startsWith('Llegó')) {
        estadoRegistro = 'Atraso';
      }
      const fmt = (d) =>
        getBoliviaDate(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      ultimoRegistro = {
        id: ultimo.id,
        nombre: ultimo.usuario.nombre,
        codigo: ultimo.usuario.codigo || `CC-${String(ultimo.usuarioId).padStart(3, '0')}`,
        hora: fmt(horaMarcada),
        estado: estadoRegistro,
      };
    }

    // 4. Periodos activos con estado basado en 5 min de tolerancia
    const periodos = await prisma.periodo.findMany({
      where: { activo: true },
      orderBy: { horaInicio: 'asc' },
    });

    const TOLERANCIA = 5;

    const periodosConActivo = periodos.map((p) => {
      const [hI, mI] = p.horaInicio.split(':').map(Number);
      const [hF, mF] = p.horaFin.split(':').map(Number);
      const inicioMin = hI * 60 + mI;
      const finMin = hF * 60 + mF;
      const toleranciaFin = inicioMin + TOLERANCIA;

      let estado;
      if (ahoraMin < inicioMin) {
        estado = 'PENDIENTE';
      } else if (ahoraMin <= toleranciaFin) {
        estado = 'ACTIVO';
      } else if (ahoraMin <= finMin) {
        estado = 'RETRASO';
      } else {
        estado = 'FINALIZADO';
      }

      return {
        id: p.id,
        nombre: p.nombre,
        horaInicio: p.horaInicio,
        horaFin: p.horaFin,
        estado,
        activo: estado === 'ACTIVO' || estado === 'RETRASO',
      };
    });

    res.json({
      ok: true,
      data: { totalAsistencias, atrasos, ultimoRegistro, periodos: periodosConActivo },
    });
  } catch (error) {
    console.error('[asistencia.getQrDashboard]', error);
    res.status(500).json({
      ok: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

/**
 * GET /api/asistencia/estado-hoy
 * Devuelve los periodos configurados para el día de la semana actual (ej. Martes)
 * usando la hora de Bolivia (GMT-4). Para cada periodo indica:
 *   - datos del periodo (id, nombre, horaInicio, horaFin)
 *   - activo: si es el periodo actual
 *   - totalEmpleados: cuántos deberían marcar en este periodo
 *   - marcaron: cuántos ya registraron asistencia hoy en este periodo
 *   - estado: "entrada" | "pendiente" | "ausente"
 */
async function getEstadoHoy(req, res) {
  try {
    const ahora = getBoliviaDate();
    const diaSemana = getDiaSemanaHoy();
    const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
    const { start, end } = getDayRange(ahora);

    const periodos = await prisma.periodo.findMany({
      where: { activo: true },
      orderBy: { horaInicio: 'asc' },
    });

    // Todas las asistencias de hoy con hora en Bolivia
    const asistenciasHoy = await prisma.asistencia.findMany({
      where: { fecha: { gte: start, lte: end } },
      select: { usuarioId: true, horaEntrada: true },
    });

    // Índice: usuarioId → conjunto de minutos-Bolivia de entrada
    const entradaPorUsuario = new Map();
    for (const a of asistenciasHoy) {
      const bd = getBoliviaDate(a.horaEntrada);
      const min = bd.getHours() * 60 + bd.getMinutes();
      if (!entradaPorUsuario.has(a.usuarioId)) {
        entradaPorUsuario.set(a.usuarioId, new Set());
      }
      entradaPorUsuario.get(a.usuarioId).add(min);
    }

    const TOLERANCIA = 5;
    let totalAusentes = 0;

    // Pre-cargar todos los horarios asignados hoy para construir bloques continuos por usuario
    const todosAsignadosHoy = await prisma.horarioAsignado.findMany({
      where: { diaSemana, periodoAcademico: obtenerPeriodoActual(), usuario: { activo: true } },
      select: { usuarioId: true, periodoId: true, periodo: { select: { horaInicio: true, horaFin: true } } },
      orderBy: [{ usuarioId: 'asc' }, { periodo: { horaInicio: 'asc' } }],
    });

    // Índice: usuarioId → { bloques: Array<{ inicio, fin, periodoIds }> }
    const bloquesPorUsuario = new Map();
    for (const asig of todosAsignadosHoy) {
      if (!bloquesPorUsuario.has(asig.usuarioId)) {
        bloquesPorUsuario.set(asig.usuarioId, []);
      }
      const bloques = bloquesPorUsuario.get(asig.usuarioId);
      const inicio = timeToMinutes(asig.periodo.horaInicio);
      const fin = timeToMinutes(asig.periodo.horaFin);
      const ultimo = bloques.length > 0 ? bloques[bloques.length - 1] : null;
      if (ultimo && ultimo.fin === inicio) {
        ultimo.fin = fin;
        ultimo.periodoIds.push(asig.periodoId);
      } else {
        bloques.push({ inicio, fin, periodoIds: [asig.periodoId] });
      }
    }

    // Índice: periodoId → set de usuarioIds que marcaron (por bloque)
    const marcaronPorPeriodo = new Map();
    for (const [usuarioId, bloques] of bloquesPorUsuario) {
      const mins = entradaPorUsuario.get(usuarioId);
      if (!mins) continue;
      for (const bloque of bloques) {
        let cubierto = false;
        for (const m of mins) {
          if (m >= (bloque.inicio - 20) && m <= bloque.fin) { cubierto = true; break; }
        }
        if (cubierto) {
          for (const pid of bloque.periodoIds) {
            if (!marcaronPorPeriodo.has(pid)) marcaronPorPeriodo.set(pid, new Set());
            marcaronPorPeriodo.get(pid).add(usuarioId);
          }
        }
      }
    }

    const resultado = await Promise.all(
      periodos.map(async (p) => {
        const [hI, mI] = p.horaInicio.split(':').map(Number);
        const [hF, mF] = p.horaFin.split(':').map(Number);
        const inicioMin = hI * 60 + mI;
        const finMin = hF * 60 + mF;
        const toleranciaFin = inicioMin + TOLERANCIA;

        let estado;
        if (ahoraMin < inicioMin) {
          estado = 'PENDIENTE';
        } else if (ahoraMin <= toleranciaFin) {
          estado = 'ACTIVO';
        } else if (ahoraMin <= finMin) {
          estado = 'RETRASO';
        } else {
          estado = 'FINALIZADO';
        }

        const isActive = estado === 'ACTIVO' || estado === 'RETRASO';

        const totalEmpleados = await prisma.horarioAsignado.count({
          where: { periodoId: p.id, diaSemana, periodoAcademico: obtenerPeriodoActual(), usuario: { activo: true } },
        });

        if (totalEmpleados === 0) {
          return {
            id: p.id, nombre: p.nombre, horaInicio: p.horaInicio, horaFin: p.horaFin,
            activo: isActive, estado, totalEmpleados: 0, marcaron: 0, ausentes: 0,
          };
        }

        const marcaron = marcaronPorPeriodo.has(p.id) ? marcaronPorPeriodo.get(p.id).size : 0;
        const ausentes = totalEmpleados - marcaron;

        if (estado === 'FINALIZADO') {
          totalAusentes += ausentes;
        }

        return {
          id: p.id, nombre: p.nombre, horaInicio: p.horaInicio, horaFin: p.horaFin,
          activo: isActive, estado, totalEmpleados, marcaron, ausentes,
        };
      })
    );

    res.json({ ok: true, data: { periodos: resultado, totalAusentes } });
  } catch (error) {
    console.error('[asistencia.getEstadoHoy]', error);
    res.status(500).json({ ok: false, message: error.message });
  }
}

/**
 * GET /api/asistencia/mi-historial
 * Auth: Requiere JWT de empleado
 * Query: ?mes=1-12&anio=YYYY (default: mes y año actual en Bolivia)
 *
 * Devuelve las marcaciones del empleado autenticado en el mes especificado.
 */
async function miHistorial(req, res) {
  try {
    const usuarioId = parseInt(req.usuario.id);
    if (isNaN(usuarioId)) {
      return res.json({ ok: true, data: [], resumen: { total: 0, puntual: 0, tardanza: 0, justificado: 0, ausente: 0 } });
    }

    const ahoraBolivia = getBoliviaDate();
    let startDate, endDate;

    // Tolerancia de marcación de la institución (configuracion_sistema) con default 10 min
    const configTol = await prisma.configuracionSistema.findUnique({ where: { id: 1 } });
    const toleranciaMin = configTol?.tiempoTolerancia ?? 10;

    const { filtro, fechaInicio, fechaFin } = req.query;

    function fechaLocalMedioDia(isoStr) {
      const [y, m, d] = isoStr.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    }

    function hoyMedioDia() {
      return new Date(ahoraBolivia.getFullYear(), ahoraBolivia.getMonth(), ahoraBolivia.getDate(), 12, 0, 0);
    }

    // ── Prioridad 1: filtro rápido ──
    if (filtro === 'hoy') {
      startDate = hoyMedioDia();
      endDate = startDate;
    } else if (filtro === 'semana') {
      const diaSem = ahoraBolivia.getDay();
      const diff = diaSem === 0 ? 6 : diaSem - 1;
      const lunes = new Date(ahoraBolivia);
      lunes.setDate(ahoraBolivia.getDate() - diff);
      startDate = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate(), 12, 0, 0);
      endDate = hoyMedioDia();
    } else if (filtro === 'mes') {
      startDate = new Date(ahoraBolivia.getFullYear(), ahoraBolivia.getMonth(), 1, 12, 0, 0);
      endDate = hoyMedioDia();
    } else if (filtro === 'periodo') {
      const gestion = await prisma.gestionAcademica.findFirst({
        where: { nombre: obtenerPeriodoActual() },
      });
      if (gestion && gestion.fechaInicio) {
        const gi = gestion.fechaInicio instanceof Date ? gestion.fechaInicio : new Date(gestion.fechaInicio);
        startDate = new Date(gi.getFullYear(), gi.getMonth(), gi.getDate(), 12, 0, 0);
      } else {
        startDate = new Date(ahoraBolivia.getFullYear(), 0, 1, 12, 0, 0);
      }
      endDate = hoyMedioDia();
    } else if (fechaInicio && fechaFin) {
      // ── Prioridad 2: rango explícito ──
      const reDate = /^\d{4}-\d{2}-\d{2}$/;
      if (!reDate.test(fechaInicio) || !reDate.test(fechaFin)) {
        return res.json({ ok: true, data: [], resumen: { total: 0, puntual: 0, tardanza: 0, justificado: 0, ausente: 0 } });
      }
      startDate = fechaLocalMedioDia(fechaInicio);
      endDate   = fechaLocalMedioDia(fechaFin);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.json({ ok: true, data: [], resumen: { total: 0, puntual: 0, tardanza: 0, justificado: 0, ausente: 0 } });
      }
    } else {
      // ── Prioridad 3: mes/año ──
      const anio = parseInt(req.query.anio) || ahoraBolivia.getFullYear();
      const mes  = parseInt(req.query.mes)  || (ahoraBolivia.getMonth() + 1);
      if (mes < 1 || mes > 12) {
        return res.json({ ok: true, data: [], resumen: { total: 0, puntual: 0, tardanza: 0, justificado: 0, ausente: 0 } });
      }
      const ultimoDia = new Date(anio, mes, 0, 12, 0, 0).getDate();
      startDate = new Date(anio, mes - 1, 1, 12, 0, 0);
      endDate   = new Date(anio, mes - 1, ultimoDia, 12, 0, 0);
    }

    const asistencias = await prisma.asistencia.findMany({
      where: {
        usuarioId,
        fecha: { gte: startDate, lte: endDate },
      },
      orderBy: { fecha: 'desc' },
    });

    const fmtTime = (d) =>
      d ? getBoliviaDate(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : null;

    // ── Cargar horarios asignados con su createdAt (fecha de asignaci�n) ──
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const horariosAsignados = await prisma.horarioAsignado.findMany({
      where: { usuarioId },
      include: { periodo: { select: { id: true, nombre: true, horaInicio: true, horaFin: true } } },
    });

    const horarioPorDia = new Map();
    for (const h of horariosAsignados) {
      if (!horarioPorDia.has(h.diaSemana)) horarioPorDia.set(h.diaSemana, []);
      horarioPorDia.get(h.diaSemana).push({
        id: h.id,
        periodoId: h.periodo.id,
        horaInicio: h.periodo.horaInicio,
        horaFin: h.periodo.horaFin,
        nombre: h.periodo.nombre,
        createdAt: h.createdAt,
      });
    }

    function getPeriodoHorario(fecha) {
      const diaNum = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getDay();
      const horarios = horarioPorDia.get(diasSemana[diaNum]);
      if (!horarios || horarios.length === 0) return null;
      return horarios.map(p => `${p.horaInicio} - ${p.horaFin}`).join(', ');
    }

    // ── Indexar asistencias por fecha ──
    const asistenciaPorFecha = new Map();
    for (const a of asistencias) {
      const fd = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
      const fechaStr = fd.toISOString().split('T')[0];
      if (!asistenciaPorFecha.has(fechaStr)) asistenciaPorFecha.set(fechaStr, []);
      asistenciaPorFecha.get(fechaStr).push(a);
    }

    // ── Indexar permisos APROBADOS por fecha ──
    const permisos = await prisma.permiso.findMany({
      where: { usuarioId, estado: 'APROBADO', fecha: { gte: startDate, lte: endDate } },
      include: {
        tipoPermiso: { select: { nombre: true } },
        periodos: { include: { periodo: { select: { horaInicio: true, horaFin: true } } } },
      },
    });
    const permisosIdx = new Map();
    for (const p of permisos) {
      const pfecha = p.fecha instanceof Date ? p.fecha : new Date(p.fecha);
      const fechaStr = pfecha.toISOString().split('T')[0];
      if (!permisosIdx.has(fechaStr)) permisosIdx.set(fechaStr, []);
      permisosIdx.get(fechaStr).push(p);
    }

    // ── Loop único por (fecha × turno asignado) ──
    const fechasEnRango = [];
    for (let d = new Date(startDate.getTime()); d <= endDate; d.setDate(d.getDate() + 1)) {
      fechasEnRango.push(new Date(d));
    }

    const ahoraBol = getBoliviaDate();
    const ahoraMin = ahoraBol.getHours() * 60 + ahoraBol.getMinutes();
    const hoyStr = `${ahoraBol.getFullYear()}-${String(ahoraBol.getMonth() + 1).padStart(2, '0')}-${String(ahoraBol.getDate()).padStart(2, '0')}`;

    const data = [];

    for (const fecha of fechasEnRango) {
      const fechaStr = fecha.toISOString().split('T')[0];
      if (fechaStr > hoyStr) continue;

      const diaNum = new Date(fechaStr + 'T12:00:00Z').getUTCDay();
      if (diaNum === 0) continue;
      const diaSemana = diasSemana[diaNum];
      const horariosDia = horarioPorDia.get(diaSemana) || [];
      if (horariosDia.length === 0) continue;

      // Solo periodos ya asignados para esa fecha
      const horariosValidos = horariosDia.filter(h => {
        const createdAtStr = typeof h.createdAt === 'string'
          ? h.createdAt.split('T')[0]
          : h.createdAt instanceof Date
            ? h.createdAt.toISOString().split('T')[0]
            : '';
        return fechaStr >= createdAtStr;
      });
      if (horariosValidos.length === 0) continue;

      const asistenciasFecha = asistenciaPorFecha.get(fechaStr) || [];
      const permisosFecha = permisosIdx.get(fechaStr) || [];
      const esHoy = fechaStr === hoyStr;
      const asignadasIds = new Set();

      // ── Agrupar periodos contiguos en bloques maestros (Jornada Continua) ──
      const bloques = agruparHorariosContiguos(horariosValidos);

      for (const bloque of bloques) {
        const inicioBloqueMin = timeToMinutes(bloque.horaInicio);
        const finBloqueMin = timeToMinutes(bloque.horaFin);
        const periodoLabel = `${bloque.horaInicio}–${bloque.horaFin}`;

        // ── Marcaciones cuya entrada cae dentro del bloque maestro ──
        const asistenciasBloque = asistenciasFecha.filter(a => {
          if (!a.horaEntrada) return false;
          const min = getBoliviaDate(a.horaEntrada).getHours() * 60 + getBoliviaDate(a.horaEntrada).getMinutes();
          return min >= inicioBloqueMin - 20 && min <= finBloqueMin;
        });

        if (asistenciasBloque.length > 0) {
          for (const a of asistenciasBloque) asignadasIds.add(a.id);

          // Primera entrada y última salida del día dentro del bloque
          const primera = asistenciasBloque.reduce((acc, a) =>
            (!acc || a.horaEntrada < acc.horaEntrada) ? a : acc, null);
          const ultima = asistenciasBloque.reduce((acc, a) =>
            (!acc || (a.horaSalida && a.horaSalida > acc.horaSalida)) ? a : acc, null);

          const entradaMin = getBoliviaDate(primera.horaEntrada).getHours() * 60 + getBoliviaDate(primera.horaEntrada).getMinutes();
          let estado = 'Puntual';
          let minutosRetraso = entradaMin > inicioBloqueMin ? entradaMin - inicioBloqueMin : null;
          if (minutosRetraso !== null && minutosRetraso > toleranciaMin) {
            estado = 'Tardanza';
          } else {
            minutosRetraso = null;
          }

          data.push({
            id: primera.id,
            fecha: fechaStr,
            fechaLegible: new Date(fechaStr + 'T12:00:00').toLocaleDateString('es-BO', {
              timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            }),
            horaEntrada: fmtTime(primera.horaEntrada),
            horaSalida: ultima && ultima.horaSalida ? fmtTime(ultima.horaSalida) : null,
            estado,
            periodo: periodoLabel,
            observacion: null,
            minutosRetraso,
            salidaOmitida: (ultima && ultima.horaSalida) ? !!ultima.salidaOmitida : !!primera.salidaOmitida,
          });
          continue;
        }

        // ── Sin marcación → ¿cubre permiso aprobado? ──
        const permisoCubre = permisosFecha.find(p => {
          const tienePeriodos = p.periodos && p.periodos.length > 0;
          if (!tienePeriodos) return true;
          return bloque.horarios.some(h =>
            p.periodos.some(pp =>
              pp.periodo.horaInicio === h.horaInicio && pp.periodo.horaFin === h.horaFin
            )
          );
        });

        if (permisoCubre) {
          const p = permisoCubre;
          const obsTexto = `${p.tipoPermiso?.nombre || 'Permiso'}: ${p.motivo || ''}`;
          const tienePeriodos = p.periodos && p.periodos.length > 0;
          const nombrePeriodos = tienePeriodos
            ? p.periodos.map(pp => `${pp.periodo.horaInicio}–${pp.periodo.horaFin}`).join(', ')
            : 'Todo el día';
          data.push({
            id: `permiso-${p.id}`,
            fecha: fechaStr,
            fechaLegible: new Date(fechaStr + 'T12:00:00').toLocaleDateString('es-BO', {
              timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            }),
            horaEntrada: null,
            horaSalida: null,
            estado: 'Justificado',
            periodo: nombrePeriodos,
            observacion: obsTexto,
            minutosRetraso: null,
            salidaOmitida: false,
          });
          continue;
        }

        // ── Sin marcación ni permiso → Ausente (solo si el bloque ya pasó hoy) ──
        if (esHoy) {
          if (ahoraMin < finBloqueMin) continue;
        }

        data.push({
          id: `ausente-${fechaStr}-${periodoLabel.replace(/:/g, '').replace(/–/g, '-')}`,
          fecha: fechaStr,
          fechaLegible: new Date(fechaStr + 'T12:00:00').toLocaleDateString('es-BO', {
            timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          }),
          horaEntrada: null,
          horaSalida: null,
          estado: 'Ausente',
          periodo: periodoLabel,
          observacion: `Sin marcación en ${periodoLabel}`,
          minutosRetraso: null,
          salidaOmitida: false,
        });
      }

      // ── Marcaciones que no caen en ningún bloque (fuera de horario) ──
      for (const a of asistenciasFecha) {
        if (asignadasIds.has(a.id)) continue;
        const fd2 = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
        const fStr2 = fd2.toISOString().split('T')[0];
        let estado = 'Puntual';
        let minutosRetraso = null;
        if (a.horaEntrada) {
          const obs = (a.observacion || '').toLowerCase();
          if (obs.startsWith('llegó') || obs.includes('tarde')) {
            const match = a.observacion.match(/Llegó\s+(\d+)\s+min/);
            minutosRetraso = match ? parseInt(match[1]) : null;
            if (minutosRetraso !== null && minutosRetraso > toleranciaMin) {
              estado = 'Tardanza';
            } else {
              minutosRetraso = null;
            }
          }
        }
        data.push({
          id: a.id,
          fecha: fStr2,
          fechaLegible: new Date(fStr2 + 'T12:00:00').toLocaleDateString('es-BO', {
            timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          }),
          horaEntrada: fmtTime(a.horaEntrada),
          horaSalida: fmtTime(a.horaSalida),
          estado,
          periodo: a.periodo || null,
          observacion: a.observacion,
          minutosRetraso,
          salidaOmitida: a.salidaOmitida,
        });
      }
    }

    data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json({
      ok: true,
      data,
      resumen: {
        total: data.length,
        puntual: data.filter((d) => d.estado === 'Puntual').length,
        tardanza: data.filter((d) => d.estado === 'Tardanza').length,
        justificado: data.filter((d) => d.estado === 'Justificado').length,
        ausente: data.filter((d) => d.estado === 'Ausente').length,
      },
    });
  } catch (error) {
    console.error('[asistencia.miHistorial]', error);
    res.json({ ok: true, data: [], resumen: { total: 0, puntual: 0, tardanza: 0, justificado: 0, ausente: 0 } });
  }
}

/**
 * GET /api/asistencia/cumplimiento-semanal
 * Query: ?semanaOffset=0&horasContratadas=todas|20|40
 *
 * Calcula el avance semanal acumulado de horas trabajadas (suma de
 * horaSalida - horaEntrada en marcaciones cerradas) contra las horas
 * contratadas (horasBase) de cada empleado activo, en el rango
 * Lunes–Domingo de la semana seleccionada.
 */
async function cumplimientoSemanal(req, res) {
  try {
    const semanaOffset = parseInt(req.query.semanaOffset, 10) || 0;
    const horasParam = req.query.horasContratadas || 'todas';
    const fechaStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const hoy = getBoliviaDate();
    const diffToMonday = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - diffToMonday + semanaOffset * 7);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    const start = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate(), 0, 0, 0, 0);
    const end = new Date(domingo.getFullYear(), domingo.getMonth(), domingo.getDate(), 23, 59, 59, 999);

    // Empleados activos (rol EMPLEADO)
    const empleados = await prisma.usuario.findMany({
      where: { activo: true, rol: 'EMPLEADO' },
      select: { id: true, nombre: true, codigo: true, ci: true, horasBase: true },
    });

    // Marcaciones cerradas dentro del rango de la semana
    const asistencias = await prisma.asistencia.findMany({
      where: {
        fecha: { gte: start, lte: end },
        horaEntrada: { not: null },
        horaSalida: { not: null },
      },
      select: { usuarioId: true, horaEntrada: true, horaSalida: true },
    });

    // Suma de horas trabajadas por empleado
    const horasPorEmpleado = new Map();
    for (const a of asistencias) {
      const duracionMs = new Date(a.horaSalida).getTime() - new Date(a.horaEntrada).getTime();
      if (duracionMs <= 0) continue;
      const horas = duracionMs / 3600000;
      horasPorEmpleado.set(a.usuarioId, (horasPorEmpleado.get(a.usuarioId) || 0) + horas);
    }

    const data = empleados.map((emp) => {
      const horasContratadas = emp.horasBase || 0;
      const horasTrabajadas = Math.round((horasPorEmpleado.get(emp.id) || 0) * 100) / 100;
      const porcentajeCumplimiento = horasContratadas > 0
        ? Math.round((horasTrabajadas / horasContratadas) * 1000) / 10
        : 0;

      let estadoCumplimiento = 'En Riesgo';
      if (horasTrabajadas > horasContratadas) estadoCumplimiento = 'Superado';
      else if (porcentajeCumplimiento >= 100) estadoCumplimiento = 'Cumplido';
      else if (porcentajeCumplimiento >= 60) estadoCumplimiento = 'En Progreso';

      return {
        id: emp.id,
        nombre: emp.nombre,
        codigo: emp.codigo || `CC-${String(emp.id).padStart(3, '0')}`,
        ci: emp.ci || '',
        horasContratadas,
        horasTrabajadas,
        porcentajeCumplimiento,
        estadoCumplimiento,
      };
    });

    // Filtro por horas contratadas (todas | 20 | 40)
    const dataFiltrada = horasContratadas === 'todas'
      ? data
      : data.filter((emp) => emp.horasContratadas === parseInt(horasContratadas, 10));

    res.json({
      ok: true,
      data: dataFiltrada,
      resumen: {
        semana: { lunes: fechaStr(lunes), domingo: fechaStr(domingo), semanaOffset },
        totalEmpleados: dataFiltrada.length,
        cumplidos: dataFiltrada.filter((e) => e.estadoCumplimiento === 'Cumplido' || e.estadoCumplimiento === 'Superado').length,
        enProgreso: dataFiltrada.filter((e) => e.estadoCumplimiento === 'En Progreso').length,
        enRiesgo: dataFiltrada.filter((e) => e.estadoCumplimiento === 'En Riesgo').length,
        promedioHoras: dataFiltrada.length
          ? Math.round((dataFiltrada.reduce((s, e) => s + e.horasTrabajadas, 0) / dataFiltrada.length) * 10) / 10
          : 0,
      },
    });
  } catch (error) {
    console.error('[asistencia.cumplimientoSemanal]', error);
    res.status(500).json({ ok: false, message: 'Error al calcular el cumplimiento semanal' });
  }
}

module.exports = { registrar, marcar, marcarMovil, getQrDashboard, getAll, getById, cerrarTurno, getEstadoHoy, miHistorial, cumplimientoSemanal };

