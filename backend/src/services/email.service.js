// src/services/email.service.js
// Servicio de envío de correos con Brevo API v3

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const FRONTEND_URL  = process.env.FRONTEND_URL  || 'https://sicad-m2ra.vercel.app';
const SENDER_EMAIL  = process.env.SMTP_USER     || 'esm.med123@gmail.com';

async function sendBrevoEmail(toEmail, subject, htmlContent) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY no está configurada en las variables de entorno.");
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Sistema SICAD', email: SENDER_EMAIL },
      to: [{ email: toEmail }],
      subject: subject,
      htmlContent: htmlContent,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("❌ Error devuelto por la API de Brevo:", data);
    throw new Error(data.message || JSON.stringify(data));
  }

  return data;
}

async function enviarCorreoInvitacion(email, nombre, token, codigo) {
  const url = `${FRONTEND_URL}/register-employee?token=${token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e3a8a;">¡Hola ${nombre || 'Empleado'}!</h2>
      <p>Has sido invitado a registrarte en el sistema <strong>SICAD</strong>.</p>
      <p>Tu código asignado es: <strong>${codigo || 'N/A'}</strong></p>
      <p>Haz clic en el siguiente botón para completar tu registro y definir tu contraseña:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" style="background-color: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Completar Registro</a>
      </div>
      <p style="color: #64748b; font-size: 12px;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br>${url}</p>
    </div>
  `;
  return await sendBrevoEmail(email, 'Invitación a la plataforma SICAD', html);
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
  return await sendBrevoEmail(email, 'Restablecer contraseña - SICAD', html);
}

module.exports = { enviarCorreoInvitacion, enviarCorreoRecuperacion, sendBrevoEmail, FRONTEND_URL };
