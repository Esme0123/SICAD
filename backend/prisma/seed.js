// prisma/seed.js
// Script de datos semilla para SICAD
// Ejecutar: npx prisma db seed

require('dotenv').config();
const { Pool } = require('pg');
const { PrismaClient } = require('../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

// Prisma v7 usa engine "client" que requiere driver adapter explícito
const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

// Calcula la duración en minutos entre dos strings "HH:mm"
function calcularDuracion(inicio, fin) {
  const [hI, mI] = inicio.split(':').map(Number);
  const [hF, mF] = fin.split(':').map(Number);
  return (hF * 60 + mF) - (hI * 60 + mI);
}

async function main() {
  console.log('🌱 Iniciando seed de SICAD...\n');

  // ── 1. Usuario Administrador ─────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.usuario.upsert({
    where:  { email: 'admin@sicad.com' },
    update: {},
    create: {
      nombre:    'Administrador',
      email:     'admin@sicad.com',
      password:  passwordHash,
      rol:       'ADMIN',
      horasBase: 40,
    },
  });
  console.log(`✅ Usuario admin creado/verificado: ${admin.email}`);

  // ── 2. Configuración por defecto (id = 1) ────────────────────
  const config = await prisma.configuracion.upsert({
    where:  { id: 1 },
    update: {},
    create: {
      id:                      1,
      nombreInstitucion:       'SICAD',
      formatoExportacion:      'xlsx',
      tiempoToleranciaMinutos: 10,
      duracionQrSegundos:      30,
      horaAperturaControl:     '06:00',
      horaCierreControl:       '22:00',
    },
  });
  console.log(`✅ Configuración por defecto creada/verificada (id: ${config.id})`);

  // ── 3. Catálogo de 6 Periodos ────────────────────────────────
  const periodosData = [
    { nombre: 'Bloque 1', horaInicio: '07:15', horaFin: '08:15' },
    { nombre: 'Bloque 2', horaInicio: '08:15', horaFin: '09:15' },
    { nombre: 'Bloque 3', horaInicio: '09:15', horaFin: '10:15' },
    { nombre: 'Bloque 4', horaInicio: '10:30', horaFin: '11:30' },
    { nombre: 'Bloque 5', horaInicio: '11:30', horaFin: '12:30' },
    { nombre: 'Bloque 6', horaInicio: '12:30', horaFin: '13:30' },
  ];

  for (const p of periodosData) {
    const duracion = calcularDuracion(p.horaInicio, p.horaFin);

    // Buscar por nombre para no duplicar
    const existing = await prisma.periodo.findFirst({ where: { nombre: p.nombre } });

    if (!existing) {
      await prisma.periodo.create({
        data: { ...p, duracion },
      });
      console.log(`✅ Periodo creado: ${p.nombre} (${p.horaInicio} - ${p.horaFin}, ${duracion} min)`);
    } else {
      console.log(`⏩ Periodo ya existe: ${p.nombre}`);
    }
  }

  console.log('\n🎉 Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
