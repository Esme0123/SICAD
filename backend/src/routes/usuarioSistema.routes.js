const { Router } = require('express');
const { getAll, getById, create, update, changePassword, remove } = require('../controllers/usuarioSistema.controller');
const { authMiddleware, requireRol } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/',    authMiddleware, getAll);
router.get('/:id', authMiddleware, getById);
router.post('/',   authMiddleware, requireRol('ADMIN'), create);
router.patch('/:id',      authMiddleware, requireRol('ADMIN'), update);
router.patch('/:id/password', authMiddleware, requireRol('ADMIN'), changePassword);
router.delete('/:id',     authMiddleware, requireRol('ADMIN'), remove);

module.exports = router;
