// src/controllers/user.controller.js
// CRUD de usuarios + consulta de horas base/programadas

const bcrypt = require('bcryptjs');
const prisma = require('../config/db');

// GET /api/usuarios
async function getAll(req, res) {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { rol: 'EMPLEADO' },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        horasBase: true,
        horasProgramadas: true,
        codigo: true,
        ci: true,
        celular: true,
        activo: true,
        createdAt: true,
        _count: { select: { horariosAsignados: true } },
      },
      orderBy: { nombre: 'asc' },
    });
    res.json({ ok: true, data: usuarios });
  } catch (error) {
    console.error('[user.getAll]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener usuarios' });
  }
}

// GET /api/usuarios/:id
async function getById(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: {
        horariosAsignados: { include: { periodo: true } },
      },
    });
    if (!usuario) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    res.json({ ok: true, data: usuario });
  } catch (error) {
    console.error('[user.getById]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener usuario' });
  }
}

// POST /api/usuarios
async function create(req, res) {
  try {
    const { nombre, email, password, rol, horasBase, ci, celular, activo } = req.body;
    if (!nombre || !email) {
      return res.status(400).json({ ok: false, message: 'nombre y email son requeridos' });
    }

    // Buscar el último usuario registrado con código 'CC-'
    const ultimoUsuario = await prisma.usuario.findFirst({
      where: {
        codigo: {
          startsWith: 'CC-',
        },
      },
      orderBy: {
        codigo: 'desc',
      },
    });

    let nuevoCodigo = 'CC-001';
    if (ultimoUsuario && ultimoUsuario.codigo) {
      const match = ultimoUsuario.codigo.match(/CC-(\d+)/);
      if (match) {
        const numero = parseInt(match[1], 10);
        const siguiente = numero + 1;
        nuevoCodigo = `CC-${String(siguiente).padStart(3, '0')}`;
      }
    }

    const ciGuardar = (ci && typeof ci === 'string' && ci.trim()) ? ci.trim() : null;
    const celularGuardar = (celular && typeof celular === 'string' && celular.trim()) ? celular.trim() : null;
    const activoGuardar = activo !== undefined ? Boolean(activo) : true;

    // Contraseña por defecto: CI o "123456"
    const passwordEfectiva = (password && typeof password === 'string' && password.trim())
      ? password.trim()
      : (ciGuardar || "123456");

    const passwordHash = await bcrypt.hash(passwordEfectiva, 10);
    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: passwordHash,
        rol,
        horasBase,
        codigo: nuevoCodigo,
        ci: ciGuardar,
        celular: celularGuardar,
        activo: activoGuardar,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        horasBase: true,
        horasProgramadas: true,
        codigo: true,
        ci: true,
        celular: true,
        activo: true,
      },
    });
    res.status(201).json({ ok: true, data: usuario });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ ok: false, message: 'El email o código ya está registrado' });
    }
    console.error('[user.create]', error);
    res.status(500).json({ ok: false, message: 'Error al crear usuario' });
  }
}

// PATCH /api/usuarios/:id
async function update(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });
    const { nombre, email, password, rol, horasBase, horasProgramadas, activo } = req.body;

    // Validar unicidad del email antes de actualizar
    if (email !== undefined) {
      const existing = await prisma.usuario.findUnique({ where: { email } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ ok: false, message: 'El email ya está registrado por otro usuario' });
      }
    }

    const data = {};
    if (nombre !== undefined) data.nombre = nombre;
    if (email !== undefined) data.email = email;
    if (password !== undefined) data.password = password;
    if (rol !== undefined) data.rol = rol;
    if (horasBase !== undefined) data.horasBase = horasBase;
    if (horasProgramadas !== undefined) data.horasProgramadas = horasProgramadas;
    if (activo !== undefined) data.activo = Boolean(activo);

    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, nombre: true, email: true, rol: true, horasBase: true, horasProgramadas: true, activo: true },
    });
    res.json({ ok: true, data: usuario });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ ok: false, message: 'El email o código ya está registrado' });
    }
    console.error('[user.update]', error);
    res.status(500).json({ ok: false, message: 'Error al actualizar usuario' });
  }
}

// DELETE /api/usuarios/:id
async function remove(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });
    await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }
    console.error('[user.remove]', error);
    res.status(500).json({ ok: false, message: 'Error al eliminar usuario' });
  }
}

// GET /api/usuarios/empleados  — Lista empleados con resumen de horas
async function getEmpleados(req, res) {
  try {
    const empleados = await prisma.usuario.findMany({
      where: { rol: 'EMPLEADO' },
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
        horariosAsignados: {
          include: { periodo: { select: { nombre: true, horaInicio: true, horaFin: true, duracion: true } } },
        },
      },
      orderBy: { nombre: 'asc' },
    });
    res.json({ ok: true, data: empleados });
  } catch (error) {
    console.error('[user.getEmpleados]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener empleados' });
  }
}

module.exports = { getAll, getById, create, update, remove, getEmpleados };
