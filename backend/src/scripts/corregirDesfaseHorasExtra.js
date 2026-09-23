// src/scripts/corregirDesfaseHorasExtra.js
// ─────────────────────────────────────────────────────────────
// CORRECCIÓN DE DESFASE DE -1 DÍA EN FECHAS (ZONA UTC-4 / America/La_Paz)
//
// Contexto del bug corregido:
//   Columnas DATE (@db.Date) se guardan/leen como "medianoche UTC". Con la ZONA
//   del servidor en UTC-4 (America/La_Paz), ciertos flujos anteriores escribían
//   o leían la fecha con componentes LOCALES, desplazando el día calendario al
//   DÍA ANTERIOR. Ejemplo: una solicitud de horas extras para el 2026-09-12
//   terminaba con fecha 2026-09-11 y su HorarioAsignado excepcional (que habilita
//   la marcación) se creaba también el 11, dejando el 12 sin horario → el empleado
//   figuraba como "AUSENTE" en el historial.
//
// Qué audita este script (SELECT previo, por defecto = SOLO REPORTE):
//   1) solicitudes_horas_extras cuya `fecha` es ANTERIOR a la fecha Bolivia del
//      `createdAt` (la App Móvil no permite solicitar para días pasados).
//   2) solicitudes_reemplazo con el mismo criterio.
//   3) asistencias cuya `fecha` es el día ANTERIOR al día Bolivia de la
//      `hora_entrada` real del registro.
//   4) horarios_asignados excepcionales (fechaEspecifica NOT NULL) que no tienen
//      ninguna solicitud aprobada/aceptada que los cubra en su fecha pero sí la
//      tienen al DÍA SIGUIENTE (se crearon desfasados -1).
//
// Qué corrige con --apply:
//   fecha = fecha + INTERVAL '1 day' en los registros 1-4 detectados, y recalcula
//   `horas_programadas` de los empleados cuyo horario excepcional cambió (el
//   historial/estado de asistencia es dinámico: se recalcula solo al consultar).
//
// Uso:
//   node src/scripts/corregirDesfaseHorasExtra.js                     (SOLO auditoría)
//   node src/scripts/corregirDesfaseHorasExtra.js --apply              (aplica los cambios)
//   node src/scripts/corregirDesfaseHorasExtra.js --desde=2026-08-01 --hasta=2026-09-30 --apply
//
// Equivalente SQL de auditoría (PostgreSQL):
//   -- 1) solicitudes de horas extras desfasadas
//   SELECT s.id, s.empleado_id, s.fecha, s.created_at, s.estado
//   FROM solicitudes_horas_extras s
//   WHERE s.fecha < (s.created_at AT TIME ZONE 'America/La_Paz')::date;
//   -- 2) reemplazos desfasados
//   SELECT r.id, r.solicitante_id, r.fecha, r.created_at, r.estado
//   FROM solicitudes_reemplazo r
//   WHERE r.fecha < (r.created_at AT TIME ZONE 'America/La_Paz')::date;
//   -- 3) marcaciones desfasadas
//   SELECT a.id, a.usuario_id, a.fecha, a.hora_entrada
//   FROM asistencias a
//   WHERE a.fecha = ((a.hora_entrada AT TIME ZONE 'America/La_Paz')::date - 1);
//   -- 4) horarios excepcionales huérfanos (ubicados el día anterior a su solicitud)
//   SELECT h.id, h.usuario_id, h.periodo_id, h.fecha_especifica
//   FROM horarios_asignados h
//   WHERE h.fecha_especifica IS NOT NULL
//   AND NOT EXISTS (SELECT 1 FROM solicitudes_horas_extras s
//                   WHERE s.estado='APROBADO' AND s.empleado_id = h.usuario_id
//                   AND s.fecha = h.fecha_especifica)
//   AND EXISTS (SELECT 1 FROM solicitudes_horas_extras s
//               WHERE s.estado='APROBADO' AND s.empleado_id = h.usuario_id
//               AND s.fecha = h.fecha_especifica + 1);
// ─────────────────────────────────────────────────────────────

process.env.TZ = 'UTC';

const prisma = require('../config/db');
const { parseFechaPura, fechaPuraStr, sumarDias } = require('../utils/fechaPura.utils');

