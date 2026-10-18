// PulseChat Service Worker for PWA Installation and Offline Fallback
const CACHE_NAME = 'pulsechat-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll non-fatal warning:', err);
      });
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  // Only cache GET requests, bypass API, Socket.io, and Uploads
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/uploads')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
        });
      })
  );
});

// Push Notification Event (Handles incoming calls and messages when app/browser is closed)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : 'Incoming activity' };
  }

  if (data.type === 'incoming_call') {
    const isVideo = data.callType === 'video';
    const title = `📞 Incoming ${isVideo ? 'Video' : 'Voice'} Call`;
    const options = {
      body: `${data.callerName || 'Someone'} is calling you on PulseChat...`,
      icon: data.callerAvatar || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: `call-${data.callId}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [400, 200, 400, 200, 400, 200, 600],
      data: {
        url: `/?callId=${data.callId}&action=answer`,
        callId: data.callId,
        type: 'incoming_call'
      },
      actions: [
        { action: 'answer', title: '📞 Answer' },
        { action: 'decline', title: '❌ Decline' }
      ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } else {
    const title = data.title || 'PulseChat';
    const options = {
      body: data.body || 'You have a new message',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Notification Click Event (Opens / focuses PulseChat app directly into the call)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no window open, launch app window with target URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

