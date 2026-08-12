// src/index.js
// Punto de entrada del servidor Express — SICAD Backend

// Carga y valida variables de entorno PRIMERO (falla rápido si faltan)
const env = require('./config/env');

const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Server } = require('socket.io');

// ── Rutas ────────────────────────────────────────────────────
const qrRoutes = require('./routes/qr.routes');
const userRoutes = require('./routes/user.routes');
const configRoutes = require('./routes/config.routes');
const permisoRoutes = require('./routes/permiso.routes');
const asistenciaRoutes = require('./routes/asistencia.routes');
const authRoutes = require('./routes/auth.routes');
const horarioRoutes = require('./routes/horario.routes');
const periodoRoutes = require('./routes/periodo.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportesRoutes = require('./routes/reportes.routes');
const usuarioSistemaRoutes = require('./routes/usuarioSistema.routes');
const auditoriaRoutes = require('./routes/auditoria.routes');
const respaldosRoutes = require('./routes/respaldos.routes');
const notificacionRoutes = require('./routes/notificacion.routes');
const feriadoRoutes = require('./routes/feriado.routes');
const horasExtrasRoutes = require('./routes/horasExtras.routes');
const reemplazosRoutes = require('./routes/reemplazos.routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ── Middlewares globales ─────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// Adjuntar io a cada request para que los controladores emitan eventos
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Archivos estáticos (uploads)
const uploadsDir = path.join(__dirname, '../uploads/permisos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Health check ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    mensaje: '¡El backend SICAD está funcionando!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      qr: '/api/qr',
      usuarios: '/api/usuarios',
      horarios: '/api/horarios',
      configuracion: '/api/configuracion',
      permisos: '/api/permisos',
      asistencia: '/api/asistencia',
      asistencias: '/api/asistencias',
      dashboard: '/api/dashboard',
      reportes: '/api/reportes',
      horasExtras: '/api/horas-extras',
      reemplazos: '/api/reemplazos',
    },
  });
});

// ── Health check liviano para Render / uptime ──────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// ── Rutas de la API ──────────────────────────────────────────
// Autenticación
app.use('/api/auth', authRoutes);
// QR
app.use('/api/qr', qrRoutes);
// Usuarios & Empleados
app.use('/api/usuarios', userRoutes);
// Horarios asignados
app.use('/api/horarios', horarioRoutes);
// Periodos académicos (gestiones académicas)
app.use('/api/periodos', periodoRoutes);
// Configuración del sistema (singleton)
app.use('/api/configuracion', configRoutes);
// Permisos y permisos parciales
app.use('/api/permisos', permisoRoutes);
// Asistencia (núcleo de escaneo QR) — montada en ambos paths (con y sin 's')
app.use('/api/asistencia', asistenciaRoutes);
app.use('/api/asistencias', asistenciaRoutes);
// Dashboard — métricas
app.use('/api/dashboard', dashboardRoutes);
// Reportes — análisis y exportación
app.use('/api/reportes', reportesRoutes);
// Usuarios del sistema (Admin Dashboard)
app.use('/api/usuarios-sistema', usuarioSistemaRoutes);
// Notificaciones
app.use('/api/notificaciones', notificacionRoutes);
// Auditoría
app.use('/api/auditoria', auditoriaRoutes);
// Respaldos
app.use('/api/respaldos', respaldosRoutes);
// Feriados
app.use('/api/feriados', feriadoRoutes);
// Horas Extras / Recuperación de Horas
app.use('/api/horas-extras', horasExtrasRoutes);
// Reemplazos entre Empleados
app.use('/api/reemplazos', reemplazosRoutes);

// ── Manejador global de errores 404 ─────────────────────────
app.use((req, res) => {
  res.status(404).json({ ok: false, message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// ── Arranque del servidor ────────────────────────────────────
server.listen(env.PORT, '0.0.0.0', () => {
  console.log(`[SICAD] Servidor iniciado en puerto ${env.PORT}`);
  console.log(`[SICAD] Entorno: ${env.NODE_ENV}`);
});

