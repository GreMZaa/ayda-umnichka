// Service Worker for АйДаУмничка PWA
const CACHE_NAME = 'ayda-umnichka-pwa-v4';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA: Pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('PWA: Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data) {
    if (event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
    if (event.data.type === 'CLEAR_CACHE') {
      caches.keys().then((keys) => {
        Promise.all(keys.map((key) => caches.delete(key)));
      });
    }
    if (event.data.type === 'SHOW_NOTIFICATION') {
      const { title, options } = event.data;
      if (self.registration && self.registration.showNotification) {
        self.registration.showNotification(title, options);
      }
    }
  }
});

// Handle clicking on an OS notification: focus or open PWA window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/messenger';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no window is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle incoming Web Push
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'АйДаУмничка', body: event.data.text() };
    }
  }

  const title = data.title || 'АйДаУмничка: Новое сообщение';
  const options = {
    body: data.body || 'Вам пришло новое сообщение в чате',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon.png',
    data: {
      url: data.url || '/messenger',
    },
    vibrate: [150, 50, 150],
    tag: data.tag || 'chat-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass service worker caching for API calls, WebRTC, Supabase, room signals and non-GET requests
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/room/') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Navigation requests (HTML pages) MUST be Network-First to guarantee latest Next.js build
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return caches.match('/');
          });
        })
    );
    return;
  }

  // Static assets: Network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          // Only cache images and icons in runtime cache
          if (
            url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2)$/i) ||
            url.pathname.startsWith('/_next/static/')
          ) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
