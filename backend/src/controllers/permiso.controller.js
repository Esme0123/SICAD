// src/controllers/permiso.controller.js
// Gestión de permisos parciales con transacciones Prisma

const prisma = require('../config/db');
const { crearNotificacion } = require('./notificacion.controller');

// GET /api/permisos
async function getAll(req, res) {
  try {
    const permisos = await prisma.permiso.findMany({
      include: {
        usuario: { select: { id: true, nombre: true, codigo: true, ci: true } },
        tipoPermiso: { select: { id: true, nombre: true } },
        periodos: { include: { periodo: { select: { id: true, nombre: true, horaInicio: true, horaFin: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ ok: true, data: permisos });
  } catch (error) {
    console.error('[permiso.getAll]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener permisos' });
  }
}

// GET /api/permisos/:id
async function getById(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });
    const permiso = await prisma.permiso.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, nombre: true, email: true } },
        tipoPermiso: true,
        periodos: { include: { periodo: true } },
      },
    });
    if (!permiso) return res.status(404).json({ ok: false, message: 'Permiso no encontrado' });
    res.json({ ok: true, data: permiso });
  } catch (error) {
    console.error('[permiso.getById]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener permiso' });
  }
}

// POST /api/permisos
// Body (JSON): { usuarioId, tipoPermisoId (o tipoPermisoNombre), fecha, motivo, periodosIds: [1,2,3], observacion }
// Body (multipart): mismo + campo "archivo" (file)
async function create(req, res) {
  try {
    let { usuarioId, tipoPermisoId, tipoPermisoNombre, fecha, motivo, periodosIds, estado, observacion } = req.body;

    if (!usuarioId || !fecha || !motivo) {
      return res.status(400).json({
        ok: false,
        message: 'usuarioId, fecha y motivo son requeridos',
      });
    }

    // Resolver tipos desde FormData (multipart envía strings)
    if (typeof usuarioId === 'string') usuarioId = parseInt(usuarioId);
    if (typeof estado === 'string' && estado === '') estado = undefined;
    if (typeof periodosIds === 'string') {
      try {
        periodosIds = JSON.parse(periodosIds);
      } catch {
        periodosIds = periodosIds.split(',').map(Number);
      }
    }

    // periodosIds debe ser un arreglo después del parseo
    if (!Array.isArray(periodosIds) || periodosIds.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'periodosIds debe ser un arreglo con al menos un periodo',
      });
    }

    // Resolver tipoPermisoId por nombre si se envió tipoPermisoNombre
    if (!tipoPermisoId && tipoPermisoNombre) {
      const tipo = await prisma.tipoPermiso.upsert({
        where: { nombre: tipoPermisoNombre },
        create: { nombre: tipoPermisoNombre },
        update: {},
      });
      tipoPermisoId = tipo.id;
    }

    if (!tipoPermisoId) {
      return res.status(400).json({
        ok: false,
        message: 'tipoPermisoId o tipoPermisoNombre es requerido',
      });
    }

    // Ruta del archivo subido (si viene en la petición)
    let adjuntoUrl = null;
    if (req.file) {
      adjuntoUrl = `/uploads/permisos/${req.file.filename}`;
    }

    const permiso = await prisma.$transaction(async (tx) => {
      const nuevoPermiso = await tx.permiso.create({
        data: {
          usuarioId: parseInt(usuarioId),
          tipoPermisoId: parseInt(tipoPermisoId),
          fecha: new Date(fecha),
          motivo,
          estado: estado || 'PENDIENTE',
          observacion: observacion || null,
          adjuntoUrl,
        },
      });

      await tx.permisoPeriodo.createMany({
        data: (Array.isArray(periodosIds) ? periodosIds : []).map((periodoId) => ({
          permisoId: nuevoPermiso.id,
          periodoId: parseInt(periodoId),
        })),
        skipDuplicates: true,
      });

      return tx.permiso.findUnique({
        where: { id: nuevoPermiso.id },
        include: {
          usuario: { select: { id: true, nombre: true, codigo: true, ci: true } },
          tipoPermiso: { select: { nombre: true } },
          periodos: { include: { periodo: { select: { nombre: true, horaInicio: true, horaFin: true } } } },
        },
      });
    });

    // Notificar a administradores
    const empleado = permiso?.usuario;
    crearNotificacion({
      titulo: 'Nueva solicitud de permiso',
      mensaje: `${empleado?.nombre || 'Un empleado'} solicitó un permiso de tipo "${permiso?.tipoPermiso?.nombre || tipoPermisoNombre}" para el ${new Date(fecha).toLocaleDateString('es-BO')}.`,
      permisoId: permiso?.id,
      paraRol: 'ADMIN',
    });

    res.status(201).json({ ok: true, data: permiso });
  } catch (error) {
    console.error('[permiso.create] Error detallado:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack?.split('\n').slice(0, 4).join('\n'),
    });
    if (error.code === 'P2002' || error.code === 'P2003' || error.code === 'P2025') {
      return res.status(400).json({ ok: false, message: `Error de base de datos: ${error.message}` });
    }
    res.status(500).json({ ok: false, message: 'Error al crear permiso' });
  }
}

