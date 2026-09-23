// src/scripts/reevaluarAsistenciasConPermiso.js
// ─────────────────────────────────────────────────────────────
// RECÁLCULO DE ASISTENCIAS CON PERMISO APROBADO (falsa "Tardanza")
//
// Contexto del bug corregido:
//   Cuando un empleado tiene un PERMISO APROBADO en un día (p. ej. cubre el
//   inicio del turno o varios bloques contiguos) y marca su entrada/reingreso
//   después de terminar el permiso, el motor anterior evaluaba la entrada contra
//   el INICIO ORIGINAL del turno (T_inicio) sin ajustar la hora esperada con el
//   fin del permiso → los registros figuraban como "Tardanza" aunque el permiso
//   lo justificaba. El estado de asistencia es DINÁMICO (se recalcula al
//   consultar), así que la corrección principal vive en el motor (controlador).
//
// Qué audita este script (SELECT previo, por defecto = SOLO REPORTE):
//   Para cada marcación con entrada, recalcula con el motor CORREGIDO la hora
//   esperada (encadenando bloques cubiertos por permiso APROBADO / reemplazo
//   ACEPTADO) y detecta los registros que deberían quedar como
//   "CON PERMISO" / "Puntual" pero que conservan una nota DUABLE de tardanza en
//   `observacion` ("Llegó X min tarde (tolerancia: Y min)") o que bajo la lógica
//   anterior se habrían clasificado como Tardanza.
//
// Qué corrige con --apply:
//   Limpia `observacion` (→ NULL) de esos registros, de modo que el histórico
//   (Web/App), el cumplimiento semanal, los reportes y las ediciones del admin
//   muestren exclusivamente el estado recalculado "Permiso aprobado"; el estado
//   en sí se recalcula dinámicamente al consultar y ya no muestra "Tardanza".
//   No borra ningún otro dato; la salida/entrada y el periodo se conservan.
//
// Nota: los días "Ausente" del histórico no tienen fila en `asistencias`, por lo
// que no requieren actualización: con el motor corregido y un permiso aprobado
// ese mismo día/rango el histórico ya los muestra como "Justificado".
//
// Uso:
//   node src/scripts/reevaluarAsistenciasConPermiso.js               (SOLO auditoría)
//   node src/scripts/reevaluarAsistenciasConPermiso.js --apply        (aplica los cambios)
//   node src/scripts/reevaluarAsistenciasConPermiso.js --desde=2026-01-01 --hasta=2026-12-31 --apply
// ─────────────────────────────────────────────────────────────

process.env.TZ = 'UTC';

const prisma = require('../config/db');
const { fechaPuraStr } = require('../utils/fechaPura.utils');

function timeToMinutes(timeStr) {
  const [h, m] = String(timeStr).split(':').map(Number);
  return h * 60 + m;
}

function extraerHoraInicio(periodoStr) {
  if (!periodoStr) return null;
  return periodoStr.split('–')[0] || null;
}

function toBoliviaTimeStr(date) {
  const bd = new Date(new Date(date).toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
  return `${String(bd.getHours()).padStart(2, '0')}:${String(bd.getMinutes()).padStart(2, '0')}`;
}

function fmtHora(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/**
 * Réplica exacta del motor corregido (asistencia.controller.js):
 * la esperada se desplaza al final del tramo de bloques cubiertos que comienza
 * en el inicio del turno, encadenando bloques contiguos.
 * @returns {{ esperadaMin: number|null, porPermiso: boolean }}
 */
function obtenerEntradaEsperadaAjustada(permisos, reemplazos, horaInicioTurno) {
  const inicioTurnoMin = timeToMinutes(horaInicioTurno);
  const cubiertos = [];

  if (Array.isArray(permisos)) {
    for (const p of permisos) {
      for (const pp of Array.isArray(p && p.periodos) ? p.periodos : []) {
        const periodo = (pp && pp.periodo) || pp;
        if (periodo && periodo.horaInicio && periodo.horaFin) {
          cubiertos.push({
            inicio: timeToMinutes(periodo.horaInicio),
            fin: timeToMinutes(periodo.horaFin),
            porPermiso: true,
          });
        }
      }
    }
  }

  if (Array.isArray(reemplazos)) {
    for (const r of reemplazos) {
      for (const b of Array.isArray(r && r.bloques) ? r.bloques : []) {
        if (b && b.horaInicio && b.horaFin) {
          cubiertos.push({
            inicio: timeToMinutes(b.horaInicio),
            fin: timeToMinutes(b.horaFin),
            porPermiso: false,
          });
        }
      }
    }
  }

  let cursor = inicioTurnoMin;
  let porPermiso = false;

  while (true) {
    let avanzado = false;
    for (const c of cubiertos) {
      if (c.inicio <= cursor && c.fin > cursor) {
        cursor = Math.max(cursor, c.fin);
        porPermiso = porPermiso || c.porPermiso;
        avanzado = true;
      }
    }
    if (!avanzado) break;
  }

  return cursor > inicioTurnoMin
    ? { esperadaMin: cursor, porPermiso }
    : { esperadaMin: null, porPermiso: false };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const desdeArg = process.argv.find((a) => a.startsWith('--desde='));
  const hastaArg = process.argv.find((a) => a.startsWith('--hasta='));
  const desde = desdeArg ? desdeArg.split('=')[1] : null;
  const hasta = hastaArg ? hastaArg.split('=')[1] : null;

  console.log(apply ? 'MODO: APLICAR cambios (--apply)' : 'MODO: SIMULACIÓN (solo auditoría — usa --apply para aplicar)');
  console.log(`Rango filtro (opcional): ${desde || 'inicio'} → ${hasta || 'fin'}`);
  console.log('══════════════════════════════════════════════════');

  const rango = {};
  if (desde && /^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    rango.gte = new Date(`${desde}T00:00:00.000Z`);
  }
  if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    rango.lte = new Date(`${hasta}T23:59:59.999Z`);
  }

  // ── Carga de datos ──
  const asistencias = await prisma.asistencia.findMany({
    where: Object.keys(rango).length ? { fecha: rango } : undefined,
    select: { id: true, usuarioId: true, fecha: true, horaEntrada: true, periodo: true, observacion: true, minutosTolerancia: true },
  });
  const permisos = await prisma.permiso.findMany({
    where: { estado: 'APROBADO' },
    include: { periodos: { include: { periodo: { select: { horaInicio: true, horaFin: true } } } } },
  });
  const reemplazos = await prisma.solicitudReemplazo.findMany({
    where: { estado: 'ACEPTADO' },
    select: { solicitanteId: true, fecha: true, bloques: true },
  });
  const config = await prisma.configuracionSistema.findUnique({ where: { id: 1 } });
  const toleranciaGlobal = config?.tiempoTolerancia ?? 20;

  const permisosIdx = new Map();
  for (const p of permisos) {
    const fStr = fechaPuraStr(p.fecha);
    if (!fStr) continue;
    if (!permisosIdx.has(`${p.usuarioId}|${fStr}`)) permisosIdx.set(`${p.usuarioId}|${fStr}`, []);
    permisosIdx.get(`${p.usuarioId}|${fStr}`).push(p);
  }
  const reemplazosIdx = new Map();
  for (const r of reemplazos) {
    const fStr = fechaPuraStr(r.fecha);
    if (!fStr) continue;
    if (!reemplazosIdx.has(`${r.solicitanteId}|${fStr}`)) reemplazosIdx.set(`${r.solicitanteId}|${fStr}`, []);
    reemplazosIdx.get(`${r.solicitanteId}|${fStr}`).push(r);
  }

  const corregibles = [];
  let totalPodrianTardanza = 0;
  let auditadasConPermisoYEntrada = 0;

  for (const a of asistencias) {
    if (!a.horaEntrada) continue;
    const fStr = fechaPuraStr(a.fecha);
    const permisosFecha = permisosIdx.get(`${a.usuarioId}|${fStr}`) || [];
    const reemplazosFecha = reemplazosIdx.get(`${a.usuarioId}|${fStr}`) || [];
    if (permisosFecha.length === 0) continue;
    auditadasConPermisoYEntrada++;

    const tolerancia = a.minutosTolerancia ?? toleranciaGlobal;
    const horaEntradaStr = toBoliviaTimeStr(a.horaEntrada);
    const entradaMin = timeToMinutes(horaEntradaStr);
    const horaInicioStr = extraerHoraInicio(a.periodo);
    const inicioMin = horaInicioStr ? timeToMinutes(horaInicioStr) : null;

    const ajuste = horaInicioStr ? obtenerEntradaEsperadaAjustada(permisosFecha, reemplazosFecha, horaInicioStr) : null;
    const esperadaMin = ajuste ? ajuste.esperadaMin : null;

    if (ajuste && ajuste.porPermiso && esperadaMin !== null) {
      const retrasoNuevoMin = Math.max(0, entradaMin - esperadaMin);
      const nuevoEstado = retrasoNuevoMin > tolerancia ? 'TARDANZA' : 'CON PERMISO';
      if (nuevoEstado === 'TARDANZA') {
        totalPodrianTardanza++;
        continue;
      }

      // ¿El estado anterior (contra el inicio original del turno) era Tardanza
      // o quedó una nota durable "Llegó X min tarde"?
      const tieneNotaTardanza = /^Llegó\s+\d+\s+min/i.test(a.observacion || '');
      const viejoTardanza = inicioMin !== null && (entradaMin - inicioMin) > tolerancia;

      if (tieneNotaTardanza || viejoTardanza) {
        corregibles.push({
          id: a.id,
          usuarioId: a.usuarioId,
          fecha: fStr,
          horaEntradaStr,
          periodo: a.periodo || '—',
          estadoNuevo: nuevoEstado,
          esperada: fmtHora(esperadaMin),
          nota: a.observacion || '—',
        });
      }
    }
  }

  // ── Reporte de auditoría ──
  console.log(`Registros auditados con permiso aprobado y entrada: ${auditadasConPermisoYEntrada}`);
  console.log(`Registros que siguen siendo Tardanza incluso ajustando la esperada: ${totalPodrianTardanza}`);
  console.log(`Registros a corregir → "CON PERMISO" (limpian su nota de tardanza): ${corregibles.length}`);
  for (const c of corregibles) {
    console.log(`    #${c.id} | usuarioId=${c.usuarioId} | fecha=${c.fecha} | entrada=${c.horaEntradaStr} | expect=${c.esperada} | periodo=${c.periodo} | nota='${c.nota}'`);
  }
  console.log('══════════════════════════════════════════════════');

  if (!apply) {
    console.log('Simulación terminada. Ejecuta con --apply para limpiar las notas de tardanza.');
    await prisma.$disconnect();
    return;
  }

  let aplicadas = 0;
  for (const c of corregibles) {
    await prisma.asistencia.update({ where: { id: c.id }, data: { observacion: null } });
    aplicadas++;
  }

  console.log(`Aplicadas: ${aplicadas} observacion(es) limpiada(s).`);
  console.log('El estado de cada día se recalcula dinámicamente al consultar: los registros con permiso aprobado ya muestran "Con Permiso" en Web y App.');

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