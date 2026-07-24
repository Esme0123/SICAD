const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { getAll, create, download, restore } = require('../controllers/respaldos.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

const upload = multer({
  dest: path.resolve(__dirname, '../../uploads/respaldos'),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.sql', '.dump', '.backup', '.json'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .sql, .dump, .backup o .json'));
    }
  },
});

router.get('/', authMiddleware, getAll);
router.post('/', authMiddleware, create);
router.get('/download/:id', authMiddleware, download);
router.post('/restore', authMiddleware, upload.single('backup'), restore);

module.exports = router;