// PATCH /api/permisos/:id/estado
// Body: { estado: 'APROBADO' | 'RECHAZADO', revisadoPor: adminId }
async function cambiarEstado(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });
    const { estado, revisadoPor } = req.body;

    const estadosValidos = ['APROBADO', 'RECHAZADO'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        ok: false,
        message: `estado debe ser uno de: ${estadosValidos.join(', ')}`,
      });
    }

    const permiso = await prisma.permiso.update({
      where: { id },
      data: {
        estado,
        revisadoPor: revisadoPor ? parseInt(revisadoPor) : undefined,
        fechaRevision: new Date(),
      },
      include: {
        usuario: { select: { id: true, nombre: true } },
        tipoPermiso: { select: { nombre: true } },
      },
    });

    // Notificar al empleado
    crearNotificacion({
      titulo: `Permiso ${estado === 'APROBADO' ? 'aprobado' : 'rechazado'}`,
      mensaje: `Tu solicitud de permiso de tipo "${permiso.tipoPermiso?.nombre || 'Permiso'}" fue ${estado === 'APROBADO' ? 'APROBADA' : 'RECHAZADA'}.`,
      usuarioId: permiso.usuario.id,
      permisoId: permiso.id,
      paraRol: 'EMPLEADO',
    });

    res.json({ ok: true, data: permiso });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, message: 'Permiso no encontrado' });
    }
    console.error('[permiso.cambiarEstado]', error);
    res.status(500).json({ ok: false, message: 'Error al cambiar estado del permiso' });
  }
}

// GET /api/permisos/mis-permisos
// Devuelve los permisos del empleado autenticado (desde JWT del móvil)
// Query: ?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD o ?mes=1-12&anio=YYYY
async function misPermisos(req, res) {
  try {
    const usuarioId = parseInt(req.usuario.id);
    if (isNaN(usuarioId)) {
      return res.json({ ok: true, data: [] });
    }

    const ahoraBolivia = new Date(new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" }));
    let fechaFilter = {};

    const { fechaInicio, fechaFin } = req.query;

    if (fechaInicio && fechaFin) {
      const reDate = /^\d{4}-\d{2}-\d{2}$/;
      if (!reDate.test(fechaInicio) || !reDate.test(fechaFin)) {
        return res.json({ ok: true, data: [] });
      }
      const startDate = new Date(fechaInicio + "T04:00:00.000Z");
      const endDate   = new Date(fechaFin   + "T27:59:59.999Z");
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.json({ ok: true, data: [] });
      }
      fechaFilter = { gte: startDate, lte: endDate };
    } else {
      const anio = parseInt(req.query.anio) || ahoraBolivia.getFullYear();
      const mes  = parseInt(req.query.mes)  || (ahoraBolivia.getMonth() + 1);
      if (mes < 1 || mes > 12) {
        return res.json({ ok: true, data: [] });
      }
      const startDate = new Date(Date.UTC(anio, mes - 1, 1, 4, 0, 0, 0));
      const endDate   = new Date(Date.UTC(anio, mes, 0, 27, 59, 59, 999));
      fechaFilter = { gte: startDate, lte: endDate };
    }

    const permisos = await prisma.permiso.findMany({
      where: {
        usuarioId,
        fecha: fechaFilter,
      },
      include: {
        tipoPermiso: { select: { nombre: true } },
        periodos: { include: { periodo: { select: { id: true, nombre: true, horaInicio: true, horaFin: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ ok: true, data: permisos });
  } catch (error) {
    console.error('[permiso.misPermisos]', error);
    res.json({ ok: true, data: [] });
  }
}

module.exports = { getAll, getById, create, cambiarEstado, misPermisos };
