// src/routes/horasExtras.routes.js
// Rutas de Horas Extras / Recuperación de Horas

const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  bloquesDisponibles,
  solicitar,
  misSolicitudes,
  adminListar,
  aprobar,
  rechazar,
} = require('../controllers/horasExtras.controller');

const router = Router();

// ── Empleado (App Móvil) ──────────────────────────────────────
router.get('/bloques',           authMiddleware, bloquesDisponibles);
router.get('/mis-solicitudes',   authMiddleware, misSolicitudes);
router.post('/solicitar',        authMiddleware, solicitar);

// ── Administrador (Panel Web) ─────────────────────────────────
router.get('/admin',             authMiddleware, adminListar);
router.put('/admin/:id/aprobar', authMiddleware, aprobar);
router.put('/admin/:id/rechazar', authMiddleware, rechazar);

module.exports = router;