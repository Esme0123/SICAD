const { Router } = require('express');
const { getAll, create } = require('../controllers/respaldos.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', authMiddleware, getAll);
router.post('/', authMiddleware, create);

module.exports = router;
