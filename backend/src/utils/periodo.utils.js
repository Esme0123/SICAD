/**
 * Determina el periodo académico actual basado en la fecha.
 * Usa la zona horaria de Bolivia (America/La_Paz).
 *
 * Reglas:
 *   Enero       → "Verano YYYY"
 *   Feb-Jun     → "1-YYYY"
 *   Julio       → "Invierno YYYY"
 *   Ago-Dic     → "2-YYYY"
 *
 * @param {Date} [fecha=new Date()]
 * @returns {string} Ej: "1-2026", "Invierno 2026", "Verano 2026"
 */
function obtenerPeriodoActual(fecha) {
  const boliviaDate = !fecha
    ? new Date(new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" }))
    : new Date(new Date(fecha).toLocaleString("en-US", { timeZone: "America/La_Paz" }));

  const mes = boliviaDate.getMonth() + 1; // 1–12
  const year = boliviaDate.getFullYear();

  if (mes === 1) return `Verano ${year}`;
  if (mes >= 2 && mes <= 6) return `1-${year}`;
  if (mes === 7) return `Invierno ${year}`;
  return `2-${year}`;
}

const PERIOD_VALUES = {
  0: (y) => `Verano ${y}`,
  1: (y) => `1-${y}`,
  2: (y) => `Invierno ${y}`,
  3: (y) => `2-${y}`,
};

function parsePeriod(value) {
  let m = value.match(/^(Verano|Invierno)\s(\d{4})$/);
  if (m) {
    const idx = m[1] === 'Verano' ? 0 : 2;
    return { idx, year: parseInt(m[2]) };
  }
  m = value.match(/^1-(\d{4})$/);
  if (m) return { idx: 1, year: parseInt(m[1]) };
  m = value.match(/^2-(\d{4})$/);
  if (m) return { idx: 3, year: parseInt(m[2]) };
  return null;
}

function getPreviousPeriod(value) {
  const parsed = parsePeriod(value);
  if (!parsed) return null;
  let { idx, year } = parsed;
  idx--;
  if (idx < 0) { idx = 3; year--; }
  return PERIOD_VALUES[idx](year);
}

/**
 * Obtiene o crea automáticamente la gestión académica según la fecha.
 * Reglas de periodo (mismo calendario que obtenerPeriodoActual):
 *   Enero       → "Verano YYYY"       (YYYY-01-01 al YYYY-01-31)
 *   Febrero–Junio → "1-YYYY"         (YYYY-02-01 al YYYY-06-30)
 *   Julio       → "Invierno YYYY"     (YYYY-07-01 al YYYY-07-31)
 *   Agosto–Dic  → "2-YYYY"           (YYYY-08-01 al YYYY-12-31)
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {Date|string} [fecha]
 * @returns {Promise<{id: number, nombre: string}>}
 */
async function obtenerOCrearGestionActiva(prisma, fecha) {
  const boliviaDate = !fecha
    ? new Date(new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" }))
    : new Date(new Date(fecha).toLocaleString("en-US", { timeZone: "America/La_Paz" }));

  const mes = boliviaDate.getMonth() + 1;
  const year = boliviaDate.getFullYear();

  let nombre, fechaInicio, fechaFin;

  if (mes === 1) {
    nombre = `Verano ${year}`;
    fechaInicio = `${year}-01-01`;
    fechaFin    = `${year}-01-31`;
  } else if (mes >= 2 && mes <= 6) {
    nombre = `1-${year}`;
    fechaInicio = `${year}-02-01`;
    fechaFin    = `${year}-06-30`;
  } else if (mes === 7) {
    nombre = `Invierno ${year}`;
    fechaInicio = `${year}-07-01`;
    fechaFin    = `${year}-07-31`;
  } else {
    nombre = `2-${year}`;
    fechaInicio = `${year}-08-01`;
    fechaFin    = `${year}-12-31`;
  }

  // Buscar por nombre, si no existe se crea
  let gestion = await prisma.gestionAcademica.findUnique({ where: { nombre } });

  if (!gestion) {
    gestion = await prisma.gestionAcademica.create({
      data: {
        nombre,
        fechaInicio: new Date(`${fechaInicio}T00:00:00`),
        fechaFin:    new Date(`${fechaFin}T23:59:59`),
        activo:      true,
      },
    });
  }

  return { id: gestion.id, nombre: gestion.nombre };
}

/**
 * Obtiene o crea una gestión académica por su nombre.
 * Útil cuando ya se conoce el periodoAcademico (string) y se necesita
 * el gestionId.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} nombre — Ej: "1-2026", "Invierno 2026", "Verano 2026"
 * @returns {Promise<{id: number, nombre: string}>}
 */
async function obtenerOCrearGestionPorNombre(prisma, nombre) {
  let gestion = await prisma.gestionAcademica.findUnique({ where: { nombre } });

  if (!gestion) {
    const parsed = parsePeriod(nombre);
    if (!parsed) throw new Error(`No se puede determinar la gestión para: ${nombre}`);

    const { idx, year } = parsed;
    let fechaInicio, fechaFin;

    switch (idx) {
      case 0: // Verano
        fechaInicio = `${year}-01-01`;
        fechaFin    = `${year}-01-31`;
        break;
      case 1: // 1-
        fechaInicio = `${year}-02-01`;
        fechaFin    = `${year}-06-30`;
        break;
      case 2: // Invierno
        fechaInicio = `${year}-07-01`;
        fechaFin    = `${year}-07-31`;
        break;
      case 3: // 2-
        fechaInicio = `${year}-08-01`;
        fechaFin    = `${year}-12-31`;
        break;
    }

    gestion = await prisma.gestionAcademica.create({
      data: {
        nombre,
        fechaInicio: new Date(`${fechaInicio}T00:00:00`),
        fechaFin:    new Date(`${fechaFin}T23:59:59`),
        activo:      true,
      },
    });
  }

  return { id: gestion.id, nombre: gestion.nombre };
}

module.exports = { obtenerPeriodoActual, parsePeriod, getPreviousPeriod, obtenerOCrearGestionActiva, obtenerOCrearGestionPorNombre };
