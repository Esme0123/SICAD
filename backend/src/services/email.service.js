// src/services/email.service.js
// Servicio de envío de correos con Resend (API HTTP)

const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FRONTEND_URL  = process.env.FRONTEND_URL  || 'https://sicad-m2ra.vercel.app';
const FROM_EMAIL    = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

let resend = null;

function getClient() {
  if (!RESEND_API_KEY) {
    console.warn('[email.service] RESEND_API_KEY no configurado. Los correos no se enviarán.');
    return null;
  }
  if (!resend) resend = new Resend(RESEND_API_KEY);
  return resend;
}

/**
 * Envía un correo de invitación a un nuevo empleado.
 */
async function enviarCorreoInvitacion(email, nombre, token, codigo) {
  const client = getClient();
  if (!client) return;

  const url = `${FRONTEND_URL}/register-employee?token=${token}`;

  await client.emails.send({
    from: `SICAD <${FROM_EMAIL}>`,
    to: [email],
    subject: 'Invitación a la plataforma SICAD',
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8" /></head>
      <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;">
        <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:32px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">🎉 SICAD</h1>
            <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">Sistema de Control de Asistencia — UCB</p>
          </div>
          <div style="padding:36px 40px;">
            <h2 style="margin:0 0 8px;color:#1e293b;font-size:18px;">¡Has sido invitado/a a SICAD! 🎊</h2>
            <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 12px;">Has sido registrado en el Sistema de Control de Asistencia del Centro de Cómputo UCB.</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0 0 10px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">TUS DATOS</p>
              <div>
                <span style="display:block;color:#94a3b8;font-size:11px;margin-bottom:2px;">Código asignado</span>
                <code style="color:#1d4ed8;font-size:16px;font-weight:700;background:#eff6ff;padding:4px 10px;border-radius:6px;border:1px solid #bfdbfe;">${codigo || 'N/A'}</code>
              </div>
              <div style="margin-top:10px;">
                <span style="display:block;color:#94a3b8;font-size:11px;margin-bottom:2px;">Correo registrado</span>
                <span style="color:#1e293b;font-size:14px;font-weight:600;">${email}</span>
              </div>
            </div>
            <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">Para completar tu registro y acceder al sistema, haz clic en el botón a continuación:</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${url}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;">Completar Registro en SICAD</a>
            </div>
            <p style="color:#94a3b8;font-size:12px;text-align:center;margin:24px 0 0;">Este enlace es válido durante <strong>7 días</strong>. Si no esperabas esta invitación, puedes ignorar este correo.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
            <p style="color:#cbd5e1;font-size:11px;text-align:center;margin:0;">© ${new Date().getFullYear()} SICAD — Centro de Cómputo UCB "San Pablo"</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  console.log(`[email.service] Invitación enviada a: ${email}`);
}

/**
 * Envía un correo de restablecimiento de contraseña.
 */
async function enviarCorreoReset(email, nombre, token) {
  const client = getClient();
  if (!client) return;

  const url = `${FRONTEND_URL}/reset-password?token=${token}`;

  await client.emails.send({
    from: `SICAD <${FROM_EMAIL}>`,
    to: [email],
    subject: 'Restablecer contraseña - SICAD',
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8" /></head>
      <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;">
        <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:32px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">🔐 SICAD</h1>
            <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">Sistema de Control de Asistencia — UCB</p>
          </div>
          <div style="padding:36px 40px;">
            <h2 style="margin:0 0 8px;color:#1e293b;font-size:18px;">Solicitud de Restablecimiento de Contraseña</h2>
            <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">Recibimos una solicitud para restablecer la contraseña de tu cuenta en SICAD. Haz clic en el botón a continuación para crear una nueva contraseña.</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${url}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;">Restablecer Contraseña</a>
            </div>
            <p style="color:#94a3b8;font-size:12px;text-align:center;margin:24px 0 0;">Este enlace es válido durante <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este correo.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
            <p style="color:#cbd5e1;font-size:11px;text-align:center;margin:0;">© ${new Date().getFullYear()} SICAD — Centro de Cómputo UCB "San Pablo"</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  console.log(`[email.service] Correo de reset enviado a: ${email}`);
}

module.exports = { enviarCorreoReset, enviarCorreoInvitacion, FRONTEND_URL };
