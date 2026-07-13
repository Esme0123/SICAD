// src/routes/qr.routes.js
// Rutas para el sistema de QR de asistencia.

const { Router } = require('express');
const { generateQR, verifyQR } = require('../controllers/qr.controller');

const router = Router();

// GET  /api/qr/generate  → Genera un token QR temporal firmado
router.get('/generate', generateQR);

// POST /api/qr/verify    → Verifica un token QR (usado por el escáner)
router.post('/verify', verifyQR);

module.exports = router;
