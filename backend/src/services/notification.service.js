const webpush = require('web-push');
const prisma = require('../config/db');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEXgT8ViO4mGhZ6m0HG9wjR2zR3kX5n8qLs7cJ2dF4b6a8y0w3eR1tY7uI9oP2sD5fH1jK3lQ6zX9cV4bN7mQ';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'tB3rX7mK9pL2nR5vY8wC1fJ4hQ6sA0dG3jU6zX9cV4bN7mQ';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:sistema@sicad.ucb.edu.bo';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function enviarNotificacionPush({ titulo, mensaje, usuarioId }) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { usuarioId },
    });

    const payload = JSON.stringify({ titulo, mensaje });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }
  } catch (error) {
    console.error('[notification.service] Error enviando push:', error);
  }
}

async function guardarSuscripcion(usuarioId, subscription, userAgent) {
  try {
    await prisma.pushSubscription.upsert({
      where: { usuarioId_endpoint: { usuarioId, endpoint: subscription.endpoint } },
      update: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userAgent },
      create: {
        usuarioId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
      },
    });
  } catch (error) {
    console.error('[notification.service] Error guardando suscripcion:', error);
  }
}

async function eliminarSuscripcion(usuarioId, endpoint) {
  try {
    await prisma.pushSubscription.deleteMany({
      where: { usuarioId, endpoint },
    });
  } catch (error) {
    console.error('[notification.service] Error eliminando suscripcion:', error);
  }
}

module.exports = { enviarNotificacionPush, guardarSuscripcion, eliminarSuscripcion, VAPID_PUBLIC_KEY };
