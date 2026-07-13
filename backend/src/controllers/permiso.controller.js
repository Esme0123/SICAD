// src/controllers/permiso.controller.js
// Gestión de permisos parciales con transacciones Prisma

const prisma = require('../config/db');

// GET /api/permisos
async function getAll(req, res) {
  try {
    const permisos = await prisma.permiso.findMany({
      include: {
        usuario: { select: { id: true, nombre: true, email: true } },
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
// Body: { usuarioId, tipoPermisoId, fecha, motivo, periodosIds: [1, 2, 3] }
async function create(req, res) {
  try {
    const { usuarioId, tipoPermisoId, fecha, motivo, periodosIds } = req.body;

    if (!usuarioId || !tipoPermisoId || !fecha || !motivo) {
      return res.status(400).json({
        ok: false,
        message: 'usuarioId, tipoPermisoId, fecha y motivo son requeridos',
      });
    }

    if (!Array.isArray(periodosIds) || periodosIds.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'periodosIds debe ser un arreglo con al menos un periodo',
      });
    }

    // Transacción: crea Permiso + PermisoPeriodo en un solo commit
    const permiso = await prisma.$transaction(async (tx) => {
      const nuevoPermiso = await tx.permiso.create({
        data: {
          usuarioId: parseInt(usuarioId),
          tipoPermisoId: parseInt(tipoPermisoId),
          fecha: new Date(fecha),
          motivo,
          estado: 'PENDIENTE',
        },
      });

      await tx.permisoPeriodo.createMany({
        data: periodosIds.map((periodoId) => ({
          permisoId: nuevoPermiso.id,
          periodoId: parseInt(periodoId),
        })),
        skipDuplicates: true,
      });

      return tx.permiso.findUnique({
        where: { id: nuevoPermiso.id },
        include: {
          usuario: { select: { id: true, nombre: true } },
          tipoPermiso: { select: { nombre: true } },
          periodos: { include: { periodo: { select: { nombre: true, horaInicio: true, horaFin: true } } } },
        },
      });
    });

    res.status(201).json({ ok: true, data: permiso });
  } catch (error) {
    console.error('[permiso.create]', error);
    res.status(500).json({ ok: false, message: 'Error al crear permiso' });
  }
}

// PATCH /api/permisos/:id/estado
// Body: { estado: 'APROBADO' | 'RECHAZADO', revisadoPor: adminId }
async function cambiarEstado(req, res) {
  try {
    const id = parseInt(req.params.id);
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
        usuario: { select: { nombre: true } },
      },
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

module.exports = { getAll, getById, create, cambiarEstado };
