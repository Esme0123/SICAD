const CACHE_NAME = 'sicad-v1-cache';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/sicad-icon-192.svg'
];

// Instalación: Precargar recursos clave
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación: Limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Estrategia Fetch: Servir desde Caché si no hay Red (Offline)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NO cachear peticiones POST/PUT, llamadas a API o Supabase (para no interferir con la cámara ni lecturas de QR)
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api') || url.hostname.includes('supabase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        // Devuelve caché y actualiza en segundo plano (Stale-while-revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return response;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return networkResponse;
      });
    }).catch(() => {
      // Fallback offline si no hay red
      return caches.match('/');
    })
  );
});

// Notificaciones Push
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.titulo || 'Notificación SICAD';
    const options = {
      body: data.mensaje || '',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error procesando Push:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});
