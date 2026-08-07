// src/routes/feriado.routes.js

const { Router } = require('express');
const { getAll, create, remove } = require('../controllers/feriado.controller');
const { authMiddleware, requireRol } = require('../middlewares/auth.middleware');

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// GET /api/feriados — listar feriados (cualquier usuario autenticado)
router.get('/', getAll);

// POST /api/feriados — crear feriado (solo ADMIN)
router.post('/', requireRol('ADMIN'), create);

// DELETE /api/feriados/:id — eliminar feriado (solo ADMIN)
router.delete('/:id', requireRol('ADMIN'), remove);

module.exports = router;
