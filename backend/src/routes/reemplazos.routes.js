// src/routes/reemplazos.routes.js
// Rutas de Reemplazos entre Empleados

const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  bloquesDelDia,
  listarEmpleados,
  solicitar,
  misSolicitudes,
  aceptar,
  rechazar,
  adminListar,
} = require('../controllers/reemplazos.controller');

const router = Router();

// ── Empleado (App Móvil) ──────────────────────────────────────
router.get('/bloques',         authMiddleware, bloquesDelDia);
router.get('/empleados',       authMiddleware, listarEmpleados);
router.get('/mis-solicitudes', authMiddleware, misSolicitudes);
router.post('/solicitar',      authMiddleware, solicitar);
router.put('/:id/aceptar',     authMiddleware, aceptar);
router.put('/:id/rechazar',    authMiddleware, rechazar);

// ── Administrador (Panel Web) ─────────────────────────────────
router.get('/admin',           authMiddleware, adminListar);

module.exports = router;