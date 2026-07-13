// src/index.js
// Punto de entrada del servidor Express — SICAD Backend

// Carga y valida variables de entorno PRIMERO (falla rápido si faltan)
const env = require('./config/env');

const express = require('express');
const cors = require('cors');

// ── Rutas ────────────────────────────────────────────────────
const qrRoutes          = require('./routes/qr.routes');
const userRoutes        = require('./routes/user.routes');
const configRoutes      = require('./routes/config.routes');
const permisoRoutes     = require('./routes/permiso.routes');
const asistenciaRoutes  = require('./routes/asistencia.routes');
const authRoutes        = require('./routes/auth.routes');
const horarioRoutes     = require('./routes/horario.routes');

const app = express();

// ── Middlewares globales ─────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    mensaje: '¡El backend SICAD está funcionando!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth:           '/api/auth',
      qr:             '/api/qr',
      usuarios:       '/api/usuarios',
      horarios:       '/api/horarios',
      configuracion:  '/api/configuracion',
      permisos:       '/api/permisos',
      asistencia:     '/api/asistencia',
      asistencias:    '/api/asistencias',
    },
  });
});

// ── Rutas de la API ──────────────────────────────────────────
// Autenticación
app.use('/api/auth',          authRoutes);
// QR
app.use('/api/qr',            qrRoutes);
// Usuarios & Empleados
app.use('/api/usuarios',      userRoutes);
// Horarios asignados
app.use('/api/horarios',      horarioRoutes);
// Configuración del sistema (singleton)
app.use('/api/configuracion', configRoutes);
// Permisos y permisos parciales
app.use('/api/permisos',      permisoRoutes);
// Asistencia (núcleo de escaneo QR) — montada en ambos paths (con y sin 's')
app.use('/api/asistencia',    asistenciaRoutes);
app.use('/api/asistencias',   asistenciaRoutes);

// ── Manejador global de errores 404 ─────────────────────────
app.use((req, res) => {
  res.status(404).json({ ok: false, message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// ── Arranque del servidor ────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`[SICAD] Servidor corriendo en http://localhost:${env.PORT}`);
  console.log(`[SICAD] Entorno: ${env.NODE_ENV}`);
});
