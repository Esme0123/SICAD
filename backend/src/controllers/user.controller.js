// src/controllers/user.controller.js
// CRUD de usuarios + consulta de horas base/programadas

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/db');
const { enviarCorreoInvitacion, sendSendGridEmail } = require('../services/email.service');
const { isValidPassword, PASSWORD_ERROR_MESSAGE } = require('../utils/validators');

// GET /api/usuarios
// Query params: ?periodoAcademico=1-2026 (filtra el conteo de horarios asignados por periodo)
async function getAll(req, res) {
  try {
    const { periodoAcademico } = req.query;

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
        inviteToken: true,
        createdAt: true,
        _count: { select: { horariosAsignados: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    let horariosPorUsuario = null;
    if (periodoAcademico) {
      const counts = await prisma.horarioAsignado.groupBy({
        by: ['usuarioId'],
        where: { periodoAcademico: String(periodoAcademico) },
        _count: { _all: true },
      });
      horariosPorUsuario = new Map(counts.map(c => [c.usuarioId, c._count._all]));
    }

    const data = usuarios.map(({ inviteToken, _count, ...rest }) => {
      const horariosAsignados = horariosPorUsuario
        ? (horariosPorUsuario.get(rest.id) ?? 0)
        : (_count?.horariosAsignados ?? 0);
      return {
        ...rest,
        _count: { horariosAsignados },
        invitacionPendiente: inviteToken !== null,
      };
    });

    res.json({ ok: true, data });
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
    const { nombre, email, password, rol, horasBase, ci, celular, activo, codigo, code } = req.body;
    if (!nombre || !email) {
      return res.status(400).json({ ok: false, message: 'nombre y email son requeridos' });
    }

    let nuevoCodigo = codigo || code;
    if (!nuevoCodigo) {
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

      nuevoCodigo = 'CC-001';
      if (ultimoUsuario && ultimoUsuario.codigo) {
        const match = ultimoUsuario.codigo.match(/CC-(\d+)/);
        if (match) {
          const numero = parseInt(match[1], 10);
          const siguiente = numero + 1;
          nuevoCodigo = `CC-${String(siguiente).padStart(3, '0')}`;
        }
      }
    }

    const ciGuardar = (ci && typeof ci === 'string' && ci.trim()) ? ci.trim() : null;
    const celularGuardar = (celular && typeof celular === 'string' && celular.trim()) ? celular.trim() : null;
    const activoGuardar = activo !== undefined ? Boolean(activo) : true;

    // Contraseña por defecto: CI o "123456"
    const passwordEfectiva = (password && typeof password === 'string' && password.trim())
      ? password.trim()
      : (ciGuardar || "123456");

    if (password && typeof password === 'string' && password.trim() && !isValidPassword(passwordEfectiva)) {
      return res.status(400).json({ ok: false, message: PASSWORD_ERROR_MESSAGE });
    }

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
    res.status(201).json({ ok: true, data: usuario, defaultPassword: passwordEfectiva });
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

/**
 * GET /api/usuarios/perfil
 * Devuelve el perfil del empleado autenticado (desde el JWT).
 */
async function getPerfil(req, res) {
  try {
    const id = parseInt(req.usuario.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        ci: true,
        email: true,
        celular: true,
        rol: true,
        activo: true,
        horasBase: true,
        horasProgramadas: true,
        createdAt: true,
      },
    });

    if (!usuario) return res.status(404).json({ ok: false, message: 'Empleado no encontrado' });
    res.json({ ok: true, data: usuario });
  } catch (error) {
    console.error('[user.getPerfil]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener perfil' });
  }
}

/**
 * PATCH /api/usuarios/cambiar-password
 * Cambia la contraseña del empleado autenticado.
 * Body: { passwordActual, nuevaPassword }
 */
async function cambiarPassword(req, res) {
  try {
    const id = parseInt(req.usuario.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });

    const { passwordActual, nuevaPassword } = req.body;

    if (!passwordActual || !nuevaPassword) {
      return res.status(400).json({ ok: false, message: 'passwordActual y nuevaPassword son requeridos' });
    }

    if (!isValidPassword(nuevaPassword)) {
      return res.status(400).json({ ok: false, message: PASSWORD_ERROR_MESSAGE });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) return res.status(404).json({ ok: false, message: 'Empleado no encontrado' });

    const passwordValido = await bcrypt.compare(passwordActual, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ ok: false, message: 'La contraseña actual no es correcta' });
    }

    const nuevaPasswordHash = await bcrypt.hash(nuevaPassword, 10);
    await prisma.usuario.update({
      where: { id },
      data: { password: nuevaPasswordHash },
    });

    res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('[user.cambiarPassword]', error);
    res.status(500).json({ ok: false, message: 'Error al cambiar contraseña' });
  }
}

/**
 * POST /api/usuarios/invite
 * Invita a un nuevo empleado por correo electrónico.
 * Genera código CC-xxx, invitaToken y envía el correo.
 * Body: { email }
 */
