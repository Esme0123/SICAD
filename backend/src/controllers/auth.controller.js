const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { JWT_SECRET } = require('../config/env');
const { registrarAuditoria } = require('./auditoria.controller');

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

module.exports = { login };
