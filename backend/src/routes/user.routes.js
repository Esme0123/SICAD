// src/routes/user.routes.js

const { Router } = require('express');
const { getAll, getById, create, update, remove, getEmpleados, getPerfil, cambiarPassword } = require('../controllers/user.controller');
const { authMiddleware, requireRol } = require('../middlewares/auth.middleware');

const router = Router();

// Todas las rutas de usuarios requieren autenticación
router.use(authMiddleware);

// GET /api/usuarios/perfil        — Perfil del empleado autenticado (debe ir ANTES de /:id)
router.get('/perfil',             getPerfil);
// PATCH /api/usuarios/cambiar-password
router.patch('/cambiar-password', cambiarPassword);

// GET  /api/usuarios/empleados  — debe ir ANTES de /:id para evitar conflicto de rutas
router.get('/empleados',  getEmpleados);

router.get('/',           getAll);
router.get('/:id',        getById);
router.post('/',          requireRol('ADMIN'), create);
router.patch('/:id',      requireRol('ADMIN'), update);
router.delete('/:id',     requireRol('ADMIN'), remove);

module.exports = router;
