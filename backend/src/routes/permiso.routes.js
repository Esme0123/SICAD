// src/routes/permiso.routes.js

const { Router } = require('express');
const { getAll, getById, create, cambiarEstado } = require('../controllers/permiso.controller');

const router = Router();

router.get('/',                 getAll);
router.get('/:id',              getById);
router.post('/',                create);
router.patch('/:id/estado',     cambiarEstado);

module.exports = router;
