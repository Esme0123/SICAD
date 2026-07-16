const os = require('os');
const prisma = require('../config/db');
const { obtenerPeriodoActual } = require('../utils/periodo.utils');

function getBoliviaDate(date = new Date()) {
  return new Date(new Date(date).toLocaleString("en-US", { timeZone: "America/La_Paz" }));
}

function toBoliviaDateStr(date = new Date()) {
  const bd = getBoliviaDate(date);
  const y = bd.getFullYear();
  const m = String(bd.getMonth() + 1).padStart(2, '0');
  const d = String(bd.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDayRange(date = new Date()) {
  const bd = getBoliviaDate(date);
  const y = bd.getFullYear();
  const m = bd.getMonth();
  const d = bd.getDate();
  const start = new Date(Date.UTC(y, m, d, 4, 0, 0, 0));
  const end   = new Date(Date.UTC(y, m, d, 27, 59, 59, 999));
  return { start, end };
}

function getWeekRange(date = new Date()) {
  const bd = getBoliviaDate(date);
  const y = bd.getFullYear();
  const m = bd.getMonth();
  const d = bd.getDate();
  const dayOfWeek = bd.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const sundayOffset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const start = new Date(Date.UTC(y, m, d + mondayOffset, 4, 0, 0, 0));
  const end   = new Date(Date.UTC(y, m, d + sundayOffset, 27, 59, 59, 999));
  return { start, end };
}

function getMonthRange(date = new Date()) {
  const bd = getBoliviaDate(date);
  const y = bd.getFullYear();
  const m = bd.getMonth();
  const d = bd.getDate();
  const start = new Date(Date.UTC(y, m, 1, 4, 0, 0, 0));
  const end   = new Date(Date.UTC(y, m, d, 27, 59, 59, 999));
  return { start, end };
}

function getBoliviaTimeMinutes(date = new Date()) {
  const bd = getBoliviaDate(date);
  return bd.getHours() * 60 + bd.getMinutes();
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getDiaSemanaHoy() {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  return dias[getBoliviaDate().getDay()];
}

function getEstadoFromObservacion(observacion) {
  if (!observacion) return 'Puntual';
  if (observacion === 'Cubierto por permiso') return 'Permiso';
  if (observacion.startsWith('Llegó')) return 'Atraso';
  return 'Puntual';
}

async function getChartData(rango, start, end) {
  if (rango === 'hoy') {
    const rows = await prisma.asistencia.findMany({
      where: { fecha: { gte: start, lte: end } },
      select: { horaEntrada: true },
    });
    const buckets = {};
    rows.forEach((r) => {
      const h = getBoliviaDate(r.horaEntrada).getHours();
      const key = `${String(h).padStart(2, '0')}:00`;
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  if (rango === 'semana') {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const rows = await prisma.asistencia.findMany({
      where: { fecha: { gte: start, lte: end } },
      select: { horaEntrada: true },
    });
    const buckets = {};
    rows.forEach((r) => {
      const dia = dias[getBoliviaDate(r.horaEntrada).getDay()];
      buckets[dia] = (buckets[dia] || 0) + 1;
    });
    const orden = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
    return orden.map((time) => ({ time, count: buckets[time] || 0 }));
  }

  const rows = await prisma.asistencia.findMany({
    where: { fecha: { gte: start, lte: end } },
    select: { horaEntrada: true },
  });
  const buckets = {};
  rows.forEach((r) => {
    const bd = getBoliviaDate(r.horaEntrada);
    const dayOfMonth = bd.getDate();
    const weekNum = Math.ceil(dayOfMonth / 7);
    const key = `Semana ${weekNum}`;
    buckets[key] = (buckets[key] || 0) + 1;
  });
  return Object.entries(buckets)
    .map(([time, count]) => ({ time, count }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

async function getResumen(req, res) {
  try {
    const rango = req.query.rango || 'hoy';
    const ahora = new Date();
    const ahoraMin = getBoliviaTimeMinutes(ahora);

    let start, end, diaSemana;
    if (rango === 'hoy') {
      const r = getDayRange(ahora);
      start = r.start; end = r.end;
      diaSemana = getDiaSemanaHoy();
    } else if (rango === 'semana') {
      const r = getWeekRange(ahora);
      start = r.start; end = r.end;
    } else {
      const r = getMonthRange(ahora);
      start = r.start; end = r.end;
    }

    const totalEmpleados = await prisma.usuario.count({
      where: { rol: 'EMPLEADO', activo: true },
    });

    const asistenciasRange = await prisma.asistencia.findMany({
      where: { fecha: { gte: start, lte: end } },
      select: { usuarioId: true },
      distinct: ['usuarioId'],
    });
    const presentes = asistenciasRange.length;

    let ausentes = 0;
    if (rango === 'hoy') {
      const horariosHoy = await prisma.horarioAsignado.findMany({
        where: { diaSemana, periodoAcademico: obtenerPeriodoActual(), usuario: { activo: true, rol: 'EMPLEADO' } },
        include: { periodo: true },
      });
      const asistioHoy = new Set(asistenciasRange.map(a => a.usuarioId));
      const ausentesSet = new Set(
        horariosHoy
          .filter(h => ahoraMin > timeToMinutes(h.periodo.horaFin) && !asistioHoy.has(h.usuarioId))
          .map(h => h.usuarioId)
      );
      ausentes = ausentesSet.size;
    } else {
      ausentes = totalEmpleados - presentes;
    }

    const retrasos = await prisma.asistencia.count({
      where: {
        fecha: { gte: start, lte: end },
        observacion: { startsWith: 'Llegó' },
      },
    });

    const hoyDate = new Date(toBoliviaDateStr(ahora) + "T00:00:00.000Z");
    let permisos;
    if (rango === 'hoy') {
      permisos = await prisma.permiso.count({
        where: { fecha: hoyDate, estado: 'APROBADO' },
      });
    } else {
      permisos = await prisma.permiso.count({
        where: {
          fecha: { gte: new Date(toBoliviaDateStr(start) + "T00:00:00.000Z"), lte: hoyDate },
          estado: 'APROBADO',
        },
      });
    }

    const chartData = await getChartData(rango, start, end);

    const recientes = await prisma.asistencia.findMany({
      where: { fecha: { gte: start, lte: end } },
      include: { usuario: { select: { id: true, nombre: true, codigo: true } } },
      orderBy: { horaEntrada: 'desc' },
      take: 10,
    });

    const actividadReciente = recientes.map(a => ({
      id: a.id,
      usuarioId: a.usuarioId,
      nombre: a.usuario?.nombre || '',
      codigo: a.usuario?.codigo || '',
      horaEntrada: a.horaEntrada,
      horaSalida: a.horaSalida,
      observacion: a.observacion,
      estado: getEstadoFromObservacion(a.observacion),
    }));

    const ramUsada = Math.round((1 - os.freemem() / os.totalmem()) * 100);
    let dbStatus = 'Desconectada';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'Conectada';
    } catch (_) {
      dbStatus = 'Desconectada';
    }

    res.json({
      ok: true,
      data: {
        totalEmpleados,
        presentes,
        ausentes,
        retrasos,
        permisos,
        chartData,
        actividadReciente,
        systemStatus: { ram: ramUsada, db: dbStatus },
      },
    });
  } catch (error) {
    console.error('[dashboard.getResumen]', error);
    res.status(500).json({ ok: false, message: error.message });
  }
}

module.exports = { getResumen };
