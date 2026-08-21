// src/scripts/limpiarHorariosExpirados.js
// ─────────────────────────────────────────────────────────────
// LIMPIEZA DE ASIGNACIONES TEMPORALES (HORARIOS EXCEPCIONALES) EXPIRADOS
//
// Contexto:
//   Los horarios EXCEPCIONALES (con `fechaEspecifica` no nula) son creados
//   dinámicamente al aprobar horas extras o aceptar reemplazos para habilitar
//   la marcación en una fecha puntual. Una vez transcurrida su fecha, dejan de
//   tener utilidad y deben eliminarse para no ensuciar consultas ni el historial.
//
// Qué hace este script:
//   DELETE de horarios_asignados donde fechaEspecifica IS NOT NULL
//   Y fechaEspecifica < fecha de hoy.
//
// Seguridad:
//   - Nunca toca los horarios fijos recurrentes (fechaEspecifica IS NULL).
//   - Por defecto corre en MODO SIMULACIÓN (solo reporta). Usa --apply para
//     aplicar la eliminación.
//
// Uso:
//   node src/scripts/limpiarHorariosExpirados.js            (simulación)
//   node src/scripts/limpiarHorariosExpirados.js --apply    (aplica)
//
// Puede programarse como Cron Job a medianoche, p.ej.:
//   0 0 * * * cd /ruta/backend && node src/scripts/limpiarHorariosExpirados.js --apply
// ─────────────────────────────────────────────────────────────

const prisma = require('../config/db');

// Fecha de hoy en formato "YYYY-MM-DD" usando getters LOCALES para evitar el
// desplazamiento UTC que provocaría borrar por error el día actual.
function hoyLocal() {
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, '0');
  const d = String(ahora.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fmt(id, d) {
  if (!d) return '—';
  return `${id} (${d.toISOString ? d.toISOString().slice(0, 10) : String(d)})`;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const hoy = hoyLocal();
  console.log(apply ? 'MODO: APLICAR cambios (--apply)' : 'MODO: SIMULACIÓN (usa --apply para aplicar)');
  console.log(`Fecha de corte (hoy): ${hoy}`);
  console.log('──────────────────────────────────────────────────────────');

  const expirados = await prisma.horarioAsignado.findMany({
    where: {
      fechaEspecifica: { not: null, lt: new Date(`${hoy}T00:00:00`) },
    },
    select: {
      id: true,
      usuarioId: true,
      diaSemana: true,
      periodoAcademico: true,
      fechaEspecifica: true,
      usuario: { select: { nombre: true, codigo: true } },
    },
    orderBy: [{ usuarioId: 'asc' }, { fechaEspecifica: 'asc' }],
  });

  console.log(`Se detectaron ${expirados.length} asignacion(es) temporal(es) expirada(s).`);

  for (const h of expirados) {
    console.log(
      `  #${h.id} | ${h.usuario?.nombre || `usuario ${h.usuarioId}`} | dia=${h.diaSemana} | ` +
      `periodo=${h.periodoAcademico} | fecha=${fmt(h.id, h.fechaEspecifica)}`
    );
  }

  if (!apply) {
    console.log('──────────────────────────────────────────────────────────');
    console.log('Simulación terminada. Ejecuta con --apply para eliminar.');
    await prisma.$disconnect();
    return;
  }

  if (expirados.length > 0) {
    const res = await prisma.horarioAsignado.deleteMany({
      where: {
        fechaEspecifica: { not: null, lt: new Date(`${hoy}T00:00:00`) },
      },
    });
    console.log('──────────────────────────────────────────────────────────');
    console.log(`Eliminadas ${res.count} asignacion(es) temporal(es) expirada(s).`);
  } else {
    console.log('No hay asignaciones que eliminar.');
  }

  await prisma.$disconnect();
}

main()
  .catch((err) => {
    console.error('Error fatal:', err.message);
    if (err.message && err.message.includes('DATABASE_URL')) {
      console.error('Asegúrate de configurar backend/.env con DATABASE_URL antes de ejecutar.');
    }
    process.exit(1);
  });
