// src/routes/permiso.routes.js

const { Router } = require('express');
const { getAll, getById, create, cambiarEstado } = require('../controllers/permiso.controller');
const prisma = require('../config/db');

const router = Router();

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
router.get('/:id',              getById);
router.post('/',                create);
router.patch('/:id/estado',     cambiarEstado);

module.exports = router;
