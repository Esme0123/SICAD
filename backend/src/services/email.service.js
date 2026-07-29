// src/services/email.service.js
// Servicio de envío de correos con SendGrid API v3

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';
const FRONTEND_URL     = process.env.FRONTEND_URL  || 'https://sicad-m2ra.vercel.app';
const SENDER_EMAIL     = process.env.SMTP_USER     || 'esm.med123@gmail.com';

async function sendSendGridEmail(toEmail, subject, htmlContent) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY no está configurada en las variables de entorno de Render.");
  }

  const response = await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail }] }],
      from: { email: SENDER_EMAIL, name: 'Sistema SICAD' },
      subject: subject,
      content: [{ type: 'text/html', value: htmlContent }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("❌ Error devuelto por la API de SendGrid:", errorBody);
    throw new Error(`Error SendGrid (${response.status}): ${errorBody}`);
  }

  return { success: true };
}

async function enviarCorreoInvitacion(email, nombre, token, codigo) {
  const url = `${FRONTEND_URL}/register-employee?token=${token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e3a8a;">¡Hola ${nombre || 'Empleado'}!</h2>
      <p>Has sido invitado a registrarte en la plataforma <strong>SICAD</strong>.</p>
      <p>Tu código asignado es: <strong>${codigo || 'N/A'}</strong></p>
      <p>Haz clic en el siguiente botón para completar tu registro y definir tu contraseña:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" style="background-color: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Completar Registro</a>
      </div>
      <p style="color: #64748b; font-size: 12px;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br>${url}</p>
    </div>
  `;
  return await sendSendGridEmail(email, 'Invitación a la plataforma SICAD', html);
}

async function enviarCorreoRecuperacion(email, token) {
  const url = `${FRONTEND_URL}/reset-password?token=${token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e3a8a;">Restablecer Contraseña</h2>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>SICAD</strong>.</p>
      <p>Haz clic en el siguiente botón para ingresar una nueva contraseña:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" style="background-color: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
      </div>
      <p style="color: #64748b; font-size: 12px;">Este enlace expirará en 1 hora.<br>Si el botón no funciona, copia y pega este enlace:<br>${url}</p>
    </div>
  `;
  return await sendSendGridEmail(email, 'Restablecer contraseña - SICAD', html);
}

module.exports = { enviarCorreoInvitacion, enviarCorreoRecuperacion, sendSendGridEmail, FRONTEND_URL };