/** Fecha calendario (YYYY-MM-DD) en America/La_Paz de un timestamp. */
function boliviaDateStr(date) {
  const bd = new Date(new Date(date).toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
  return `${bd.getFullYear()}-${String(bd.getMonth() + 1).padStart(2, '0')}-${String(bd.getDate()).padStart(2, '0')}`;
}

function sumarDiaDate(fechaStr) {
  return parseFechaPura(sumarDias(fechaStr, 1));
}

async function main() {
  const apply = process.argv.includes('--apply');
  const desdeArg = process.argv.find((a) => a.startsWith('--desde='));
  const hastaArg = process.argv.find((a) => a.startsWith('--hasta='));
  const desde = desdeArg ? desdeArg.split('=')[1] : null;
  const hasta = hastaArg ? hastaArg.split('=')[1] : null;

  console.log(apply ? 'MODO: APLICAR cambios (--apply)' : 'MODO: SIMULACIÓN (solo auditoría — usa --apply para aplicar)');
  console.log(`Rango filtro (opcional): ${desde || 'inicio'} → ${hasta || 'fin'}`);
  console.log('──────────────────────────────────────────────────────────');

  const rango = {};
  if (desde && /^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    const d = parseFechaPura(desde);
    if (d) rango.gte = d;
  }
  if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    const hfin = parseFechaPura(hasta);
    if (hfin) rango.lte = new Date(hfin.getTime() + 86399999);
  }

  // ── Carga de datos ──
  const solicitudes = await prisma.solicitudHorasExtras.findMany({
    where: Object.keys(rango).length ? { fecha: rango } : undefined,
    select: { id: true, empleadoId: true, fecha: true, createdAt: true, estado: true },
  });
  const reemplazos = await prisma.solicitudReemplazo.findMany({
    where: Object.keys(rango).length ? { fecha: rango } : undefined,
    select: { id: true, solicitanteId: true, reemplazanteId: true, fecha: true, createdAt: true, estado: true },
  });
  const asistencias = await prisma.asistencia.findMany({
    where: Object.keys(rango).length ? { fecha: rango } : undefined,
    select: { id: true, usuarioId: true, fecha: true, horaEntrada: true, horaSalida: true },
  });
  const horariosExcepc = await prisma.horarioAsignado.findMany({
    where: { fechaEspecifica: { not: null } },
    select: { id: true, usuarioId: true, periodoId: true, fechaEspecifica: true, diaSemana: true, periodoAcademico: true },
  });
  // Solicitudes APROBADO + Reemplazos ACEPTADO: cobertura (usuario, bloque) por fecha
  const aprobadas = await prisma.solicitudHorasExtras.findMany({
    where: { estado: 'APROBADO' },
    select: { empleadoId: true, fecha: true, bloques: true },
  });
  const aceptados = await prisma.solicitudReemplazo.findMany({
    where: { estado: 'ACEPTADO' },
    select: { reemplazanteId: true, fecha: true, bloques: true },
  });

  // ── 1) Solicitudes de horas extras desfasadas ──
  const solDesfasadas = [];
  for (const s of solicitudes) {
    const fStr = fechaPuraStr(s.fecha);
    if (!fStr) continue;
    const creadoStr = boliviaDateStr(s.createdAt);
    if (fStr < creadoStr) {
      solDesfasadas.push({ ...s, fechaStr: fStr, creadoStr, nuevaStr: sumarDias(fStr, 1) });
    }
  }

  // ── 2) Reemplazos desfasados ──
  const reempDesfasadas = [];
  for (const r of reemplazos) {
    const fStr = fechaPuraStr(r.fecha);
    if (!fStr) continue;
    const creadoStr = boliviaDateStr(r.createdAt);
    if (fStr < creadoStr) {
      reempDesfasadas.push({ ...r, fechaStr: fStr, creadoStr, nuevaStr: sumarDias(fStr, 1) });
    }
  }

  // ── 3) Marcaciones desfasadas (fecha != día Bolivia de la entrada) ──
  const marcacionesDesfasadas = [];
  for (const a of asistencias) {
    const fStr = fechaPuraStr(a.fecha);
    if (!fStr || !a.horaEntrada) continue;
    const diaRealStr = boliviaDateStr(a.horaEntrada);
    if (sumarDias(diaRealStr, -1) === fStr) {
      marcacionesDesfasadas.push({ ...a, fechaStr: fStr, diaRealStr, nuevaStr: diaRealStr });
    }
  }

  // ── 4) Horarios excepcionales desfasados ──
  // Mapa de cobertura: `${usuarioId}|${periodoId}` → Set de fechas cubiertas
  // (fechas ya corregidas en memoria para las solicitudes/reemplazos desfasados).
  const cobertura = new Map();
  const addCobertura = (usuarioId, bloques, fechaStr) => {
    for (const b of Array.isArray(bloques) ? bloques : []) {
      if (!b || b.id == null) continue;
      const key = `${usuarioId}|${Number(b.id)}`;
      if (!cobertura.has(key)) cobertura.set(key, new Set());
      cobertura.get(key).add(fechaStr);
    }
  };
  const corregidasSol = new Map(solDesfasadas.map((s) => [s.id, s.nuevaStr]));
  const corregidasReemp = new Map(reempDesfasadas.map((r) => [r.id, r.nuevaStr]));
  for (const s of aprobadas) {
    addCobertura(s.empleadoId, s.bloques, corregidasSol.get(s.id) || fechaPuraStr(s.fecha));
  }
  for (const r of aceptados) {
    addCobertura(r.reemplazanteId, r.bloques, corregidasReemp.get(r.id) || fechaPuraStr(r.fecha));
  }

  const horariosDesfasados = [];
  for (const h of horariosExcepc) {
    const fStr = fechaPuraStr(h.fechaEspecifica);
    if (!fStr) continue;
    const fNext = sumarDias(fStr, 1);
    if (!fNext) continue;
    const key = `${h.usuarioId}|${h.periodoId}`;
    const cubre = cobertura.get(key);
    const estaCubierta = (fecha) => cubre ? cubre.has(fecha) : false;
    if (!estaCubierta(fStr) && estaCubierta(fNext)) {
      horariosDesfasados.push({ ...h, fechaStr: fStr, nuevaStr: fNext });
    }
  }

  // ── Reporte de auditoría ──
  console.log(`[1] Solicitudes Horas Extras desfasadas: ${solDesfasadas.length}`);
  for (const s of solDesfasadas) {
    console.log(`    #${s.id} | empleadoId=${s.empleadoId} | estado=${s.estado} | fecha=${s.fechaStr} → ${s.nuevaStr} (creada el ${s.creadoStr})`);
  }
  console.log(`[2] Reemplazos desfasados: ${reempDesfasadas.length}`);
  for (const r of reempDesfasadas) {
    console.log(`    #${r.id} | solicitanteId=${r.solicitanteId} | reemplazanteId=${r.reemplazanteId ?? '—'} | estado=${r.estado} | fecha=${r.fechaStr} → ${r.nuevaStr} (creada el ${r.creadoStr})`);
  }
  console.log(`[3] Marcaciones desfasadas: ${marcacionesDesfasadas.length}`);
  for (const a of marcacionesDesfasadas) {
    console.log(`    #${a.id} | usuarioId=${a.usuarioId} | fecha=${a.fechaStr} → ${a.nuevaStr} (real: ${a.diaRealStr})`);
  }
  console.log(`[4] Horarios excepcionales desfasados: ${horariosDesfasados.length}`);
  for (const h of horariosDesfasados) {
    console.log(`    #${h.id} | usuarioId=${h.usuarioId} | periodoId=${h.periodoId} | fechaEspecifica=${h.fechaStr} → ${h.nuevaStr}`);
  }
  console.log('──────────────────────────────────────────────────────────');

  if (!apply) {
    console.log('Simulación terminada. Ejecuta con --apply para aplicar las correcciones.');
    await prisma.$disconnect();
    return;
  }

  // ── Aplicar: fecha = fecha + 1 día ──
  let a = 0, rE = 0, m = 0, hE = 0;

  for (const s of solDesfasadas) {
    await prisma.solicitudHorasExtras.update({ where: { id: s.id }, data: { fecha: sumarDiaDate(s.nuevaStr) } });
    a++;
  }
  for (const r of reempDesfasadas) {
    await prisma.solicitudReemplazo.update({ where: { id: r.id }, data: { fecha: sumarDiaDate(r.nuevaStr) } });
    rE++;
  }
  for (const ma of marcacionesDesfasadas) {
    await prisma.asistencia.update({ where: { id: ma.id }, data: { fecha: sumarDiaDate(ma.nuevaStr) } });
    m++;
  }
  for (const h of horariosDesfasados) {
    await prisma.horarioAsignado.update({ where: { id: h.id }, data: { fechaEspecifica: sumarDiaDate(h.nuevaStr) } });
    hE++;
  }

  // Recalcular horasProgramadas de los empleados cuyo horario excepcional cambió
  const usuariosAfectados = [...new Set(horariosDesfasados.map((h) => h.usuarioId))];
  for (const uid of usuariosAfectados) {
    const todos = await prisma.horarioAsignado.findMany({
      where: { usuarioId: uid },
      include: { periodo: { select: { duracion: true } } },
    });
    const totalMin = todos.reduce((acc, h) => acc + (h.periodo?.duracion ?? 0), 0);
    await prisma.usuario.update({
      where: { id: uid },
      data: { horasProgramadas: parseFloat((totalMin / 60).toFixed(2)) },
    });
  }

  console.log(`Aplicadas: ${a} solicitud(es), ${rE} reemplazo(s), ${m} marcación(es), ${hE} horario(s) excepcional(es).`);
  if (usuariosAfectados.length > 0) {
    console.log(`horasProgramadas recalculadas para ${usuariosAfectados.length} empleado(s).`);
  }
  console.log('El historial de asistencia y el control de horas se recalculan dinámicamente al consultar.');

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