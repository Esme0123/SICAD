// src/routes/notificacion.routes.js

const { Router } = require('express');
const { misNotificaciones, noLeidas, marcarLeida, marcarTodasLeidas, notificacionesAdmin, noLeidasAdmin, marcarAdminLeida, marcarAdminTodasLeidas, eliminarNotificacion, eliminarTodasNotificaciones, eliminarAdminNotificacion, eliminarAdminTodasNotificaciones } = require('../controllers/notificacion.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

router.use(authMiddleware);

// Empleado
router.get('/mis-notificaciones', misNotificaciones);
router.get('/no-leidas',          noLeidas);
router.patch('/leer-todas',       marcarTodasLeidas);
router.patch('/:id/leer',         marcarLeida);

// Admin (notificaciones con paraRol='ADMIN')
router.get('/admin',              notificacionesAdmin);
router.get('/admin/no-leidas',    noLeidasAdmin);
router.patch('/admin/leer-todas', marcarAdminTodasLeidas);
router.patch('/admin/leer/:id',   marcarAdminLeida);

// DELETE - Empleado
router.delete('/:id',             eliminarNotificacion);
router.delete('/todas',           eliminarTodasNotificaciones);

// DELETE - Admin
router.delete('/admin/:id',       eliminarAdminNotificacion);
router.delete('/admin/todas',     eliminarAdminTodasNotificaciones);

module.exports = router;