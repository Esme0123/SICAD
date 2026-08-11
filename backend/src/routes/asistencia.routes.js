// src/routes/asistencia.routes.js

const { Router } = require('express');
const { registrar, marcar, marcarMovil, getAll, getById, cerrarTurno, editarAdmin, getEstadoHoy, getQrDashboard, miHistorial, cumplimientoSemanal } = require('../controllers/asistencia.controller');
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
router.get('/qr-dashboard',       getQrDashboard);
router.get('/estado-hoy',         getEstadoHoy);
router.get('/mi-historial',       miHistorial);
router.get('/cumplimiento-semanal', cumplimientoSemanal);
router.get('/:id',                getById);

// PATCH /api/asistencia/:id/cerrar — cronjob cierre automático de turnos (solo ADMIN)
router.patch('/:id/cerrar',       requireRol('ADMIN'), cerrarTurno);

// PUT /api/asistencia/:id/editar — edición manual de marcaciones (solo ADMIN)
router.put('/:id/editar',         requireRol('ADMIN'), editarAdmin);

module.exports = router;

