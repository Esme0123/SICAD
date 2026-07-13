// src/controllers/user.controller.js
// CRUD de usuarios + consulta de horas base/programadas

const bcrypt = require('bcryptjs');
const prisma = require('../config/db');

// GET /api/usuarios
async function getAll(req, res) {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        horasBase: true,
        horasProgramadas: true,
        createdAt: true,
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
    const { nombre, email, password, rol, horasBase } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ ok: false, message: 'nombre, email y password son requeridos' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = await prisma.usuario.create({
      data: { nombre, email, password: passwordHash, rol, horasBase },
      select: { id: true, nombre: true, email: true, rol: true, horasBase: true, horasProgramadas: true },
    });
    res.status(201).json({ ok: true, data: usuario });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ ok: false, message: 'El email ya está registrado' });
    }
    console.error('[user.create]', error);
    res.status(500).json({ ok: false, message: 'Error al crear usuario' });
  }
}

// PATCH /api/usuarios/:id
async function update(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { nombre, email, password, rol, horasBase, horasProgramadas } = req.body;
    const usuario = await prisma.usuario.update({
      where: { id },
      data: { nombre, email, password, rol, horasBase, horasProgramadas },
      select: { id: true, nombre: true, email: true, rol: true, horasBase: true, horasProgramadas: true },
    });
    res.json({ ok: true, data: usuario });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }
    console.error('[user.update]', error);
    res.status(500).json({ ok: false, message: 'Error al actualizar usuario' });
  }
}

// DELETE /api/usuarios/:id
async function remove(req, res) {
  try {
    const id = parseInt(req.params.id);
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
