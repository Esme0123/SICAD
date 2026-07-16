const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { generarPasswordPorDefecto } = require('../utils/password.utils');
const { registrarAuditoria } = require('./auditoria.controller');

async function getAll(req, res) {
  try {
    const usuarios = await prisma.usuarioSistema.findMany({
      select: { id: true, nombre: true, email: true, rol: true, activo: true, codigo: true, ci: true, celular: true, createdAt: true },
      orderBy: { nombre: 'asc' },
    });
    res.json({ ok: true, data: usuarios });
  } catch (error) {
    console.error('[usuarioSistema.getAll]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener usuarios del sistema' });
  }
}

async function getById(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });
    const usuario = await prisma.usuarioSistema.findUnique({
      where: { id },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, codigo: true, ci: true, celular: true },
    });
    if (!usuario) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    res.json({ ok: true, data: usuario });
  } catch (error) {
    console.error('[usuarioSistema.getById]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener usuario' });
  }
}

async function create(req, res) {
  try {
    const { nombre, email, password, rol, codigo, ci, celular } = req.body;

    if (!nombre || !email || !rol) {
      return res.status(400).json({ ok: false, message: 'nombre, email y rol son requeridos' });
    }

    if (!email.endsWith('@ucb.edu.bo')) {
      return res.status(400).json({ ok: false, message: 'El email debe terminar en @ucb.edu.bo' });
    }

    const existing = await prisma.usuarioSistema.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ ok: false, message: 'Ya existe un usuario con ese email' });
    }

    // Generar contraseña por defecto basada en el email
    const emailPrefijo = email.split('@')[0];
    const defaultPassword = password || generarPasswordPorDefecto(emailPrefijo);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    const usuario = await prisma.usuarioSistema.create({
      data: {
        nombre,
        email,
        passwordHash,
        rol,
        ...(codigo !== undefined && { codigo }),
        ...(ci !== undefined && { ci }),
        ...(celular !== undefined && { celular }),
      },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, codigo: true, ci: true, celular: true },
    });

    const direccionIP = req.ip || req.connection?.remoteAddress || 'unknown';
    await registrarAuditoria(`Usuario del sistema creado: ${email} (${rol})`, req.usuario?.email || 'sistema', direccionIP);

    res.status(201).json({
      ok: true,
      data: usuario,
      defaultPassword: password ? undefined : defaultPassword,
    });
  } catch (error) {
    console.error('[usuarioSistema.create]', error);
    res.status(500).json({ ok: false, message: 'Error al crear usuario' });
  }
}

async function update(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });

    const { nombre, email, rol, activo, codigo, ci, celular } = req.body;
    const data = {};

    if (nombre !== undefined) data.nombre = nombre;
    if (email !== undefined) {
      if (!email.endsWith('@ucb.edu.bo')) {
        return res.status(400).json({ ok: false, message: 'El email debe terminar en @ucb.edu.bo' });
      }
      data.email = email;
    }
    if (rol !== undefined) data.rol = rol;
    if (activo !== undefined) data.activo = activo;
    if (codigo !== undefined) data.codigo = codigo;
    if (ci !== undefined) data.ci = ci;
    if (celular !== undefined) data.celular = celular;

    const usuario = await prisma.usuarioSistema.update({
      where: { id },
      data,
      select: { id: true, nombre: true, email: true, rol: true, activo: true, codigo: true, ci: true, celular: true },
    });

    res.json({ ok: true, data: usuario });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }
    console.error('[usuarioSistema.update]', error);
    res.status(500).json({ ok: false, message: 'Error al actualizar usuario' });
  }
}

async function changePassword(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });

    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ ok: false, message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.usuarioSistema.update({
      where: { id },
      data: { passwordHash },
    });

    res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }
    console.error('[usuarioSistema.changePassword]', error);
    res.status(500).json({ ok: false, message: 'Error al cambiar contraseña' });
  }
}

async function remove(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });

    const usuario = await prisma.usuarioSistema.findUnique({ where: { id }, select: { email: true } });
    await prisma.usuarioSistema.delete({ where: { id } });

    const direccionIP = req.ip || req.connection?.remoteAddress || 'unknown';
    await registrarAuditoria(`Usuario del sistema eliminado: ${usuario?.email}`, req.usuario?.email || 'sistema', direccionIP);

    res.json({ ok: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }
    console.error('[usuarioSistema.remove]', error);
    res.status(500).json({ ok: false, message: 'Error al eliminar usuario' });
  }
}

module.exports = { getAll, getById, create, update, changePassword, remove };
