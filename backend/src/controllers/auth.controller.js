// src/controllers/auth.controller.js
// Autenticación: login con bcrypt + JWT

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { JWT_SECRET } = require('../config/env');

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'email y password son requeridos' });
    }

    // 1. Buscar usuario por email
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, nombre: true, email: true, rol: true, password: true, horasBase: true },
    });

    if (!usuario) {
      return res.status(401).json({ ok: false, message: 'Credenciales incorrectas' });
    }

    // 2. Verificar contraseña con bcrypt
    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ ok: false, message: 'Credenciales incorrectas' });
    }

    // 3. Generar token JWT (8 horas de validez)
    const payload = { id: usuario.id, rol: usuario.rol };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    // No retornar el hash del password
    const { password: _pwd, ...usuarioPublico } = usuario;

    res.json({
      ok: true,
      token,
      usuario: usuarioPublico,
    });
  } catch (error) {
    console.error('[auth.login]', error);
    res.status(500).json({ ok: false, message: 'Error en el servidor durante el login' });
  }
}

module.exports = { login };