async function invite(req, res) {
  try {
    const raw = req.body.email;
    if (!raw) {
      return res.status(400).json({ ok: false, message: 'Ingresa al menos un correo electrónico.' });
    }

    // Normalizar a array de correos
    const emails = Array.isArray(raw)
      ? raw.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
      : String(raw).split(/[\s,]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);

    if (emails.length === 0) {
      return res.status(400).json({ ok: false, message: 'No se encontraron correos válidos.' });
    }

    let procesados = 0;

    for (const email of emails) {
      try {
        const existente = await prisma.usuario.findUnique({ where: { email } });

        // Saltar activos
        if (existente && existente.activo) continue;

        if (existente && !existente.activo) {
          // Reenviar
          const inviteToken = crypto.randomBytes(32).toString('hex');
          const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

          await prisma.usuario.update({
            where: { id: existente.id },
            data: { inviteToken, inviteTokenExpires: expira },
          });

          enviarCorreoInvitacion(email, email.split('@')[0], inviteToken, existente.codigo || 'CC-???')
            .catch((err) => console.error("❌ ERROR DETALLADO SendGrid API:", err));

          procesados++;
          continue;
        }

        // Crear nuevo
        const ultimo = await prisma.usuario.findFirst({
          where: { codigo: { startsWith: 'CC-' } },
          orderBy: { codigo: 'desc' },
        });

        let codigo = 'CC-001';
        if (ultimo && ultimo.codigo) {
          const m = ultimo.codigo.match(/CC-(\d+)/);
          if (m) codigo = `CC-${String(parseInt(m[1], 10) + 1).padStart(3, '0')}`;
        }

        const inviteToken = crypto.randomBytes(32).toString('hex');
        const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await prisma.usuario.create({
          data: {
            nombre: 'Pendiente',
            email,
            password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
            codigo,
            activo: false,
            inviteToken,
            inviteTokenExpires: expira,
          },
        });

        enviarCorreoInvitacion(email, email.split('@')[0], inviteToken, codigo)
          .catch((err) => console.error("❌ ERROR DETALLADO SendGrid API:", err));

        procesados++;
      } catch (itemError) {
        console.error(`[user.invite] Error procesando ${email}:`, itemError);
      }
    }

    res.json({ ok: true, message: `Se procesaron ${procesados} invitaciones correctamente.` });
  } catch (error) {
    console.error('[user.invite]', error);
    res.status(500).json({ ok: false, message: 'Error al invitar empleados' });
  }
}

/**
 * POST /api/usuarios/complete-registration
 * Endpoint público para que el empleado complete su registro con el token de invitación.
 * Body: { token, nombre, ci, celular, password }
 */
async function completeRegistration(req, res) {
  try {
    const { token, nombre, ci, celular, password } = req.body;

    if (!token || !nombre || !password) {
      return res.status(400).json({ ok: false, message: 'token, nombre y password son requeridos' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ ok: false, message: PASSWORD_ERROR_MESSAGE });
    }

    // Buscar usuario por token de invitación (sin expirar)
    const usuario = await prisma.usuario.findFirst({
      where: {
        inviteToken: token,
        inviteTokenExpires: { gt: new Date() },
      },
    });

    if (!usuario) {
      return res.status(400).json({ ok: false, message: 'El enlace de invitación es inválido o ha expirado. Contacta al administrador.' });
    }

    const ciGuardar = (ci && typeof ci === 'string' && ci.trim()) ? ci.trim() : null;
    const celularGuardar = (celular && typeof celular === 'string' && celular.trim()) ? celular.trim() : null;

    const passwordHash = await bcrypt.hash(password, 10);

    // Actualizar datos del empleado
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        nombre,
        ci: ciGuardar,
        celular: celularGuardar,
        password: passwordHash,
        activo: true,
        inviteToken: null,
        inviteTokenExpires: null,
      },
    });

    res.json({ ok: true, message: 'Registro completado exitosamente. Ya puedes iniciar sesión con tu código y contraseña.' });
  } catch (error) {
    console.error('[user.completeRegistration]', error);
    res.status(500).json({ ok: false, message: 'Error al completar el registro' });
  }
}

/**
 * GET /api/usuarios/test-email?to=correo@ejemplo.com
 * Endpoint de diagnóstico para probar la configuración de correo.
 */
async function testEmail(req, res) {
  const { to } = req.query;
  if (!to) {
    return res.status(400).json({ success: false, error: "Proporciona un correo en el parámetro 'to'" });
  }
  try {
    const result = await sendSendGridEmail(
      to,
      'Prueba SendGrid API - SICAD',
      '<b>¡Correo enviado exitosamente mediante la API de SendGrid!</b>'
    );
    return res.json({ success: true, message: "Correo enviado con éxito", result });
  } catch (error) {
    console.error("❌ Error en testEmail SendGrid:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { getAll, getById, create, update, remove, getEmpleados, getPerfil, cambiarPassword, invite, completeRegistration, testEmail };
