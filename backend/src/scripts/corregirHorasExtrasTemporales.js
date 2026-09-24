// src/scripts/corregirHorasExtrasTemporales.js
// ─────────────────────────────────────────────────────────────
// CORRECCIÓN DE HORAS EXTRAS "TEMPORALES" MAL PROYECTADAS
//
// Contexto del bug corregido:
//   Las horas extras (y reemplazos) deben ser ESTRICTAMENTE TEMPORALES: su
//   HorarioAsignado solo aplica para su `fechaEspecifica`. En datos históricos
//   se detectaron dos anomalías:
//
//   1) Registros EXCEPCIONALES (fechaEspecifica NOT NULL) cuyo `diaSemana` no
//      coincide con el día real de su `fechaEspecifica` (p. ej. una hora extra
//      del Sábado 2026-09-12 guardada como "Viernes"). Algunas consultas
//      antiguas usaban `diaSemana` para traer excepcionales y los proyectaban a
//      todos los días de esa semana → falsas "Ausencias" los Viernes 11 y 18
//      de septiembre.
//
//   2) Turnos TEMPORALES que quedaron guardados SIN fecha específica
//      (fechaEspecifica IS NULL), creados en el mismo instante en que se aprobó
//      una hora extra/reemplazo. Al no tener fecha, se comportan como plantilla
//      recurrente y exigen el bloque (p. ej. "13:15–16:15") TODOS los días de
//      esa semana del calendario.
//
// Qué hace este script (por defecto SOLO AUDITA; usa --apply para aplicar):
//   A) Normaliza `diaSemana` de todo HorarioAsignado excepcional para que
//      coincida exactamente con el día de la semana de su `fechaEspecifica`
//      (calculado con getUTCDay vía diaSemanaDeFechaStr).
//   B) Elimina:
//      b1) Horarios excepcionales HUÉRFANOS: sin ninguna solicitud de horas
//          extras APROBADA ni reemplazo ACEPTADO que cubra (usuario, bloque,
//          fecha).
//      b2) Turnos recurrentes (fechaEspecifica IS NULL) creados en el mismo
//          instante que la aprobación de una hora extra/reemplazo para el mismo
//          (usuario, bloque) → proyecciones temporales accidentales.
//   C) Re-evalúa y recalcula las marcaciones REALES de los empleados afectados
//      en las fechas involucradas (especialmente Viernes 11/09 y 18/09):
//      recalcula `periodo` y `observacion` con el horario corregido, de modo
//      que dejen de exigir el bloque temporal y vuelvan a "Puntual" o a la
//      tardanza que corresponda según sus marcaciones reales. Las ausencias
//      falsas del histórico son VIRTUALES (no hay fila en `asistencias`), por
//      lo que desaparecen solas al eliminar el turno proyectado.
//   D) Corrige el DESFASE DE FECHA de horarios excepcionales de horas extras /
//      reemplazos APROBADOS: la `fechaEspecifica` debe ser EXACTAMENTE igual a
//      la `fecha` de su solicitud. P. ej. la Hora Extra solicitada para el
//      Miércoles 02/09/2026 que quedó guardada como Jueves 03/09/2026 (desfase
//      +1 día) abría un bloque en el día equivocado y provocaba una falsa
//      "Ausencia" el Jueves. Se vincula por (usuarioId, periodoId) y se relocaliza
//      `fechaEspecifica = solicitud.fecha`, recalculando también `diaSemana` y
//      `periodoAcademico`. Los días afectados entran en la re-evaluación [C].
//      Antes de reportar como HUÉRFANO ([B1]) a un excepcional, se verifica que
//      no sea un desfase corregible por [D].
//
// Uso:
//   node src/scripts/corregirHorasExtrasTemporales.js                 (auditoría)
//   node src/scripts/corregirHorasExtrasTemporales.js --apply          (aplica)
//   node src/scripts/corregirHorasExtrasTemporales.js --desde=2026-09-01 --hasta=2026-09-30 --apply
//
// npm:
//   npm run corregir:he-temporales
//   npm run corregir:he-temporales:apply
// ─────────────────────────────────────────────────────────────

process.env.TZ = 'UTC';

