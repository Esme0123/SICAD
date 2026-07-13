// src/routes/asistencia.routes.js

const { Router } = require('express');
const { registrar, getAll, getById, cerrarTurno } = require('../controllers/asistencia.controller');

const router = Router();

// POST /api/asistencia/registrar  — escaneo QR: entrada o salida según estado
router.post('/registrar',          registrar);

router.get('/',                    getAll);
router.get('/:id',                 getById);

// PATCH /api/asistencia/:id/cerrar — cronjob cierre automático de turnos
router.patch('/:id/cerrar',        cerrarTurno);

module.exports = router;
