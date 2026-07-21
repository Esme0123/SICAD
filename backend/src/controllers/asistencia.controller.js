// src/controllers/asistencia.controller.js
// NÚCLEO del sistema: lógica de escaneo QR con bloques de entrada/salida

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { verifyQRToken } = require('../utils/qrGenerator');
const { obtenerPeriodoActual } = require('../utils/periodo.utils');

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

    // 2. Validar token QR
    const verificacion = verifyQRToken(token);
    if (!verificacion.valid) {
      return res.status(401).json({ ok: false, message: `Token QR inválido: ${verificacion.reason}` });
    }

    // 3. Hora exacta de Bolivia
    const ahora = getBoliviaDate();
    const { start, end } = getDayRange(ahora);
    const diaSemana = getDiaSemanaHoy();

    // 4. Verificar horario asignado para hoy en el periodo académico actual
    const horarioHoy = await prisma.horarioAsignado.findFirst({
      where: { usuarioId: uid, diaSemana, periodoAcademico: obtenerPeriodoActual() },
      include: { periodo: true },
    });

    // 5. Buscar asistencia abierta del día
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

    let periodoLabel = null;
    if (horarioHoy?.periodo) {
      periodoLabel = `${horarioHoy.periodo.horaInicio}–${horarioHoy.periodo.horaFin}`;
    }

    if (!asistenciaAbierta) {
      resultado = await prisma.asistencia.create({
        data: {
          usuarioId: uid,
          fecha: new Date(toBoliviaDateStr(ahora) + "T00:00:00.000Z"),
          horaEntrada: ahora,
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
    }

    res.status(201).json({
      ok: true,
      accion,
      mensaje: `${accion === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada para ${resultado.usuario.nombre}`,
      empleado: { id: resultado.usuario.id, nombre: resultado.usuario.nombre, codigo: resultado.usuario.codigo },
      tieneHorario: !!horarioHoy,
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
        usuario: { select: { id: true, nombre: true, codigo: true, ci: true } },
      },
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

    if (horarios.length > 0) {
      const reachable = horarios.filter((h) => {
        const im = timeToMinutes(h.periodo.horaInicio);
        const fm = timeToMinutes(h.periodo.horaFin);
        return ahoraMin >= im - 30 && ahoraMin <= fm;
      });

      let periodoActivo;

      if (reachable.length > 0) {
        periodoActivo = reachable.find((h) => {
          const im = timeToMinutes(h.periodo.horaInicio);
          const fm = timeToMinutes(h.periodo.horaFin);
          return ahoraMin >= im && ahoraMin <= fm;
        }) ?? reachable.reduce((a, b) =>
          Math.abs(timeToMinutes(a.periodo.horaInicio) - ahoraMin) <
          Math.abs(timeToMinutes(b.periodo.horaInicio) - ahoraMin) ? a : b
        );
      } else {
        periodoActivo = horarios.reduce((a, b) =>
          Math.abs(timeToMinutes(a.periodo.horaInicio) - ahoraMin) <
          Math.abs(timeToMinutes(b.periodo.horaInicio) - ahoraMin) ? a : b
        );
      }

      periodoLabel = `${periodoActivo.periodo.horaInicio}–${periodoActivo.periodo.horaFin}`;

      const permiso = await prisma.permiso.findFirst({
        where: {
          usuarioId: uid,
          estado: 'APROBADO',
          fecha: new Date(toBoliviaDateStr(ahora) + "T00:00:00.000Z"),
          OR: [
            { periodos: { some: { periodoId: periodoActivo.periodoId } } },
            { periodos: { none: {} } },
          ],
        },
      });

      if (permiso) {
        estado = 'A tiempo';
        observacion = 'Cubierto por permiso';
      } else {
        const inicioMin = timeToMinutes(periodoActivo.periodo.horaInicio);
        const diferenciaMin = ahoraMin - inicioMin;

        if (diferenciaMin <= toleranciaMin) {
          estado = 'A tiempo';
        } else {
          estado = 'Atraso';
          observacion = `Llegó ${diferenciaMin} min tarde (tolerancia: ${toleranciaMin} min)`;
        }
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
          fecha:             new Date(toBoliviaDateStr(ahora) + "T00:00:00.000Z"),
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
    console.log("[QR MÓVIL] ¡Entrando a la ruta correcta sin restricciones!");
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

        // Horarios de hoy en el periodo académico actual
        const horarios = await tx.horarioAsignado.findMany({
          where: { usuarioId: usuario.id, diaSemana, periodoAcademico: obtenerPeriodoActual() },
          include: { periodo: true },
          orderBy: { periodo: { horaInicio: 'asc' } },
        });

        let estado = 'Fuera de horario';
        let observacion = null;
        let periodoLabel = null;

        if (horarios.length > 0) {
          const reachable = horarios.filter((h) => {
            const im = timeToMinutes(h.periodo.horaInicio);
            const fm = timeToMinutes(h.periodo.horaFin);
            return ahoraMin >= im - 30 && ahoraMin <= fm;
          });

          let periodoActivo;

          if (reachable.length > 0) {
            periodoActivo = reachable.find((h) => {
              const im = timeToMinutes(h.periodo.horaInicio);
              const fm = timeToMinutes(h.periodo.horaFin);
              return ahoraMin >= im && ahoraMin <= fm;
            }) ?? reachable.reduce((a, b) =>
              Math.abs(timeToMinutes(a.periodo.horaInicio) - ahoraMin) <
              Math.abs(timeToMinutes(b.periodo.horaInicio) - ahoraMin) ? a : b
            );
          } else {
            periodoActivo = horarios.reduce((a, b) =>
              Math.abs(timeToMinutes(a.periodo.horaInicio) - ahoraMin) <
              Math.abs(timeToMinutes(b.periodo.horaInicio) - ahoraMin) ? a : b
            );
          }

          periodoLabel = `${periodoActivo.periodo.horaInicio}–${periodoActivo.periodo.horaFin}`;

          const permiso = await tx.permiso.findFirst({
            where: {
              usuarioId: usuario.id,
              estado: 'APROBADO',
              fecha: new Date(toBoliviaDateStr(ahora) + "T00:00:00.000Z"),
              OR: [
                { periodos: { some: { periodoId: periodoActivo.periodoId } } },
                { periodos: { none: {} } },
              ],
            },
          });

          if (permiso) {
            estado = 'A tiempo';
            observacion = 'Cubierto por permiso';
          } else {
            const inicioMin = timeToMinutes(periodoActivo.periodo.horaInicio);
            const diferenciaMin = ahoraMin - inicioMin;

            if (diferenciaMin <= toleranciaMin) {
              estado = 'A tiempo';
            } else {
              estado = 'Atraso';
              observacion = `Llegó ${diferenciaMin} min tarde (tolerancia: ${toleranciaMin} min)`;
            }
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
              fecha:             new Date(toBoliviaDateStr(ahora) + "T00:00:00.000Z"),
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

    const resultado = await Promise.all(
      periodos.map(async (p) => {
        const [hI, mI] = p.horaInicio.split(':').map(Number);
        const [hF, mF] = p.horaFin.split(':').map(Number);
        const inicioMin = hI * 60 + mI;
        const finMin = hF * 60 + mF;
        const toleranciaFin = inicioMin + TOLERANCIA;

        // Estado del periodo basado en hora actual (5 min de tolerancia)
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

        // Total de empleados asignados para este periodo hoy (solo gestión activa)
        const totalEmpleados = await prisma.horarioAsignado.count({
          where: { periodoId: p.id, diaSemana, periodoAcademico: obtenerPeriodoActual(), usuario: { activo: true } },
        });

        if (totalEmpleados === 0) {
          return {
            id: p.id, nombre: p.nombre, horaInicio: p.horaInicio, horaFin: p.horaFin,
            activo: isActive, estado, totalEmpleados: 0, marcaron: 0, ausentes: 0,
          };
        }

        // Asignados de este periodo (solo gestión activa)
        const asignados = await prisma.horarioAsignado.findMany({
          where: { periodoId: p.id, diaSemana, periodoAcademico: obtenerPeriodoActual(), usuario: { activo: true } },
          select: { usuarioId: true },
        });

        // Cuántos marcaron dentro del rango del periodo
        let marcaron = 0;
        for (const asig of asignados) {
          const mins = entradaPorUsuario.get(asig.usuarioId);
          if (mins) {
            for (const m of mins) {
              if (m >= inicioMin && m <= finMin) { marcaron++; break; }
            }
          }
        }

        const ausentes = totalEmpleados - marcaron;

        // Solo contar ausentes si el periodo ya terminó
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
    if (isNaN(usuarioId)) return res.status(400).json({ ok: false, message: 'ID de usuario inválido' });

    const ahoraBolivia = getBoliviaDate();
    let startDate, endDate;

    const { fechaInicio, fechaFin } = req.query;

    if (fechaInicio && fechaFin) {
      startDate = new Date(fechaInicio + "T04:00:00.000Z");
      endDate   = new Date(fechaFin   + "T27:59:59.999Z");
    } else {
      const anio = parseInt(req.query.anio) || ahoraBolivia.getFullYear();
      const mes  = parseInt(req.query.mes)  || (ahoraBolivia.getMonth() + 1);
      if (mes < 1 || mes > 12) return res.status(400).json({ ok: false, message: 'Mes inválido (1-12)' });
      startDate = new Date(Date.UTC(anio, mes - 1, 1, 4, 0, 0, 0));
      endDate   = new Date(Date.UTC(anio, mes, 0, 27, 59, 59, 999));
    }

    const asistencias = await prisma.asistencia.findMany({
      where: {
        usuarioId,
        fecha: { gte: startDate, lte: endDate },
      },
      orderBy: { fecha: 'desc' },
    });

    // Determinar estado por cada registro
    const data = asistencias.map((a) => {
      const obs = a.observacion || '';
      let estado = 'Puntual';
      if (obs.startsWith('Llegó') || obs.toLowerCase().includes('tarde')) {
        estado = 'Tardanza';
      } else if (obs.includes('permiso') || obs.includes('Permiso')) {
        estado = 'Justificado';
      } else if (a.salidaOmitida) {
        estado = 'Puntual';
      }

      const fmtTime = (d) =>
        d ? getBoliviaDate(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : null;

      return {
        id: a.id,
        fecha: a.fecha,
        fechaLegible: getBoliviaDate(a.fecha).toLocaleDateString('es-BO', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }),
        horaEntrada: fmtTime(a.horaEntrada),
        horaSalida: fmtTime(a.horaSalida),
        estado,
        periodo: a.periodo,
        observacion: a.observacion,
        salidaOmitida: a.salidaOmitida,
      };
    });

    res.json({
      ok: true,
      data,
      resumen: {
        total: data.length,
        puntual: data.filter((d) => d.estado === 'Puntual').length,
        tardanza: data.filter((d) => d.estado === 'Tardanza').length,
        justificado: data.filter((d) => d.estado === 'Justificado').length,
      },
    });
  } catch (error) {
    console.error('[asistencia.miHistorial]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener historial' });
  }
}

module.exports = { registrar, marcar, marcarMovil, getQrDashboard, getAll, getById, cerrarTurno, getEstadoHoy, miHistorial };

