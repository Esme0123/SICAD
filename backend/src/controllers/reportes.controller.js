const prisma = require('../config/db');

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getBoliviaDate(date = new Date()) {
  return new Date(new Date(date).toLocaleString("en-US", { timeZone: "America/La_Paz" }));
}

function getDateRange(startStr, endStr) {
  return {
    start: new Date(`${startStr}T00:00:00.000Z`),
    end: new Date(`${endStr}T23:59:59.999Z`),
  };
}

async function getAnalisis(req, res) {
  try {
    let { startDate, endDate, search, cargo } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ ok: false, message: 'startDate y endDate son requeridos' });
    }

    const { start, end } = getDateRange(startDate, endDate);

    // ── Filtro de usuario (search por CI/código, cargo opcional) ──
    const userWhere = {
      rol: 'EMPLEADO',
      activo: true,
    };

    if (search) {
      userWhere.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { ci: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Nota: cargo no existe como campo en el schema de Usuario.
    // Si se implementa en el futuro, agregar: userWhere.cargo = cargo
    // Por ahora se ignora el filtro de cargo.

    const usuarios = await prisma.usuario.findMany({
      where: userWhere,
      select: { id: true },
    });
    const userIds = usuarios.map((u) => u.id);
    if (userIds.length === 0) {
      return res.json({
        ok: true,
        data: {
          kpis: { cumplimientoGeneral: 0, totalAsistencias: 0, promedioDiario: 0, permisosAprobados: 0 },
          graficoBarras: [],
          graficoDona: { puntual: 0, tardanza: 0, ausente: 0, justificado: 0 },
          franjaHoraria: [],
          motivosPermiso: [],
        },
      });
    }
    const userFilter = { usuarioId: { in: userIds } };

    const asistenciaWhere = {
      fecha: { gte: start, lte: end },
      ...userFilter,
    };

    // ════════════════════════════════════════════════════════════════
    // 1. KPIs
    // ════════════════════════════════════════════════════════════════

    const totalAsistencias = await prisma.asistencia.count({
      where: asistenciaWhere,
    });

    const asistenciasObs = await prisma.asistencia.findMany({
      where: asistenciaWhere,
      select: { fecha: true, observacion: true },
    });

    const puntualCount = asistenciasObs.filter(
      (a) => !a.observacion || !a.observacion.startsWith('Llegó')
    ).length;

    const cumplimientoGeneral =
      totalAsistencias > 0 ? Math.round((puntualCount / totalAsistencias) * 100) : 0;

    const daysDiff =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const promedioDiario =
      daysDiff > 0 ? Math.round((totalAsistencias / daysDiff) * 10) / 10 : 0;

    const permisosAprobados = await prisma.permiso.count({
      where: {
        fecha: { gte: new Date(`${startDate}T00:00:00.000Z`), lte: new Date(`${endDate}T00:00:00.000Z`) },
        estado: 'APROBADO',
        ...userFilter,
      },
    });

    // ════════════════════════════════════════════════════════════════
    // 2. gráficoBarras — agrupado por día (4 estados)
    // ════════════════════════════════════════════════════════════════

    const totalEmpleados = usuarios.length;

    // Per-day attendance breakdown (puntual vs tardanza)
    const dayAttendance = {};
    for (const a of asistenciasObs) {
      const d = new Date(a.fecha);
      const diaSemana = DIAS[d.getDay()].substring(0, 3);
      const label = `${diaSemana} ${d.getDate()}`;
      if (!dayAttendance[label]) dayAttendance[label] = { total: 0, tardanza: 0 };
      dayAttendance[label].total++;
      if (a.observacion && a.observacion.startsWith('Llegó')) {
        dayAttendance[label].tardanza++;
      }
    }

    // Per-day approved permisos
    const permisosAprobadosPorDia = await prisma.permiso.groupBy({
      by: ['fecha'],
      where: {
        fecha: { gte: new Date(`${startDate}T00:00:00.000Z`), lte: new Date(`${endDate}T00:00:00.000Z`) },
        estado: 'APROBADO',
        ...userFilter,
      },
      _count: { id: true },
    });
    const justificadosMap = Object.fromEntries(
      permisosAprobadosPorDia.map((p) => {
        const d = new Date(p.fecha);
        const diaSemana = DIAS[d.getDay()].substring(0, 3);
        const label = `${diaSemana} ${d.getDate()}`;
        return [label, p._count.id];
      })
    );

    const graficoBarras = Object.entries(dayAttendance).map(([label, data]) => {
      const puntual = data.total - data.tardanza;
      const justificados = justificadosMap[label] || 0;
      const ausentes = Math.max(0, totalEmpleados - data.total - justificados);
      return { fecha: label, puntual, tardanza: data.tardanza, ausentes, justificados };
    });

    // ════════════════════════════════════════════════════════════════
    // 3. gráficoDona — puntual / tardanza / ausente
    // ════════════════════════════════════════════════════════════════

    const tardanzaCount = asistenciasObs.filter(
      (a) => a.observacion && a.observacion.startsWith('Llegó')
    ).length;

    // Ausentes estimados: empleados activos que NO tienen ningún registro en el rango
    const empleadosConAsistencia = await prisma.asistencia.groupBy({
      by: ['usuarioId'],
      where: asistenciaWhere,
      _count: { id: true },
    });
    const presentesSet = new Set(empleadosConAsistencia.map((a) => a.usuarioId));

    const usuariosConPermiso = await prisma.permiso.findMany({
      where: {
        fecha: { gte: new Date(`${startDate}T00:00:00.000Z`), lte: new Date(`${endDate}T00:00:00.000Z`) },
        estado: 'APROBADO',
        ...userFilter,
      },
      select: { usuarioId: true },
      distinct: ['usuarioId'],
    });
    const justificadoSet = new Set(usuariosConPermiso.map((p) => p.usuarioId));

    const ausenteCount = userIds.filter((id) => !presentesSet.has(id) && !justificadoSet.has(id)).length;
    const justificadoCount = userIds.filter((id) => !presentesSet.has(id) && justificadoSet.has(id)).length;

    const totalDona = puntualCount + tardanzaCount + ausenteCount + justificadoCount;
    const graficoDona = {
      puntual: totalDona > 0 ? Math.round((puntualCount / totalDona) * 100) : 0,
      tardanza: totalDona > 0 ? Math.round((tardanzaCount / totalDona) * 100) : 0,
      ausente: totalDona > 0 ? Math.round((ausenteCount / totalDona) * 100) : 0,
      justificado: totalDona > 0 ? Math.round((justificadoCount / totalDona) * 100) : 0,
    };

    // ════════════════════════════════════════════════════════════════
    // 4. franjaHoraria — % puntualidad por horaInicio del periodo
    // ════════════════════════════════════════════════════════════════

    const asistenciasFull = await prisma.asistencia.findMany({
      where: asistenciaWhere,
      select: { id: true, usuarioId: true, fecha: true, horaEntrada: true, observacion: true },
    });

    const horariosAsignados = await prisma.horarioAsignado.findMany({
      where: { usuario: { activo: true, rol: 'EMPLEADO' } },
      include: { periodo: true },
    });

    const franjaMap = {};
    for (const a of asistenciasFull) {
      const dia = DIAS[new Date(a.fecha).getDay()];
      const matching = horariosAsignados.filter(
        (h) => h.usuarioId === a.usuarioId && h.diaSemana === dia
      );
      const aTime = getBoliviaDate(a.horaEntrada).getHours() * 60 + getBoliviaDate(a.horaEntrada).getMinutes();
      const matched = matching.find((h) => {
        const startM = timeToMinutes(h.periodo.horaInicio);
        const endM = timeToMinutes(h.periodo.horaFin);
        return aTime >= startM - 10 && aTime <= endM;
      });

      if (matched) {
        const key = matched.periodo.horaInicio;
        if (!franjaMap[key]) franjaMap[key] = { total: 0, puntual: 0 };
        franjaMap[key].total++;
        if (!a.observacion || !a.observacion.startsWith('Llegó')) {
          franjaMap[key].puntual++;
        }
      }
    }

    const allPeriodos = await prisma.periodo.findMany({
      where: { activo: true },
      orderBy: { horaInicio: 'asc' },
    });

    const franjaHoraria = allPeriodos.map((p) => {
      const data = franjaMap[p.horaInicio] || { total: 0, puntual: 0 };
      return {
        hora: p.horaInicio,
        puntualidad: data.total > 0 ? Math.round((data.puntual / data.total) * 100) : 0,
      };
    });

    // ════════════════════════════════════════════════════════════════
    // 5. motivosPermiso — conteo por tipo de permiso
    // ════════════════════════════════════════════════════════════════

    const permisosByType = await prisma.permiso.groupBy({
      by: ['tipoPermisoId'],
      where: {
        fecha: { gte: new Date(`${startDate}T00:00:00.000Z`), lte: new Date(`${endDate}T00:00:00.000Z`) },
        estado: 'APROBADO',
        ...userFilter,
      },
      _count: { id: true },
    });

    const tipoPermisos = await prisma.tipoPermiso.findMany();
    const tipoMap = Object.fromEntries(tipoPermisos.map((t) => [t.id, t.nombre]));

    const totalPermisos = permisosByType.reduce((acc, p) => acc + p._count.id, 0);
    const motivosPermiso = permisosByType
      .map((p) => ({
        tipo: tipoMap[p.tipoPermisoId] || 'Otro',
        cantidad: p._count.id,
        porcentaje: totalPermisos > 0 ? Math.round((p._count.id / totalPermisos) * 100) : 0,
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // ════════════════════════════════════════════════════════════════
    // Response
    // ════════════════════════════════════════════════════════════════

    res.json({
      ok: true,
      data: {
        kpis: {
          cumplimientoGeneral,
          totalAsistencias,
          promedioDiario,
          permisosAprobados,
        },
        graficoBarras,
        graficoDona,
        franjaHoraria,
        motivosPermiso,
      },
    });
  } catch (error) {
    console.error('[reportes.getAnalisis]', error);
    res.status(500).json({ ok: false, message: error.message });
  }
}

module.exports = { getAnalisis };
