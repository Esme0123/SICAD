// src/routes/config.routes.js

const { Router } = require('express');
const { getConfig, updateConfig } = require('../controllers/config.controller');

const router = Router();

router.get('/',   getConfig);
router.patch('/', updateConfig);

module.exports = router;
