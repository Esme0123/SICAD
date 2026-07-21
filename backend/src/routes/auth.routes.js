// src/routes/auth.routes.js

const { Router } = require('express');
const { login, loginMovil } = require('../controllers/auth.controller');

const router = Router();

// POST /api/auth/login — Login para administradores (UsuarioSistema)
router.post('/login', login);

// POST /api/auth/login-movil — Login para empleados (Usuario)
router.post('/login-movil', loginMovil);

module.exports = router;