const prisma = require('../config/db');
const { parseFechaPura, fechaPuraStr, diaSemanaDeFechaStr, sumarDias } = require('../utils/fechaPura.utils');

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

// Ventana de tolerancia para considerar que un turno recurrente fue creado por
// la misma operación de aprobación (misma transacción) que la solicitud.
const VENTANA_APROBACION_MS = 5 * 60 * 1000;

// ── Helpers de tiempo (misma convención que asistencia.controller.js) ──

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

function toBoliviaMinutes(date) {
  const bd = new Date(new Date(date).toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
  return bd.getHours() * 60 + bd.getMinutes();
}

function obtenerPeriodoDeFechaStr(isoStr) {
  const [y, m] = isoStr.split('-').map(Number);
  if (m === 1) return `Verano ${y}`;
  if (m >= 2 && m <= 6) return `1-${y}`;
  if (m === 7) return `Invierno ${y}`;
  return `2-${y}`;
}

function idsDeBloques(bloques) {
  return (Array.isArray(bloques) ? bloques : [])
    .map((b) => Number(b && b.id))
    .filter((n) => !Number.isNaN(n));
}

/** Agrupa horarios contiguos {horaInicio, horaFin} en bloques maestros. */
function agruparHorariosContiguos(horarios) {
  if (!horarios || horarios.length === 0) return [];
  const sorted = [...horarios].sort(
    (a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio)
  );
  const bloques = [];
  let bloque = { horarios: [sorted[0]], horaInicio: sorted[0].horaInicio, horaFin: sorted[0].horaFin };
  for (let i = 1; i < sorted.length; i++) {
    const anterior = sorted[i - 1];
    const actual = sorted[i];
    if (anterior.horaFin === actual.horaInicio) {
      bloque.horarios.push(actual);
      bloque.horaFin = actual.horaFin;
    } else {
      bloques.push(bloque);
      bloque = { horarios: [actual], horaInicio: actual.horaInicio, horaFin: actual.horaFin };
    }
  }
  bloques.push(bloque);
  return bloques;
}

/**
 * Réplica del motor corregido (asistencia.controller.js): desplaza la hora
 * esperada al final del tramo de bloques cubiertos por permiso/reemplazo.
 */
function obtenerEntradaEsperadaAjustada(permisos, reemplazos, horaInicioTurno) {
  const inicioTurnoMin = timeToMinutes(horaInicioTurno);
  const cubiertos = [];

  for (const p of Array.isArray(permisos) ? permisos : []) {
    for (const pp of Array.isArray(p && p.periodos) ? p.periodos : []) {
      const periodo = (pp && pp.periodo) || pp;
      if (periodo && periodo.horaInicio && periodo.horaFin) {
        cubiertos.push({ inicio: timeToMinutes(periodo.horaInicio), fin: timeToMinutes(periodo.horaFin), porPermiso: true });
      }
    }
  }
  for (const r of Array.isArray(reemplazos) ? reemplazos : []) {
    for (const b of Array.isArray(r && r.bloques) ? r.bloques : []) {
      if (b && b.horaInicio && b.horaFin) {
        cubiertos.push({ inicio: timeToMinutes(b.horaInicio), fin: timeToMinutes(b.horaFin), porPermiso: false });
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
  return cursor > inicioTurnoMin ? { esperadaMin: cursor, porPermiso } : { esperadaMin: null, porPermiso: false };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const desdeArg = process.argv.find((a) => a.startsWith('--desde='));
  const hastaArg = process.argv.find((a) => a.startsWith('--hasta='));
  const desde = desdeArg ? desdeArg.split('=')[1] : null;
  const hasta = hastaArg ? hastaArg.split('=')[1] : null;

  const enRango = (fechaStr) => {
    if (!fechaStr) return false;
    if (desde && /^\d{4}-\d{2}-\d{2}$/.test(desde) && fechaStr < desde) return false;
    if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hasta) && fechaStr > hasta) return false;
    return true;
  };

  console.log(apply ? 'MODO: APLICAR cambios (--apply)' : 'MODO: SIMULACIÓN (solo auditoría — usa --apply para aplicar)');
  console.log(`Rango filtro (opcional): ${desde || 'inicio'} → ${hasta || 'fin'}`);
  console.log('══════════════════════════════════════════════════════════');

  // ── Carga de datos ──
  const horarios = await prisma.horarioAsignado.findMany({
    select: {
      id: true,
      usuarioId: true,
      periodoId: true,
      diaSemana: true,
      periodoAcademico: true,
      fechaEspecifica: true,
      gestionId: true,
      createdAt: true,
      periodo: { select: { horaInicio: true, horaFin: true } },
    },
  });

  const solicitudes = await prisma.solicitudHorasExtras.findMany({
    where: { estado: 'APROBADO' },
    select: { id: true, empleadoId: true, fecha: true, bloques: true, fechaRespuesta: true, updatedAt: true, createdAt: true },
  });
  const reemplazos = await prisma.solicitudReemplazo.findMany({
    where: { estado: 'ACEPTADO' },
    select: { id: true, reemplazanteId: true, fecha: true, bloques: true, fechaRespuesta: true, updatedAt: true, createdAt: true },
  });

  // Cobertura de solicitudes: `${usuarioId}|${periodoId}|${fechaStr}`
  const cobertura = new Set();
  const addCobertura = (usuarioId, fechaStr, bloques) => {
    if (!usuarioId || !fechaStr) return;
    for (const pid of idsDeBloques(bloques)) cobertura.add(`${usuarioId}|${pid}|${fechaStr}`);
  };
  for (const s of solicitudes) addCobertura(s.empleadoId, fechaPuraStr(s.fecha), s.bloques);
  for (const r of reemplazos) addCobertura(r.reemplazanteId, fechaPuraStr(r.fecha), r.bloques);

  // ── D) Desfase de fechaEspecifica en horarios excepcionales ──
  // Un HorarioExcepcional creado para una Hora Extra/Reemplazo APROBADO debe
  // tener fechaEspecifica EXACTAMENTE igual a solicitud.fecha. Si quedó
  // desfasado (p. ej. HE del Miércoles 02/09 guardada como Jueves 03/09), la
  // falsa fecha abre un bloque en el día equivocado y genera una "Ausencia"
  // falsa. Se vincula por (usuarioId, periodoId) y se corrige a la fecha de la
  // solicitud. Los ids detectados se excluyen de [A] y [B1] (su fecha/diaSemana
  // se relocalizan aquí) y sus usuarios/días entran en la re-evaluación [C].
  const coberturaFechas = new Map(); // `${usuarioId}|${periodoId}` -> Set<fechaStr>
  const addCoberturaFecha = (usuarioId, fechaStr, bloques) => {
    if (!usuarioId || !fechaStr) return;
    for (const pid of idsDeBloques(bloques)) {
      const key = `${usuarioId}|${pid}`;
      if (!coberturaFechas.has(key)) coberturaFechas.set(key, new Set());
      coberturaFechas.get(key).add(fechaStr);
    }
  };
  for (const s of solicitudes) addCoberturaFecha(s.empleadoId, fechaPuraStr(s.fecha), s.bloques);
  for (const r of reemplazos) addCoberturaFecha(r.reemplazanteId, fechaPuraStr(r.fecha), r.bloques);

  const desfases = [];
  const desfasesAmbiguos = [];
  for (const h of horarios) {
    if (!h.fechaEspecifica) continue;
    const fStr = fechaPuraStr(h.fechaEspecifica);
    if (!enRango(fStr)) continue;
    const fechas = coberturaFechas.get(`${h.usuarioId}|${h.periodoId}`);
    if (!fechas || fechas.size === 0) continue; // sin solicitud que lo cubra → lo decide [B1]
    if (fechas.has(fStr)) continue; // ya coincide con la solicitud
    const prev = sumarDias(fStr, -1);
    const next = sumarDias(fStr, 1);
    let nueva;
    if (prev && fechas.has(prev)) {
      nueva = prev; // desfase +1 día: quedó un día DESPUÉS de la solicitud
    } else if (next && fechas.has(next)) {
      nueva = next; // desfase -1 día: quedó un día ANTES de la solicitud
    } else if (fechas.size === 1) {
      nueva = [...fechas][0]; // única solicitud que cubre (usuario, bloque)
    } else {
      desfasesAmbiguos.push({ id: h.id, usuarioId: h.usuarioId, periodoId: h.periodoId, fStr, fechas: [...fechas].sort() });
      continue;
    }
    const idxCorrecto = diaSemanaDeFechaStr(nueva);
    desfases.push({
      id: h.id,
      usuarioId: h.usuarioId,
      periodoId: h.periodoId,
      fechaVieja: fStr,
      fechaNueva: nueva,
      diaAnterior: h.diaSemana,
      diaCorrecto: idxCorrecto === null ? h.diaSemana : DIAS_SEMANA[idxCorrecto],
    });
  }
  const idsDesfase = new Set(desfases.map((d) => d.id));

  // ── A) diaSemana inconsistente en horarios excepcionales ──
  const fixDia = [];
  const avisoPeriodo = [];
  for (const h of horarios) {
    if (!h.fechaEspecifica) continue;
    if (idsDesfase.has(h.id)) continue; // [D] relocalizará fecha, diaSemana y periodoAcademico
    const fStr = fechaPuraStr(h.fechaEspecifica);
    if (!enRango(fStr)) continue;
    const idx = diaSemanaDeFechaStr(fStr);
    if (idx === null) continue;
    const correcto = DIAS_SEMANA[idx];
    if (h.diaSemana !== correcto) fixDia.push({ id: h.id, usuarioId: h.usuarioId, periodoId: h.periodoId, fStr, actual: h.diaSemana, correcto });
    const pa = obtenerPeriodoDeFechaStr(fStr);
    if (h.periodoAcademico !== pa) avisoPeriodo.push({ id: h.id, fStr, actual: h.periodoAcademico, correcto: pa });
  }

  // ── B1) Horarios excepcionales huérfanos ──
  const huerfanos = [];
  for (const h of horarios) {
    if (!h.fechaEspecifica) continue;
    if (idsDesfase.has(h.id)) continue; // no es huérfano: [D] lo relocaliza a la fecha de su solicitud
    const fStr = fechaPuraStr(h.fechaEspecifica);
    if (!enRango(fStr)) continue;
    if (!cobertura.has(`${h.usuarioId}|${h.periodoId}|${fStr}`)) {
      huerfanos.push({ id: h.id, usuarioId: h.usuarioId, periodoId: h.periodoId, fStr, diaSemana: h.diaSemana });
    }
  }

  // ── B2) Turnos recurrentes creados al aprobar una hora extra/reemplazo ──
  const aprobaciones = [];
  for (const s of solicitudes) {
    const fStr = fechaPuraStr(s.fecha);
    if (!enRango(fStr)) continue;
    aprobaciones.push({ ref: `HE#${s.id}`, usuarioId: s.empleadoId, fechaStr: fStr, bloques: s.bloques, t: s.fechaRespuesta || s.updatedAt || s.createdAt });
  }
  for (const r of reemplazos) {
    if (!r.reemplazanteId) continue;
    const fStr = fechaPuraStr(r.fecha);
    if (!enRango(fStr)) continue;
    aprobaciones.push({ ref: `RE#${r.id}`, usuarioId: r.reemplazanteId, fechaStr: fStr, bloques: r.bloques, t: r.fechaRespuesta || r.updatedAt || r.createdAt });
  }

  const proyeccionesMap = new Map(); // id -> { ... , refs: [] }
  for (const a of aprobaciones) {
    const tAprob = a.t ? new Date(a.t).getTime() : NaN;
    if (Number.isNaN(tAprob)) continue;
    const ids = idsDeBloques(a.bloques);
    for (const h of horarios) {
      if (h.fechaEspecifica) continue; // solo recurrentes (sin fecha)
      if (h.usuarioId !== a.usuarioId) continue;
      if (!ids.includes(h.periodoId)) continue;
      const tH = h.createdAt ? new Date(h.createdAt).getTime() : NaN;
      if (Number.isNaN(tH)) continue;
      if (Math.abs(tH - tAprob) > VENTANA_APROBACION_MS) continue;
      if (!proyeccionesMap.has(h.id)) {
        proyeccionesMap.set(h.id, { id: h.id, usuarioId: h.usuarioId, periodoId: h.periodoId, diaSemana: h.diaSemana, periodoAcademico: h.periodoAcademico, refs: [] });
      }
      proyeccionesMap.get(h.id).refs.push(a.ref);
    }
  }
  const proyecciones = [...proyeccionesMap.values()];

  // Sospechosos (solo informativo): turnos recurrentes que coinciden con un
  // bloque/día de una hora extra aprobada pero cuyo createdAt NO cae en la
  // ventana de aprobación. No se eliminan automáticamente para no borrar una
  // asignación legítima posterior; revísalos manualmente.
  const sospechosos = [];
  for (const a of aprobaciones) {
    const diaIdx = diaSemanaDeFechaStr(a.fechaStr);
    if (diaIdx === null) continue;
    const dia = DIAS_SEMANA[diaIdx];
    const ids = idsDeBloques(a.bloques);
    for (const h of horarios) {
      if (h.fechaEspecifica) continue;
      if (h.usuarioId !== a.usuarioId) continue;
      if (!ids.includes(h.periodoId)) continue;
      if (h.diaSemana !== dia) continue;
      if (proyeccionesMap.has(h.id)) continue;
      sospechosos.push({ id: h.id, usuarioId: h.usuarioId, periodoId: h.periodoId, dia, ref: a.ref });
    }
  }

  // ── Reporte A/B/D ──
  console.log(`[D] Horarios excepcionales con fechaEspecifica desfasada respecto a su solicitud: ${desfases.length}`);
  for (const d of desfases) {
    console.log(`    #${d.id} | usuarioId=${d.usuarioId} | periodoId=${d.periodoId} | fechaEspecifica ${d.fechaVieja} → ${d.fechaNueva} | dia "${d.diaAnterior}" → "${d.diaCorrecto}"`);
  }
  if (desfasesAmbiguos.length > 0) {
    console.log(`    (revisar manualmente) desfases ambiguos (múltiples solicitudes cubren el mismo usuario/bloque): ${desfasesAmbiguos.length}`);
    for (const a of desfasesAmbiguos) {
      console.log(`      #${a.id} | usuarioId=${a.usuarioId} | fecha=${a.fStr} | solicitudes=${a.fechas.join(', ')}`);
    }
  }

  console.log(`[A] Horarios excepcionales con diaSemana inconsistente: ${fixDia.length}`);
  for (const h of fixDia) {
    console.log(`    #${h.id} | usuarioId=${h.usuarioId} | periodoId=${h.periodoId} | fecha=${h.fStr} | "${h.actual}" → "${h.correcto}"`);
  }
  if (avisoPeriodo.length > 0) {
    console.log(`    (aviso) periodoAcademico inconsistente: ${avisoPeriodo.length} (solo informativo)`);
    for (const h of avisoPeriodo) console.log(`      #${h.id} | fecha=${h.fStr} | "${h.actual}" → esperado "${h.correcto}"`);
  }

  console.log(`[B1] Horarios excepcionales huérfanos (sin solicitud que los cubra): ${huerfanos.length}`);
  for (const h of huerfanos) {
    console.log(`    #${h.id} | usuarioId=${h.usuarioId} | periodoId=${h.periodoId} | fecha=${h.fStr} | dia=${h.diaSemana}`);
  }

  console.log(`[B2] Turnos recurrentes creados al aprobar una hora extra/reemplazo: ${proyecciones.length}`);
  for (const h of proyecciones) {
    console.log(`    #${h.id} | usuarioId=${h.usuarioId} | periodoId=${h.periodoId} | dia=${h.diaSemana} | periodo=${h.periodoAcademico} | refs=${h.refs.join(', ')}`);
  }
  if (sospechosos.length > 0) {
    console.log(`    (revisar manualmente) turnos recurrentes que coinciden con una hora extra pero sin match temporal: ${sospechosos.length}`);
    for (const h of sospechosos) {
      console.log(`      #${h.id} | usuarioId=${h.usuarioId} | periodoId=${h.periodoId} | dia=${h.dia} | ref=${h.ref}`);
    }
  }

  // ── C) Re-evaluación de marcaciones reales de empleados afectados ──
  const idsEliminar = new Set([...huerfanos.map((h) => h.id), ...proyecciones.map((h) => h.id)]);
  const diaCorregidoPorId = new Map(fixDia.map((h) => [h.id, h.correcto]));
  const fechaNuevaPorId = new Map(desfases.map((d) => [d.id, d.fechaNueva]));
  const diaNuevoPorId = new Map(desfases.map((d) => [d.id, d.diaCorrecto]));

  const usuariosAfectados = new Set([
    ...fixDia.map((h) => h.usuarioId),
    ...huerfanos.map((h) => h.usuarioId),
    ...proyecciones.map((h) => h.usuarioId),
    ...desfases.map((d) => d.usuarioId),
  ]);

  // Vista corregida de horarios (sin filas a eliminar, con diaSemana arreglado
  // y los excepcionales [D] relocalizados a la fecha exacta de su solicitud)
  const horariosCorregidos = horarios
    .filter((h) => !idsEliminar.has(h.id))
    .map((h) => {
      const rec = { ...h };
      if (fechaNuevaPorId.has(h.id)) {
        rec.fechaEspecifica = parseFechaPura(fechaNuevaPorId.get(h.id));
        rec.diaSemana = diaNuevoPorId.get(h.id);
      }
      rec.diaSemana = diaCorregidoPorId.has(h.id) ? diaCorregidoPorId.get(h.id) : rec.diaSemana;
      return rec;
    });

  const config = await prisma.configuracionSistema.findUnique({ where: { id: 1 } });
  const toleranciaGlobal = config?.tiempoTolerancia ?? 20;

  const correccionesAsistencia = [];
  const fechasAfectadas = new Set();

  for (const usuarioId of usuariosAfectados) {
    try {
    const recurrentes = new Map(); // diaSemana -> [{ periodoId, horaInicio, horaFin, createdAt }]
    const excepcionales = new Map(); // fStr -> [{ periodoId, horaInicio, horaFin }]

    for (const h of horariosCorregidos) {
      if (h.usuarioId !== usuarioId) continue;
      if (h.fechaEspecifica) {
        const fStr = fechaPuraStr(h.fechaEspecifica);
        if (!fStr) continue;
        if (!excepcionales.has(fStr)) excepcionales.set(fStr, []);
        excepcionales.get(fStr).push({ periodoId: h.periodoId, horaInicio: h.periodo.horaInicio, horaFin: h.periodo.horaFin });
      } else {
        if (!recurrentes.has(h.diaSemana)) recurrentes.set(h.diaSemana, []);
        recurrentes.get(h.diaSemana).push({
          periodoId: h.periodoId,
          horaInicio: h.periodo.horaInicio,
          horaFin: h.periodo.horaFin,
          createdAt: h.createdAt,
        });
      }
    }

    const asistencias = await prisma.asistencia.findMany({
      // `horaEntrada` es columna NOT NULL: no requiere filtro (Prisma rechaza
      // `not: null` en campos no anulables con "Argument 'not' must not be null").
      where: { usuarioId },
      select: { id: true, fecha: true, horaEntrada: true, periodo: true, observacion: true, minutosTolerancia: true },
    });

    const permisos = await prisma.permiso.findMany({
      where: { usuarioId, estado: 'APROBADO' },
      include: { periodos: { include: { periodo: { select: { horaInicio: true, horaFin: true } } } } },
    });
    const permisosPorFecha = new Map();
    for (const p of permisos) {
      const fStr = fechaPuraStr(p.fecha);
      if (!fStr) continue;
      if (!permisosPorFecha.has(fStr)) permisosPorFecha.set(fStr, []);
      permisosPorFecha.get(fStr).push(p);
    }

    const reemplazosSol = await prisma.solicitudReemplazo.findMany({
      where: { solicitanteId: usuarioId, estado: 'ACEPTADO' },
      select: { fecha: true, bloques: true },
    });
    const reemplazosPorFecha = new Map();
    for (const r of reemplazosSol) {
      const fStr = fechaPuraStr(r.fecha);
      if (!fStr) continue;
      if (!reemplazosPorFecha.has(fStr)) reemplazosPorFecha.set(fStr, []);
      reemplazosPorFecha.get(fStr).push(r);
    }

    for (const a of asistencias) {
      const fStr = fechaPuraStr(a.fecha);
      if (!fStr) continue;
      const diaIdx = new Date(fStr + 'T12:00:00Z').getUTCDay();
      const dia = DIAS_SEMANA[diaIdx];

      const recDia = (recurrentes.get(dia) || []).filter((h) => {
        const created = h.createdAt ? fechaPuraStr(h.createdAt) : '';
        return !created || fStr >= created;
      });
      const excFecha = excepcionales.get(fStr) || [];
      const bloques = agruparHorariosContiguos([...recDia, ...excFecha]);
      if (bloques.length === 0) {
        // La marcación quedó sin turno tras la limpieza: se conserva tal cual.
        continue;
      }

      const entradaMin = toBoliviaMinutes(a.horaEntrada);
      let match = null;
      for (let bi = 0; bi < bloques.length; bi++) {
        const bloque = bloques[bi];
        const inicioVentana = bi > 0 ? timeToMinutes(bloques[bi - 1].horaFin) : 0;
        const fin = timeToMinutes(bloque.horaFin);
        if (entradaMin >= inicioVentana && entradaMin <= fin) {
          match = bloque;
          break;
        }
      }
      if (!match) continue;

      const permisosFecha = permisosPorFecha.get(fStr) || [];
      const reemplazosFecha = reemplazosPorFecha.get(fStr) || [];
      const ajuste = obtenerEntradaEsperadaAjustada(permisosFecha, reemplazosFecha, match.horaInicio);
      const esperadaMin = ajuste.esperadaMin !== null ? ajuste.esperadaMin : timeToMinutes(match.horaInicio);
      const tolerancia = a.minutosTolerancia ?? toleranciaGlobal;
      const retraso = entradaMin > esperadaMin ? entradaMin - esperadaMin : 0;

      let estado;
      let observacion;
      if (retraso > tolerancia) {
        estado = 'Tardanza';
        observacion = `Llegó ${retraso} min tarde (tolerancia: ${tolerancia} min)`;
      } else if (ajuste.esperadaMin !== null && ajuste.porPermiso) {
        estado = 'Con Permiso';
        observacion = null;
      } else {
        estado = 'Puntual';
        observacion = null;
      }

      const nuevoPeriodo = `${match.horaInicio}–${match.horaFin}`;
      const cambiaPeriodo = (a.periodo || null) !== nuevoPeriodo;
      const cambiaObservacion = (a.observacion || null) !== observacion;

      if (cambiaPeriodo || cambiaObservacion) {
        correccionesAsistencia.push({
          id: a.id,
          usuarioId,
          fecha: fStr,
          entrada: toBoliviaTimeStr(a.horaEntrada),
          estado,
          periodoAntes: a.periodo || '—',
          periodoDespues: nuevoPeriodo,
          observacionAntes: a.observacion || '—',
          observacionDespues: observacion || '—',
        });
        fechasAfectadas.add(fStr);
      }
    }
    } catch (err) {
      console.error(`    ! Error al re-evaluar asistencia del usuario ${usuarioId}: ${err.message}`);
    }
  }

  console.log(`[C] Marcaciones reales a recalcular (periodo/observacion): ${correccionesAsistencia.length}`);
  for (const c of correccionesAsistencia) {
    console.log(`    #${c.id} | usuarioId=${c.usuarioId} | fecha=${c.fecha} | entrada=${c.entrada} | estado=${c.estado} | periodo ${c.periodoAntes} → ${c.periodoDespues} | nota '${c.observacionAntes}' → '${c.observacionDespues}'`);
  }

  // Fechas donde aparecía la falsa ausencia (por proyección recurrente)
  const fechasProyectadas = new Set();
  for (const p of proyecciones) {
    for (const a of aprobaciones) {
      if (!p.refs.includes(a.ref)) continue;
      const idx = diaSemanaDeFechaStr(a.fechaStr);
      if (idx === null) continue;
      // Todas las fechas del rango (o del mes de la solicitud) con ese día de semana
      const base = parseFechaPura(a.fechaStr);
      if (!base) continue;
      const y = base.getUTCFullYear();
      const m = base.getUTCMonth();
      const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      for (let d = 1; d <= ultimo; d++) {
        const f = fechaPuraStr(new Date(Date.UTC(y, m, d)));
        if (!f || !enRango(f)) continue;
        if (new Date(f + 'T12:00:00Z').getUTCDay() !== idx) continue;
        fechasProyectadas.add(f);
      }
    }
  }
  if (fechasProyectadas.size > 0) {
    console.log(`    Días que ya no exigirán el bloque temporal (ausencia falsa eliminada): ${[...fechasProyectadas].sort().join(', ')}`);
  }

  console.log('══════════════════════════════════════════════════════════');

  if (!apply) {
    console.log('Simulación terminada. Ejecuta con --apply para aplicar las correcciones.');
    await prisma.$disconnect();
    return;
  }

  // ── Aplicar D) relocalizar fechaEspecifica de excepcionales desfasados ──
  let aplicadosDesfase = 0;
  for (const d of desfases) {
    try {
      await prisma.horarioAsignado.update({
        where: { id: d.id },
        data: {
          fechaEspecifica: parseFechaPura(d.fechaNueva),
          diaSemana: d.diaCorrecto,
          periodoAcademico: obtenerPeriodoDeFechaStr(d.fechaNueva),
        },
      });
      aplicadosDesfase++;
    } catch (err) {
      console.error(`    ! No se pudo corregir #${d.id}: ${err.message}`);
    }
  }

  // ── Aplicar A) diaSemana ──
  let aplicadosDia = 0;
  for (const h of fixDia) {
    try {
      await prisma.horarioAsignado.update({ where: { id: h.id }, data: { diaSemana: h.correcto } });
      aplicadosDia++;
    } catch (err) {
      console.error(`    ! No se pudo actualizar #${h.id}: ${err.message}`);
    }
  }

  // ── Aplicar B1/B2) eliminar huérfanos y proyecciones ──
  let eliminados = 0;
  if (idsEliminar.size > 0) {
    try {
      const res = await prisma.horarioAsignado.deleteMany({ where: { id: { in: [...idsEliminar] } } });
      eliminados = res.count;
    } catch (err) {
      console.error(`    ! No se pudieron eliminar los horarios temporales: ${err.message}`);
    }
  }

  // ── Aplicar C) recalcular marcaciones ──
  let aplicadosAsistencia = 0;
  for (const c of correccionesAsistencia) {
    try {
      await prisma.asistencia.update({
        where: { id: c.id },
        data: {
          periodo: c.periodoDespues,
          observacion: c.observacionDespues === '—' ? null : c.observacionDespues,
        },
      });
      aplicadosAsistencia++;
    } catch (err) {
      console.error(`    ! No se pudo recalcular la marcación #${c.id}: ${err.message}`);
    }
  }

  // ── Recalcular horasProgramadas de los empleados afectados ──
  for (const uid of usuariosAfectados) {
    try {
      const todos = await prisma.horarioAsignado.findMany({
        where: { usuarioId: uid },
        include: { periodo: { select: { duracion: true } } },
      });
      const totalMin = todos.reduce((acc, h) => acc + (h.periodo?.duracion ?? 0), 0);
      await prisma.usuario.update({
        where: { id: uid },
        data: { horasProgramadas: parseFloat((totalMin / 60).toFixed(2)) },
      });
    } catch (err) {
      console.error(`    ! No se pudo recalcular horasProgramadas del usuario ${uid}: ${err.message}`);
    }
  }

  console.log(`Aplicado: ${aplicadosDesfase} fechaEspecifica desfasada(s) corregida(s), ${aplicadosDia} diaSemana corregido(s), ${eliminados} horario(s) temporal(es) eliminado(s), ${aplicadosAsistencia} marcación(es) recalculada(s).`);
  console.log(`horasProgramadas recalculadas para ${usuariosAfectados.size} empleado(s).`);
  console.log('El historial de asistencia se recalcula dinámicamente al consultar: las ausencias falsas ya no aparecerán.');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error fatal:', err.message);
  if (err.message && err.message.includes('DATABASE_URL')) {
    console.error('Asegúrate de configurar backend/.env con DATABASE_URL antes de ejecutar.');
  }
  process.exit(1);
});
