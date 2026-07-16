const { Router } = require('express');
const { getAll } = require('../controllers/auditoria.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', authMiddleware, getAll);

module.exports = router;
