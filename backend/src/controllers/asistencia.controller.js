// src/controllers/asistencia.controller.js
// NÚCLEO del sistema: lógica de escaneo QR con bloques de entrada/salida

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { verifyQRToken } = require('../utils/qrGenerator');

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

// ── Helpers ──────────────────────────────────────────────────

/**
 * Devuelve el inicio (00:00:00.000) y el fin (23:59:59.999) del día UTC
 * correspondiente a una fecha, para usar en rangos de búsqueda en BD.
 */
function getBoliviaOffset(date = new Date()) {
  const BOLIVIA_UTC_OFFSET = -4 * 60; // UTC-4 en minutos
  const serverOffset = date.getTimezoneOffset(); // en minutos
  return BOLIVIA_UTC_OFFSET - serverOffset;
}

function getBoliviaDate(date = new Date()) {
  return new Date(date.getTime() + getBoliviaOffset(date) * 60000);
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
          fecha: toBoliviaDateStr(ahora),
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
      include: { usuario: { select: { id: true, nombre: true, codigo: true, ci: true } } },
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

    // 1. Verificar token QR
    const verificacion = verifyQRToken(token);
    if (!verificacion.valid) {
      const espirado = verificacion.reason === 'Token expirado';
      return res.status(400).json({
        ok: false,
        message: espirado ? 'El código QR ha expirado' : `Token QR inválido: ${verificacion.reason}`,
        expired: espirado,
      });
    }

    const ahora      = new Date();
    const ahoraMin   = getBoliviaTimeMinutes(ahora);
    const diaSemana  = getDiaSemanaHoy();
    const uid        = parseInt(usuarioId);

    // 2. Leer configuración de tolerancia
    const config = await prisma.configuracion.findUnique({ where: { id: 1 } });
    const toleranciaMin = config?.tiempoToleranciaMinutos ?? 10;

    // 3. Buscar horarios del empleado para hoy
    const horarios = await prisma.horarioAsignado.findMany({
      where: { usuarioId: uid, diaSemana },
      include: { periodo: true },
      orderBy: { periodo: { horaInicio: 'asc' } },
    });

    // 4. Calcular estado de marcación
    let estado = 'Fuera de horario';
    let observacion = null;
    let periodoLabel = null;

    if (horarios.length > 0) {
      // Buscar el periodo más cercano a la hora actual (el que ya inició)
      const periodoActivo = horarios.find((h) => {
        const inicioMin = timeToMinutes(h.periodo.horaInicio);
        const finMin    = timeToMinutes(h.periodo.horaFin);
        return ahoraMin >= inicioMin && ahoraMin <= finMin;
      }) ?? horarios[0]; // si no está en ninguno, usar el primero

      const inicioMin = timeToMinutes(periodoActivo.periodo.horaInicio);
      const diferenciaMin = ahoraMin - inicioMin;

      periodoLabel = `${periodoActivo.periodo.horaInicio}–${periodoActivo.periodo.horaFin}`;

      if (diferenciaMin <= toleranciaMin) {
        estado = 'A tiempo';
      } else {
        estado = 'Atraso';
        observacion = `Llegó ${diferenciaMin} min tarde (tolerancia: ${toleranciaMin} min)`;
      }
    }

    // 5. Registrar entrada o salida
    const { start, end } = getDayRange(ahora);

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
      resultado = await prisma.asistencia.create({
        data: {
          usuarioId:         uid,
          fecha:             toBoliviaDateStr(ahora),
          horaEntrada:       ahora,
          minutosTolerancia: toleranciaMin,
          observacion:       observacion,
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

    res.status(201).json({
      ok: true,
      accion,
      estado,
      periodo: periodoLabel,
      mensaje: `${accion === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada para ${resultado.usuario.nombre}${estado === 'Atraso' ? ' (con atraso)' : ''}`,
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
    const { qrToken, codigo, password } = req.body;

    if (!qrToken || !codigo || !password) {
      return res.status(400).json({ ok: false, message: 'qrToken, codigo y password son requeridos' });
    }

    // 1. Validar Token (HMAC SHA-256)
    const parts = qrToken.split('.');
    if (parts.length !== 2) {
      return res.status(400).json({ ok: false, message: 'Formato de token QR inválido' });
    }
    const [payloadB64, signature] = parts;

    let payload;
    try {
      payload = Buffer.from(payloadB64, 'base64').toString('utf8');
    } catch (e) {
      return res.status(400).json({ ok: false, message: 'Payload mal formado' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.QR_SECRET_KEY)
      .update(payload)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      return res.status(401).json({ ok: false, message: 'Firma del token QR inválida' });
    }

    // 2. Verificar Expiración
    let data;
    try {
      data = JSON.parse(payload);
    } catch (e) {
      return res.status(400).json({ ok: false, message: 'JSON de payload mal formado' });
    }

    if (data.exp < Date.now()) {
      return res.status(400).json({ ok: false, message: 'El código QR ha expirado' });
    }

    // 3. Transacción para prevención de replay, verificación y registro
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
        const config = await tx.configuracion.findUnique({ where: { id: 1 } });
        const toleranciaMin = config?.tiempoToleranciaMinutos ?? 10;

        // Horarios de hoy
        const horarios = await tx.horarioAsignado.findMany({
          where: { usuarioId: usuario.id, diaSemana },
          include: { periodo: true },
          orderBy: { periodo: { horaInicio: 'asc' } },
        });

        let estado = 'Fuera de horario';
        let observacion = null;
        let periodoLabel = null;

        if (horarios.length > 0) {
          const periodoActivo = horarios.find((h) => {
            const inicioMin = timeToMinutes(h.periodo.horaInicio);
            const fontMin   = timeToMinutes(h.periodo.horaFin);
            return ahoraMin >= inicioMin && ahoraMin <= fontMin;
          }) ?? horarios[0];

          const inicioMin = timeToMinutes(periodoActivo.periodo.horaInicio);
          const diferenciaMin = ahoraMin - inicioMin;
          periodoLabel = `${periodoActivo.periodo.horaInicio}–${periodoActivo.periodo.horaFin}`;

          if (diferenciaMin <= toleranciaMin) {
            estado = 'A tiempo';
          } else {
            estado = 'Atraso';
            observacion = `Llegó ${diferenciaMin} min tarde (tolerancia: ${toleranciaMin} min)`;
          }
        }

        // Registrar entrada o salida
        const { start, end } = getDayRange(ahora);

        const asistenciaAbierta = await tx.asistencia.findFirst({
          where: {
            usuarioId: usuario.id,
            fecha: { gte: start, lte: end },
            horaSalida: null,
            salidaOmitida: false,
          },
          orderBy: { horaEntrada: 'desc' },
        });

        let resultado;
        let accion;

        if (!asistenciaAbierta) {
          resultado = await tx.asistencia.create({
            data: {
              usuarioId:         usuario.id,
              fecha:             toBoliviaDateStr(ahora),
              horaEntrada:       ahora,
              minutosTolerancia: toleranciaMin,
              observacion:       observacion,
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

    res.status(201).json({
      ok: true,
      accion: resultadoTransaccion.accion,
      estado: resultadoTransaccion.estado,
      periodo: resultadoTransaccion.periodoLabel,
      mensaje: `${resultadoTransaccion.accion === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada para ${resultadoTransaccion.usuario.nombre}${resultadoTransaccion.estado === 'Atraso' ? ' (con atraso)' : ''}`,
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
    const ahora = new Date();
    const { start, end } = getDayRange(ahora);

    // 1. Total Asistencias hoy
    const totalAsistencias = await prisma.asistencia.count({
      where: {
        fecha: { gte: start, lte: end }
      }
    });

    // 2. Atrasos hoy
    const atrasos = await prisma.asistencia.count({
      where: {
        fecha: { gte: start, lte: end },
        observacion: {
          startsWith: 'Llegó'
        }
      }
    });

    // 3. Último registro hoy
    const ultimo = await prisma.asistencia.findFirst({
      where: {
        fecha: { gte: start, lte: end }
      },
      include: {
        usuario: { select: { nombre: true, codigo: true } }
      },
      orderBy: {
        horaEntrada: 'desc'
      }
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

      const f = (d) => new Date(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      ultimoRegistro = {
        nombre: ultimo.usuario.nombre,
        codigo: ultimo.usuario.codigo || `CC-${String(ultimo.usuarioId).padStart(3, '0')}`,
        hora: f(horaMarcada),
        estado: estadoRegistro,
      };
    }

    // 4. Periodos activos
    const ahoraMin = getBoliviaTimeMinutes(ahora);
    const periodos = await prisma.periodo.findMany({
      where: { activo: true },
      orderBy: { horaInicio: 'asc' }
    });

    const periodosConActivo = periodos.map((p) => {
      const [hI, mI] = p.horaInicio.split(':').map(Number);
      const [hF, mF] = p.horaFin.split(':').map(Number);
      const inicioMin = hI * 60 + mI;
      const finMin = hF * 60 + mF;
      const isActive = ahoraMin >= inicioMin && ahoraMin <= finMin;
      return {
        id: p.id,
        nombre: p.nombre,
        horaInicio: p.horaInicio,
        horaFin: p.horaFin,
        activo: isActive
      };
    });

    res.json({
      ok: true,
      data: {
        totalAsistencias,
        atrasos,
        ultimoRegistro,
        periodos: periodosConActivo
      }
    });
  } catch (error) {
    console.error('[asistencia.getQrDashboard]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener el dashboard del QR' });
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
    const ahora = new Date();
    const diaSemana = getDiaSemanaHoy();
    const ahoraMin = getBoliviaTimeMinutes(ahora);
    const { start, end } = getDayRange(ahora);

    // Periodos activos del catálogo
    const periodos = await prisma.periodo.findMany({
      where: { activo: true },
      orderBy: { horaInicio: 'asc' },
    });

    // Para cada periodo, contar empleados asignados y asistencias registradas hoy
    const resultado = await Promise.all(
      periodos.map(async (p) => {
        const [hI, mI] = p.horaInicio.split(':').map(Number);
        const [hF, mF] = p.horaFin.split(':').map(Number);
        const inicioMin = hI * 60 + mI;
        const finMin = hF * 60 + mF;
        const isActive = ahoraMin >= inicioMin && ahoraMin <= finMin;

        // Empleados activos que tienen este periodo asignado hoy
        const totalEmpleados = await prisma.horarioAsignado.count({
          where: {
            periodoId: p.id,
            diaSemana,
            usuario: { activo: true },
          },
        });

        // Asistencias registradas hoy en este periodo
        const asistencias = await prisma.asistencia.findMany({
          where: {
            fecha: { gte: start, lte: end },
          },
          select: { usuarioId: true },
        });

        // Empleados que marcaron (tienen asistencia hoy y este periodo asignado)
        const userIdsConAsistencia = new Set(asistencias.map((a) => a.usuarioId));
        const marcaron = await prisma.horarioAsignado.count({
          where: {
            periodoId: p.id,
            diaSemana,
            usuarioId: { in: [...userIdsConAsistencia] },
            usuario: { activo: true },
          },
        });

        let estado;
        if (isActive) {
          estado = "entrada";
        } else if (ahoraMin > finMin) {
          estado = marcaron >= totalEmpleados ? "entrada" : "ausente";
        } else {
          estado = "pendiente";
        }

        return {
          id: p.id,
          nombre: p.nombre,
          horaInicio: p.horaInicio,
          horaFin: p.horaFin,
          activo: isActive,
          totalEmpleados,
          marcaron,
          estado,
        };
      })
    );

    res.json({ ok: true, data: resultado });
  } catch (error) {
    console.error('[asistencia.getEstadoHoy]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener estado del día' });
  }
}

module.exports = { registrar, marcar, marcarMovil, getQrDashboard, getAll, getById, cerrarTurno, getEstadoHoy };

