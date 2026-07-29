const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/db');
const { JWT_SECRET } = require('../config/env');
const { registrarAuditoria } = require('./auditoria.controller');
const { enviarCorreoReset } = require('../services/email.service');

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'email y password son requeridos' });
    }

    const usuario = await prisma.usuarioSistema.findUnique({
      where: { email },
    });

    if (!usuario) {
      return res.status(401).json({ ok: false, message: 'Credenciales incorrectas' });
    }

    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValido) {
      return res.status(401).json({ ok: false, message: 'Credenciales incorrectas' });
    }

    const payload = { id: usuario.id, rol: usuario.rol };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    // Registrar en auditoría
    const direccionIP = req.ip || req.connection?.remoteAddress || 'unknown';
    await registrarAuditoria('Login exitoso', usuario.email, direccionIP);

    res.json({
      ok: true,
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo,
      },
    });
  } catch (error) {
    console.error('[auth.login]', error);
    res.status(500).json({ ok: false, message: 'Error en el servidor durante el login' });
  }
}

/**
 * POST /api/auth/login-movil
 * Autentica a un empleado (modelo Usuario) con código y contraseña.
 * Devuelve un JWT específico para la app móvil.
 */
async function loginMovil(req, res) {
  try {
    const { codigo, password } = req.body;

    if (!codigo || !password) {
      return res.status(400).json({ ok: false, message: 'código y password son requeridos' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { codigo: codigo.toUpperCase() },
    });

    if (!usuario) {
      return res.status(401).json({ ok: false, message: 'Código o contraseña incorrectos' });
    }

    if (!usuario.activo) {
      return res.status(403).json({ ok: false, message: 'Tu cuenta está desactivada. Contacta al administrador.' });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ ok: false, message: 'Código o contraseña incorrectos' });
    }

    const payload = { id: usuario.id, codigo: usuario.codigo, rol: 'EMPLEADO' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      ok: true,
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        codigo: usuario.codigo,
        email: usuario.email,
        ci: usuario.ci,
        celular: usuario.celular,
        rol: usuario.rol,
        activo: usuario.activo,
        horasBase: usuario.horasBase,
        horasProgramadas: usuario.horasProgramadas,
      },
    });
  } catch (error) {
    console.error('[auth.loginMovil]', error);
    res.status(500).json({ ok: false, message: 'Error en el servidor durante el login' });
  }
}

/**
 * GET /api/auth/me
 * Devuelve el perfil del usuario autenticado desde UsuarioSistema.
 * req.usuario viene del authMiddleware (JWT verificado).
 */
async function getProfile(req, res) {
  try {
    const userSistema = await prisma.usuarioSistema.findUnique({
      where: { id: req.usuario.id },
      select: { id: true, nombre: true, email: true, rol: true, activo: true },
    });

    if (userSistema) {
      return res.json({
        ok: true,
        usuario: {
          id: userSistema.id,
          nombre: userSistema.nombre,
          email: userSistema.email,
          rol: userSistema.rol,
          activo: userSistema.activo,
        },
      });
    }

    return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
  } catch (error) {
    console.error('[auth.getProfile]', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener perfil' });
  }
}

/**
 * POST /api/auth/forgot-password
 * Genera un token de reset y envía el correo al usuario del sistema.
 * Body: { email }
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ ok: false, message: 'El correo es requerido' });
    }

    // Respuesta genérica para no revelar si el email existe
    const generic = { ok: true, message: 'Si el correo está registrado, recibirás un enlace de restablecimiento.' };

    const usuario = await prisma.usuarioSistema.findUnique({ where: { email } });
    if (!usuario) return res.json(generic);

    // Generar token seguro de 32 bytes
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Guardar token hasheado en la BD
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.usuarioSistema.update({
      where: { id: usuario.id },
      data: {
        resetToken:        tokenHash,
        resetTokenExpires: expira,
      },
    });

    // Enviar correo (si SMTP está configurado)
    await enviarCorreoReset(usuario.email, usuario.nombre, token);

    return res.json(generic);
  } catch (error) {
    console.error('[auth.forgotPassword]', error);
    return res.status(500).json({ ok: false, message: 'Error al procesar la solicitud' });
  }
}

/**
 * POST /api/auth/reset-password
 * Valida el token y actualiza la contraseña.
 * Body: { token, nuevaPassword }
 */
async function resetPassword(req, res) {
  try {
    const { token, nuevaPassword } = req.body;
    if (!token || !nuevaPassword) {
      return res.status(400).json({ ok: false, message: 'token y nuevaPassword son requeridos' });
    }
    if (nuevaPassword.length < 6) {
      return res.status(400).json({ ok: false, message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const usuario = await prisma.usuarioSistema.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!usuario) {
      return res.status(400).json({ ok: false, message: 'El enlace de restablecimiento es inválido o ha expirado' });
    }

    const passwordHash = await bcrypt.hash(nuevaPassword, 10);
    await prisma.usuarioSistema.update({
      where: { id: usuario.id },
      data: {
        passwordHash,
        resetToken:        null,
        resetTokenExpires: null,
      },
    });

    return res.json({ ok: true, message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('[auth.resetPassword]', error);
    return res.status(500).json({ ok: false, message: 'Error al restablecer la contraseña' });
  }
}

module.exports = { login, loginMovil, getProfile, forgotPassword, resetPassword };
