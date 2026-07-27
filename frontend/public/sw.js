self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.titulo || "SICAD";
  const options = {
    body: data.mensaje || "Tienes una nueva notificación.",
    icon: "/sicad-icon-192.svg",
    badge: "/sicad-icon-192.svg",
    vibrate: [200, 100, 200]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/app/inicio'));
});
