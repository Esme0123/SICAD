// src/scripts/limpiarMarcacionesCorruptas.js
// ─────────────────────────────────────────────────────────────
// LIMPIEZA DE MARCACIONES CORRUPTAS POR EL FALLO ENTRADA/SALIDA
//
// Contexto del fallo corregido:
//   Al marcar SALIDA de un turno finalizado o cercano, el sistema registraba
//   una NUEVA ENTRADA en el siguiente período en vez de cerrar la salida del
//   registro abierto. Resultado: un empleado tiene en el MISMO día varias
//   filas de "entrada" donde la primera quedó SIN horaSalida.
//
// Qué hace este script:
//   Para cada usuario + día donde exista un registro abierto (horaSalida NULL)
//   seguido de entradas posteriores "falsas" dentro de un rango razonable
//   (2 min a 16 h desde la primera entrada):
//     1. Mueve el timestamp de la ÚLTIMA entrada falsa como horaSalida del
//        registro abierto original.
//     2. Elimina las entradas falsas intermedias.
//     3. Añade una observación indicando la corrección.
//
// Seguridad:
//   - NO toca registros editados manualmente por un ADMIN (editadoPorAdminId).
//   - NO toca registros con salidaOmitida (turno cerrado por cronjob).
//   - Por defecto corre en MODO SIMULACIÓN (solo reporta). Usa --apply para
//     aplicar los cambios.
//
// Uso:
//   node src/scripts/limpiarMarcacionesCorruptas.js            (simulación)
//   node src/scripts/limpiarMarcacionesCorruptas.js --apply    (aplica)
// ─────────────────────────────────────────────────────────────

const prisma = require('../config/db');

const MIN_GAP_MIN = 2;          // mínimo de minutos entre la 1ª entrada y la falsa
const MAX_GAP_MIN = 16 * 60;    // máximo razonable dentro de una misma jornada
const OBS_CORRECCION = 'Corregido por script de limpieza: salida recuperada desde marcación duplicada';

function fechaKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-BO');
}

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(apply ? 'MODO: APLICAR cambios (--apply)' : 'MODO: SIMULACIÓN (usa --apply para aplicar)');
  console.log('──────────────────────────────────────────────────────────');

  // Candidatos: registros abiertos (sin salida), no editados por admin
  const abiertas = await prisma.asistencia.findMany({
    where: { horaSalida: null, editadoPorAdminId: null },
    select: {
      id: true,
      usuarioId: true,
      fecha: true,
      horaEntrada: true,
      horaSalida: true,
      salidaOmitida: true,
      observacion: true,
      usuario: { select: { nombre: true, codigo: true } },
    },
    orderBy: [{ usuarioId: 'asc' }, { fecha: 'asc' }, { horaEntrada: 'asc' }],
  });

  // Agrupar por usuarioId + fecha
  const grupos = new Map();
  for (const a of abiertas) {
    const key = `${a.usuarioId}_${fechaKey(a.fecha)}`;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(a);
  }

  const correcciones = [];

  for (const [key, registros] of grupos) {
    const ordenados = [...registros].sort((x, y) => x.horaEntrada - y.horaEntrada);

    for (let i = 0; i < ordenados.length; i++) {
      const abierta = ordenados[i];
      if (abierta.horaSalida !== null || abierta._consumida) continue;

      const falsas = [];
      for (let j = i + 1; j < ordenados.length; j++) {
        const candidata = ordenados[j];
        if (candidata._consumida) continue;

        const gapMin = (candidata.horaEntrada - abierta.horaEntrada) / 60000;
        if (gapMin < MIN_GAP_MIN) continue; // demasiado rápido: probable doble-tap real, no tocar
        if (gapMin > MAX_GAP_MIN) break;    // fuera de la jornada razonable

        // No eliminar registros intervenidos manualmente por un admin
        if (candidata.editadoPorAdminId) continue;

        candidata._consumida = true;
        falsas.push(candidata);
      }

      if (falsas.length === 0) continue;

      const ultimaFalsa = falsas[falsas.length - 1];
      correcciones.push({
        usuario: abierta.usuario,
        fecha: fechaKey(abierta.fecha),
        abierta,
        falsas,
        salidaUsada: ultimaFalsa.horaEntrada,
        totalMin: (ultimaFalsa.horaEntrada - abierta.horaEntrada) / 60000,
      });
    }
  }

  console.log(`Se detectaron ${correcciones.length} registro(s) corrupto(s).`);

  for (const c of correcciones) {
    console.log('──────────────────────────────────────────────────────────');
    console.log(`Empleado: ${c.usuario?.nombre} (${c.usuario?.codigo || 'sin código'}) — Fecha: ${c.fecha}`);
    console.log(`  Registro abierto  #${c.abierta.id}: entrada ${fmt(c.abierta.horaEntrada)}`);
    for (const f of c.falsas) {
      console.log(`    └ Entrada falsa  #${f.id}: ${fmt(f.horaEntrada)}${f.horaSalida ? ` (tenía salida ${fmt(f.horaSalida)}, será eliminada)` : ' (sin salida)'}`);
    }
    console.log(`  → horaSalida propuesta: ${fmt(c.salidaUsada)} (${Math.round(c.totalMin)} min trabajados)`);
  }

  if (correcciones.length === 0) {
    console.log('No hay registros que corregir. 🎉');
  }

  if (!apply) {
    console.log('──────────────────────────────────────────────────────────');
    console.log('Simulación terminada. Ejecuta con --apply para aplicar los cambios.');
    return;
  }

  // ── Aplicar en transacciones independientes ──
  let aplicadas = 0;
  for (const c of correcciones) {
    try {
      await prisma.$transaction(async (tx) => {
        const nuevaObs = [c.abierta.observacion, OBS_CORRECCION].filter(Boolean).join(' | ');
        await tx.asistencia.update({
          where: { id: c.abierta.id },
          data: { horaSalida: c.salidaUsada, observacion: nuevaObs },
        });
        for (const f of c.falsas) {
          await tx.asistencia.delete({ where: { id: f.id } });
        }
      });
      aplicadas++;
      console.log(`✓ Corregido #${c.abierta.id} (${c.fecha}): salida=${fmt(c.salidaUsada)}, ${c.falsas.length} entrada(s) falsa(s) eliminada(s).`);
    } catch (err) {
      console.error(`✗ Error corrigiendo #${c.abierta.id}:`, err.message);
    }
  }

  console.log('──────────────────────────────────────────────────────────');
  console.log(`Aplicadas ${aplicadas}/${correcciones.length} correcciones.`);

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