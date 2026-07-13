// src/config/db.js
// Singleton de PrismaClient con driver adapter pg — requerido en Prisma 7.
// El engine type "client" ya no usa el motor binario; necesita un adapter explícito.

require('dotenv').config();
const { Pool } = require('pg');
const { PrismaClient } = require('../../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');

const globalForPrisma = globalThis;

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;

