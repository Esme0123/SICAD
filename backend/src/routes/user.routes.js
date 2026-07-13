// src/routes/user.routes.js

const { Router } = require('express');
const { getAll, getById, create, update, remove, getEmpleados } = require('../controllers/user.controller');

const router = Router();

// GET  /api/usuarios/empleados  — debe ir ANTES de /:id para evitar conflicto de rutas
router.get('/empleados', getEmpleados);

router.get('/',       getAll);
router.get('/:id',    getById);
router.post('/',      create);
router.patch('/:id',  update);
router.delete('/:id', remove);

module.exports = router;
