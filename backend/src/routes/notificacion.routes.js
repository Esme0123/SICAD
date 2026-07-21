// src/routes/notificacion.routes.js

const { Router } = require('express');
const { misNotificaciones, noLeidas, marcarLeida, marcarTodasLeidas } = require('../controllers/notificacion.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/mis-notificaciones', misNotificaciones);
router.get('/no-leidas',          noLeidas);
router.patch('/leer-todas',       marcarTodasLeidas);
router.patch('/:id/leer',         marcarLeida);

module.exports = router;