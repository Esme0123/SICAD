const { Router } = require('express');
const { getAnalisis } = require('../controllers/reportes.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/analisis', getAnalisis);

module.exports = router;
