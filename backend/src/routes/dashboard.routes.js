const { Router } = require('express');
const { getResumen } = require('../controllers/dashboard.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/resumen', getResumen);

module.exports = router;
