// src/routes/horario.routes.js

const { Router } = require('express');
const { getPeriodos, getHorarioUsuario, asignar } = require('../controllers/horario.controller');
const { authMiddleware, requireRol } = require('../middlewares/auth.middleware');

const router = Router();

// GET  /api/horarios/periodos          — Catálogo público de periodos
router.get('/periodos', getPeriodos);

// GET  /api/horarios/:usuarioId        — Horario de un empleado
router.get('/:usuarioId', authMiddleware, getHorarioUsuario);

// POST /api/horarios/asignar           — Solo ADMIN puede asignar horarios
router.post('/asignar', authMiddleware, requireRol('ADMIN'), asignar);

module.exports = router;
