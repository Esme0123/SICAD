const prisma = require('../config/db');

async function registrarAuditoria(accion, usuarioEmail, direccionIP) {
  try {
    await prisma.auditoria.create({
      data: {
        accion,
        usuarioEmail,
        direccionIP,
      },
    });
  } catch (error) {
    console.error('[auditoria.registrarAuditoria]', error);
  }
}

async function getAll(req, res) {
  try {
    const registros = await prisma.auditoria.findMany({
      orderBy: { fechaHora: 'desc' },
      take: 100,
    });
    res.json({ ok: true, data: registros });
  } catch (error) {
    console.error('[auditoria.getAll]', error);
    res.status(500).json({ ok: false, message: 'Error al obtener registros de auditoría' });
  }
}

module.exports = { getAll, registrarAuditoria };
