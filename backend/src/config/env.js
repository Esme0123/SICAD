// src/config/env.js
// Centraliza y valida todas las variables de entorno requeridas.
// Falla rápido en inicio si falta alguna variable crítica.

require('dotenv').config();

const required = ['DATABASE_URL', 'QR_SECRET_KEY'];

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
};
