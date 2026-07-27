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

// DELETE - Empleado (estática /todas antes que /:id para evitar colisión)
router.delete('/todas',           eliminarTodasNotificaciones);
router.delete('/:id',             eliminarNotificacion);

// DELETE - Admin (estática /todas antes que /:id para evitar colisión)
router.delete('/admin/todas',     eliminarAdminTodasNotificaciones);
router.delete('/admin/:id',       eliminarAdminNotificacion);

// Push Subscription
const { guardarSuscripcion, eliminarSuscripcion, VAPID_PUBLIC_KEY } = require('../services/notification.service');

router.get('/vapid-public-key', (req, res) => {
  res.json({ ok: true, publicKey: VAPID_PUBLIC_KEY });
});

router.post('/suscripcion', async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ ok: false, message: 'Suscripción inválida' });
    }
    await guardarSuscripcion(req.usuario.id, subscription, userAgent);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.delete('/suscripcion', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ ok: false, message: 'endpoint requerido' });
    await eliminarSuscripcion(req.usuario.id, endpoint);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

module.exports = router;