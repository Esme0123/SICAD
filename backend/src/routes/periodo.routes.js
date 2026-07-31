// src/routes/periodo.routes.js
// Gestión de periodos académicos (gestiones_academicas)

const { Router } = require('express');
const { getGestionesAcademicas, updateVisibilidadMovil } = require('../controllers/periodo.controller');
const { authMiddleware, requireRol } = require('../middlewares/auth.middleware');

const router = Router();

// GET  /api/periodos                — Lista gestiones académicas (filtrada por rol)
router.get('/', authMiddleware, getGestionesAcademicas);

// PATCH /api/periodos/:id/visibilidad — Publica/oculta un periodo en la App Móvil (solo ADMIN)
router.patch('/:id/visibilidad', authMiddleware, requireRol('ADMIN'), updateVisibilidadMovil);

module.exports = router;
