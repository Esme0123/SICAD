// src/services/email.service.js
// Servicio de envío de correos con Nodemailer (Gmail SMTP)

const nodemailer = require('nodemailer');

const SMTP_HOST    = process.env.SMTP_HOST    || 'smtp.gmail.com';
const SMTP_PORT    = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER    = process.env.SMTP_USER    || '';
const SMTP_PASS    = process.env.SMTP_PASS    || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function createTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[email.service] SMTP_USER o SMTP_PASS no configurados. Los correos no se enviarán.');
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // true para puerto 465, false para 587
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });
}

/**
 * Envía un correo de restablecimiento de contraseña.
 * @param {string} to       - Correo destinatario
 * @param {string} nombre   - Nombre del usuario
 * @param {string} token    - Token de reset
 */
async function enviarCorreoReset(to, nombre, token) {
  const transporter = createTransporter();
  if (!transporter) return;

  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;">
      <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:32px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">🔐 SICAD</h1>
          <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">Sistema de Control de Asistencia — UCB</p>
        </div>
        <div style="padding:36px 40px;">
          <h2 style="margin:0 0 8px;color:#1e293b;font-size:18px;">Hola, ${nombre} 👋</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en SICAD.<br/>
            Haz clic en el botón a continuación para establecer una nueva contraseña.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.2px;">
              Restablecer Contraseña
            </a>
          </div>
          <p style="color:#94a3b8;font-size:12px;text-align:center;margin:24px 0 0;">
            Este enlace es válido durante <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este correo.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
          <p style="color:#cbd5e1;font-size:11px;text-align:center;margin:0;">
            © ${new Date().getFullYear()} SICAD — Centro de Cómputo UCB "San Pablo"
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"SICAD UCB" <${SMTP_USER}>`,
    to,
    subject: '🔐 Restablecimiento de contraseña — SICAD',
    html,
  });

  console.log(`[email.service] Correo de reset enviado a: ${to}`);
}

/**
 * Envía las credenciales de acceso a un nuevo usuario del sistema.
 * @param {string} to             - Correo destinatario
 * @param {string} nombre         - Nombre del usuario
 * @param {string} defaultPassword - Contraseña temporal asignada
 */
async function enviarCredencialesUsuario(to, nombre, defaultPassword) {
  const transporter = createTransporter();
  if (!transporter) return;

  const loginUrl = `${FRONTEND_URL}/login`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;">
      <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:32px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">🎉 SICAD</h1>
          <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">Sistema de Control de Asistencia — UCB</p>
        </div>
        <div style="padding:36px 40px;">
          <h2 style="margin:0 0 8px;color:#1e293b;font-size:18px;">¡Bienvenido/a, ${nombre}! 🙌</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Tu cuenta en SICAD ha sido creada. A continuación encontrarás tus credenciales de acceso:
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
            <p style="margin:0 0 10px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">TUS CREDENCIALES</p>
            <div style="margin-bottom:10px;">
              <span style="display:block;color:#94a3b8;font-size:11px;margin-bottom:2px;">Correo</span>
              <span style="color:#1e293b;font-size:14px;font-weight:600;">${to}</span>
            </div>
            <div>
              <span style="display:block;color:#94a3b8;font-size:11px;margin-bottom:2px;">Contraseña temporal</span>
              <code style="color:#1d4ed8;font-size:16px;font-weight:700;background:#eff6ff;padding:4px 10px;border-radius:6px;border:1px solid #bfdbfe;">${defaultPassword}</code>
            </div>
          </div>
          <p style="color:#f59e0b;font-size:13px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin:0 0 24px;">
            ⚠️ <strong>Cambia tu contraseña</strong> la primera vez que inicies sesión.
          </p>
          <div style="text-align:center;">
            <a href="${loginUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;">
              Ir al Sistema SICAD
            </a>
          </div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px;" />
          <p style="color:#cbd5e1;font-size:11px;text-align:center;margin:0;">
            © ${new Date().getFullYear()} SICAD — Centro de Cómputo UCB "San Pablo"
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"SICAD UCB" <${SMTP_USER}>`,
    to,
    subject: '🎉 Bienvenido/a a SICAD — Tus credenciales de acceso',
    html,
  });

  console.log(`[email.service] Credenciales enviadas a: ${to}`);
}

/**
 * Envía un correo de invitación a un nuevo empleado para que complete su registro.
 * @param {string} to          - Correo destinatario
 * @param {string} nombre      - Nombre del empleado (puede ser "Usuario")
 * @param {string} inviteToken - Token único de invitación
 * @param {string} codigo      - Código CC-xxx asignado
 */
async function enviarCorreoInvitacion(to, nombre, inviteToken, codigo) {
  const transporter = createTransporter();
  if (!transporter) return;

  const registerUrl = `${FRONTEND_URL}/register-employee?token=${inviteToken}`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;">
      <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:32px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">🎉 SICAD</h1>
          <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">Sistema de Control de Asistencia — UCB</p>
        </div>
        <div style="padding:36px 40px;">
          <h2 style="margin:0 0 8px;color:#1e293b;font-size:18px;">¡Has sido invitado/a a SICAD! 🎊</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 12px;">
            Has sido registrado en el Sistema de Control de Asistencia del Centro de Cómputo UCB.
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
            <p style="margin:0 0 10px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">TUS DATOS</p>
            <div>
              <span style="display:block;color:#94a3b8;font-size:11px;margin-bottom:2px;">Código asignado</span>
              <code style="color:#1d4ed8;font-size:16px;font-weight:700;background:#eff6ff;padding:4px 10px;border-radius:6px;border:1px solid #bfdbfe;">${codigo}</code>
            </div>
            <div style="margin-top:10px;">
              <span style="display:block;color:#94a3b8;font-size:11px;margin-bottom:2px;">Correo registrado</span>
              <span style="color:#1e293b;font-size:14px;font-weight:600;">${to}</span>
            </div>
          </div>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Para completar tu registro y acceder al sistema, haz clic en el botón a continuación:
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${registerUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.2px;">
              Completar Registro en SICAD
            </a>
          </div>
          <p style="color:#94a3b8;font-size:12px;text-align:center;margin:24px 0 0;">
            Este enlace es válido durante <strong>7 días</strong>. Si no esperabas esta invitación, puedes ignorar este correo.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
          <p style="color:#cbd5e1;font-size:11px;text-align:center;margin:0;">
            © ${new Date().getFullYear()} SICAD — Centro de Cómputo UCB "San Pablo"
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"SICAD UCB" <${SMTP_USER}>`,
    to,
    subject: '🎉 Invitación a SICAD — Completa tu registro',
    html,
  });

  console.log(`[email.service] Invitación enviada a: ${to}`);
}

module.exports = { enviarCorreoReset, enviarCredencialesUsuario, enviarCorreoInvitacion, FRONTEND_URL };
