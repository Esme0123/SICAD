const prisma = require('../config/db');

const BUSQUEDA = process.argv[2] || 'LIMA POMA';

function linea(ch = '-') {
  console.log(ch.repeat(90));
}

function imprimirUsuario(u) {
  console.log(
    `  #${u.id}\t${u.nombre}\trol=${u.rol}\tactivo=${u.activo}\tcodigo=${u.codigo || '-'}\tci=${u.ci || '-'}\temail=${u.email}\thorasProg=${u.horasProgramadas}\tcreado=${(u.createdAt || '').toISOString?.() || u.createdAt}`
  );
}

async function main() {
  linea();
  console.log(`DIAGNÓSTICO DE INTEGRIDAD - SOLICITUDES DE REEMPLAZO (búsqueda: "${BUSQUEDA}")`);
  linea();

  const candidatos = await prisma.usuario.findMany({
    where: { nombre: { contains: BUSQUEDA, mode: 'insensitive' } },
    orderBy: { id: 'asc' },
  });

  console.log(`1) USUARIOS QUE COINCIDEN CON "${BUSQUEDA}": ${candidatos.length}`);
  linea();
  if (candidatos.length === 0) {
    console.log('  >>> NO EXISTE ningún usuario con ese nombre. Verificar nombre correcto en BD.');
    return;
  }
  for (const u of candidatos) imprimirUsuario(u);

  const ids = candidatos.map((u) => u.id);

  console.log('\n2) DETECCIÓN DE CUENTAS DUPLICADAS (misma persona, varias filas en usuarios):');
  linea();
  const todos = await prisma.usuario.findMany({
    where: { rol: 'EMPLEADO' },
    select: { id: true, nombre: true, codigo: true, ci: true, email: true, activo: true, createdAt: true },
    orderBy: { id: 'asc' },
  });

  const porCi = new Map();
  const porNombre = new Map();
  for (const u of todos) {
    if (u.ci) {
      const k = u.ci.replace(/\D/g, '');
      if (k) {
        if (!porCi.has(k)) porCi.set(k, []);
        porCi.get(k).push(u);
      }
    }
    const nk = (u.nombre || '').toUpperCase().replace(/\s+/g, ' ').trim();
    if (nk) {
      if (!porNombre.has(nk)) porNombre.set(nk, []);
      porNombre.get(nk).push(u);
    }
  }

  let encontradosDuplicados = false;
  const duplicadosDeHenrry = new Set();
  for (const [k, lista] of porCi) {
    if (lista.length > 1 && rangoSolapa(lista, ids)) {
      encontradosDuplicados = true;
      console.log(`  CI ${k}:`);
      for (const u of lista) { imprimirUsuario(u); duplicadosDeHenrry.add(u.id); }
    }
  }
  for (const [k, lista] of porNombre) {
    if (lista.length > 1 && rangoSolapa(lista, ids)) {
      encontradosDuplicados = true;
      console.log(`  NOMBRE "${k}":`);
      for (const u of lista) { imprimirUsuario(u); duplicadosDeHenrry.add(u.id); }
    }
  }
  if (!encontradosDuplicados) console.log('  Sin duplicados evidentes (por CI o nombre exacto).');

  const todosLosIds = [...new Set([...ids, ...duplicadosDeHenrry])];

  console.log('\n3) SOLICITUDES DONDE ESTE USUARIO ES SOLICITANTE (solicitante_id):');
  linea();
  const comoSolicitante = await prisma.solicitudReemplazo.findMany({
    where: { solicitanteId: { in: todosLosIds } },
    orderBy: { createdAt: 'desc' },
  });
  if (comoSolicitante.length === 0) {
    console.log('  >>> NO hay solicitudes creadas por este usuario.');
    console.log('  NOTA: Si en la App no se pudo enviar, el problema está más arriba (duplicados/horarios),');
    console.log('  NO en la consulta de listado.');
  } else {
    console.log(`  Total: ${comoSolicitante.length}`);
    for (const s of comoSolicitante) {
      const fecha = (s.fecha || '').toISOString?.().slice(0, 10) || s.fecha;
      console.log(`  #${s.id}\testado=${s.estado}\tfecha=${fecha}\tabierta=${s.esAbierta}\treemplazanteId=${s.reemplazanteId || '-'}\thoras=${s.horasTotales}\tcreado=${(s.createdAt || '').toISOString?.() || s.createdAt}`);
    }
  }

  console.log('\n4) SOLICITUDES DONDE ESTE USUARIO APARECE COMO REEMPLAZANTE TARGET (reemplazante_id):');
  linea();
  const comoReemplazante = await prisma.solicitudReemplazo.findMany({
    where: { reemplazanteId: { in: todosLosIds } },
    orderBy: { createdAt: 'desc' },
  });
  if (comoReemplazante.length === 0) {
    console.log('  >>> No hay solicitudes asignadas a este usuario como reemplazante (dirigidas o aceptadas).');
  } else {
    console.log(`  Total: ${comoReemplazante.length}`);
    for (const s of comoReemplazante) {
      const fecha = (s.fecha || '').toISOString?.().slice(0, 10) || s.fecha;
      console.log(`  #${s.id}\testado=${s.estado}\tfecha=${fecha}\tsolicitanteId=${s.solicitanteId}`);
    }
  }

  console.log('\n5) CUENTAS HUÉRFANAS EN SOLICITUDES (solicitante_id o reemplazante_id sin usuario):');
  linea();
  const huerfanas = await prisma.$queryRaw`
    SELECT sr.id, sr."solicitanteId", sr."reemplazanteId", sr."esAbierta", sr."fecha", sr.estado, sr."createdAt"
    FROM solicitudes_reemplazo sr
    LEFT JOIN usuarios uS ON uS.id = sr."solicitanteId"
    LEFT JOIN usuarios uR ON uR.id = sr."reemplazanteId"
    WHERE uS.id IS NULL OR (sr."reemplazanteId" IS NOT NULL AND uR.id IS NULL)
    ORDER BY sr."createdAt" DESC
  `;
  if (huerfanas.length === 0) {
    console.log('  Sin huérfanas: todas las solicitudes apuntan a usuarios EXISTENTES.');
    console.log('  >>> Un INNER JOIN de Prisma NO podría ocultar solicitudes por datos faltantes.');
  } else {
    console.log(`  >>> ENCONTRADAS ${huerfanas.length} solicitudes con FK rota. Estas son las que una`);
    console.log('  consulta con INNER JOIN (o include de relación requerida) puede omitir.');
    for (const s of huerfanas) {
      const fecha = (s.fecha instanceof Date ? s.fecha.toISOString().slice(0, 10) : s.fecha?.slice?.(0, 10)) || s.fecha;
      console.log(`  #${s.id}\tsolicitanteId=${s.solicitanteId}\treemplazanteId=${s.reemplazanteId || '-'}\testado=${s.estado}\tfecha=${fecha}`);
    }
  }

  console.log('\n6) HORARIOS ASIGNADOS Y GESTIÓN ACADÉMICA (equivalente al "Contrato" del solicitante):');
  linea();
  for (const u of candidatos) {
    const horarios = await prisma.horarioAsignado.findMany({
      where: { usuarioId: u.id },
      select: { id: true, periodoAcademico: true, gestionId: true, diaSemana: true, fechaEspecifica: true },
    });
    const porPeriodoAcademico = {};
    for (const h of horarios) porPeriodoAcademico[h.periodoAcademico] = (porPeriodoAcademico[h.periodoAcademico] || 0) + 1;
    console.log(`  Usuario #${u.id} (${u.nombre}): ${horarios.length} horarios asignados`);
    console.log(`    activo=${u.activo}\thalto? (sin horario = no puede solicitar reemplazos en la App)`);
    for (const [pa, n] of Object.entries(porPeriodoAcademico)) {
      console.log(`    periodoAcademico "${pa}": ${n} filas`);
    }
    const gestiones = await prisma.gestionAcademica.findMany({
      where: { horariosAsignados: { some: { usuarioId: u.id } } },
      select: { id: true, nombre: true, activo: true, esVisibleMovil: true, fechaInicio: true, fechaFin: true },
    });
    for (const g of gestiones) {
      const ini = (g.fechaInicio || '').toISOString?.().slice(0, 10);
      const fin = (g.fechaFin || '').toISOString?.().slice(0, 10);
      console.log(`    gestion #${g.id} "${g.nombre}" activo=${g.activo} visibleMovil=${g.esVisibleMovil} rango=${ini}..${fin}`);
    }
  }

  console.log('\n7) RESUMEN / RECOMENDACIONES:');
  linea();
  if (candidatos.length > 1) {
    console.log(`  >>> SE DETECTARON ${candidatos.length} CUENTAS para el mismo nombre.`);
    console.log('  Confirmar cuál es la cuenta CANÓNICA. Las solicitudes quedan ligadas a un único');
    console.log('  solicitante_id; si Henrry ingresa con otra cuenta, la App muestra vacío.');
    console.log('  Corregir reasignando solicitudes/horarios a una sola cuenta o desactivando el duplicado.');
  } else if (candidatos.length === 1 && comoSolicitante.length === 0) {
    console.log('  >>> Una sola cuenta SIN solicitudes. Si el flujo falla al CREAR, revisar horarios (sección 6).');
  } else if (candidatos.length === 1 && huerfanas.filter((s) => s.solicitanteId === candidatos[0].id).length > 0) {
    console.log('  >>> Solicitudes de este usuario quedaron huérfanas (sección 5). Reasignar su solicitante_id');
    console.log('  al id correcto y/o restaurar el usuario, y verificar FKs reales de la BD (los scripts Prisma');
    console.log('  usan onDelete: Cascade, pero por esquema manual puede que no existan las restricciones).');
  } else {
    console.log('  >>> Perfil y solicitudes consistentes en la BD. Si aún así no se ven, depurar qué');
    console.log('  empleado ingresa en la App (email correcto) y si 2) reporta duplicados.');
  }
  console.log('');
  console.log(`Modo de uso: node src/scripts/diagnosticarSolicitudesReemplazo.js [nombre]`);
  console.log(`(solo auditoría/lectura, no modifica datos)`);
}

function rangoSolapa(lista, ids) {
  return lista.some((u) => ids.includes(u.id));
}

main()
  .catch((e) => {
    console.error('[diagnostico:reemplazos] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });