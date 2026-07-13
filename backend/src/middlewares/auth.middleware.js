// src/middlewares/auth.middleware.js
// Verifica el JWT en el header Authorization: Bearer <token>
// Guarda los datos decodificados en req.usuario

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, message: 'Token de autorización requerido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Adjunta { id, rol, iat, exp } al request
    req.usuario = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ ok: false, message: 'Token expirado. Inicia sesión de nuevo.' });
    }
    return res.status(401).json({ ok: false, message: 'Token inválido' });
  }
}

/**
 * Middleware de autorización por rol.
 * Uso: router.get('/ruta', authMiddleware, requireRol('ADMIN'), handler)
 */
function requireRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ ok: false, message: 'Acceso denegado: permisos insuficientes' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRol };
