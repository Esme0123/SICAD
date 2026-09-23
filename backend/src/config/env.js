// src/config/env.js
// Centraliza y valida todas las variables de entorno requeridas.
// Falla rápido en inicio si falta alguna variable crítica.

// Zona horaria del servidor fijada a UTC: las columnas DATE de PostgreSQL
// (@db.Date) se leen/guardan como medianoche UTC. Fijar UTC hace determinística
// la serialización de fechas en cualquier entorno (dev o prod) y evita que los
// getters locales desplacen fechas al día anterior en servidores UTC-4.
process.env.TZ = 'UTC';

require('dotenv').config();

const required = ['DATABASE_URL', 'QR_SECRET_KEY', 'JWT_SECRET', 'SENDGRID_API_KEY'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`[ENV] Variable de entorno requerida no definida: ${key}`);
  }
}

module.exports = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL,

  // Clave secreta usada para firmar los tokens QR con HMAC SHA-256
  QR_SECRET_KEY: process.env.QR_SECRET_KEY,

  // Validez del token QR en segundos (lee de .env, default 30s)
  QR_VALIDITY_SECONDS: parseInt(process.env.QR_VALIDITY_SECONDS || '30', 10),

  NODE_ENV: process.env.NODE_ENV || 'development',

  // JWT Secret Key
  JWT_SECRET: process.env.JWT_SECRET,
};
