const CACHE_NAME = 'sicad-v2-cache';
const ASSETS_TO_CACHE = [
  '/app/login',
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Instalación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activación y Limpieza
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch Strategy (Offline Support & API Exclusion)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET' || url.pathname.startsWith('/api') || url.hostname.includes('supabase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        fetch(event.request)
          .then((netResponse) => {
            if (netResponse && netResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, netResponse));
            }
          })
          .catch(() => {});
        return response;
      }
      return fetch(event.request).catch(() => caches.match('/app/login'));
    })
  );
});

// 🔄 SINCRONIZACIÓN PERIÓDICA EN SEGUNDO PLANO (Ej. Actualización de Periodo 2-2026)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-period-data') {
    event.waitUntil(
      fetch('/api/periodos/actual')
        .then((res) => res.json())
        .then((data) => {
          console.log('[SW] Periodo académico sincronizado en segundo plano:', data);
        })
        .catch((err) => console.log('[SW] Error en Periodic Sync:', err))
    );
  }
});

// 🔄 BACKGROUND SYNC (Para reconexión de red)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-asistencias') {
    console.log('[SW] Sincronizando datos pendientes...');
  }
});

// Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.titulo || 'SICAD';
    const options = {
      body: data.mensaje || '',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/app/login' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error Push SW:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || '/app/login'));
});
