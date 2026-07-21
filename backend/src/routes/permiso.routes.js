// src/routes/permiso.routes.js

const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { getAll, getById, create, cambiarEstado, misPermisos } = require('../controllers/permiso.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const prisma = require('../config/db');

const router = Router();

// Multer config para subida de archivos adjuntos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/permisos'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `permiso-${uniqueSuffix}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

router.get('/',                 getAll);
router.get('/tipos',            async (req, res) => {
  try {
    const tipos = await prisma.tipoPermiso.findMany({ orderBy: { nombre: 'asc' } });
    res.json({ ok: true, data: tipos });
  } catch (error) {
    console.error('[tipoPermiso.getAll]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener tipos de permiso' });
  }
});
router.get('/mis-permisos',     authMiddleware, misPermisos);
router.get('/:id',              getById);
router.post('/',                authMiddleware, upload.single('archivo'), create);
router.patch('/:id/estado',     cambiarEstado);

module.exports = router;
