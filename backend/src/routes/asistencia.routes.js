// src/routes/asistencia.routes.js

const { Router } = require('express');
const { registrar, marcar, marcarMovil, getAll, getById, cerrarTurno } = require('../controllers/asistencia.controller');
const { authMiddleware, requireRol } = require('../middlewares/auth.middleware');

const router = Router();

// Endpoint público para marcación móvil (valida credenciales encriptadas y firma QR por transacción)
router.post('/marcar-movil',      marcarMovil);

// Todas las rutas de asistencia siguientes requieren autenticación
router.use(authMiddleware);

// POST /api/asistencias/marcar  — escaneo móvil con cálculo de tolerancia y estado
router.post('/marcar',            marcar);

// POST /api/asistencia/registrar  — escaneo QR: entrada o salida según estado
router.post('/registrar',         registrar);

router.get('/',                   getAll);
router.get('/:id',                getById);

// PATCH /api/asistencia/:id/cerrar — cronjob cierre automático de turnos (solo ADMIN)
router.patch('/:id/cerrar',       requireRol('ADMIN'), cerrarTurno);

module.exports = router;

