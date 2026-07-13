// src/routes/horario.routes.js

const { Router } = require('express');
const { getPeriodos, getHorarioUsuario, asignar, getHorariosEmpleados, eliminarAsignacion } = require('../controllers/horario.controller');
const { authMiddleware, requireRol } = require('../middlewares/auth.middleware');

const router = Router();

// GET  /api/horarios/periodos          — Catálogo público de periodos
router.get('/periodos', getPeriodos);

// GET  /api/horarios/empleados         — Todos los horarios de empleados
router.get('/empleados', authMiddleware, getHorariosEmpleados);

// GET  /api/horarios/:usuarioId        — Horario de un empleado
router.get('/:usuarioId', authMiddleware, getHorarioUsuario);

// POST /api/horarios/asignar           — Solo ADMIN puede asignar horarios
router.post('/asignar', authMiddleware, requireRol('ADMIN'), asignar);

// DELETE /api/horarios/:id              — Solo ADMIN puede eliminar un periodo de horario
router.delete('/:id', authMiddleware, requireRol('ADMIN'), eliminarAsignacion);

module.exports = router;
