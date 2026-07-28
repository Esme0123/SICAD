// src/routes/auth.routes.js

const { Router } = require('express');
const { login, loginMovil, getProfile } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

// POST /api/auth/login — Login para administradores (UsuarioSistema)
router.post('/login', login);

// POST /api/auth/login-movil — Login para empleados (Usuario)
router.post('/login-movil', loginMovil);

// GET /api/auth/me — Perfil del usuario autenticado (requiere token)
router.get('/me', authMiddleware, getProfile);

module.exports = router;
