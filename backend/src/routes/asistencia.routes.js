// src/routes/asistencia.routes.js

const { Router } = require('express');
const { registrar, getAll, getById, cerrarTurno } = require('../controllers/asistencia.controller');
const { authMiddleware, requireRol } = require('../middlewares/auth.middleware');

const router = Router();

// Todas las rutas de asistencia requieren autenticación
router.use(authMiddleware);

// POST /api/asistencia/registrar  — escaneo QR: entrada o salida según estado
router.post('/registrar',         registrar);

router.get('/',                   getAll);
router.get('/:id',                getById);

// PATCH /api/asistencia/:id/cerrar — cronjob cierre automático de turnos (solo ADMIN)
router.patch('/:id/cerrar',       requireRol('ADMIN'), cerrarTurno);

module.exports = router;
