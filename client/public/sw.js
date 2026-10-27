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

function buildCallUrl(d, action = 'incoming') {
  if (!d || !d.callId) return '/chat';
  const params = new URLSearchParams();
  params.set('callId', d.callId);
  params.set('action', action);
  if (d.callerName) params.set('callerName', d.callerName);
  if (d.callerAvatar) params.set('callerAvatar', d.callerAvatar);
  if (d.callerId) params.set('callerId', d.callerId);
  if (d.callType) params.set('callType', d.callType);
  if (d.conversationId) params.set('conversationId', d.conversationId);
  if (d.isGroup) params.set('isGroup', '1');
  return `/chat?${params.toString()}`;
}

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
    const callUrl = buildCallUrl(data, 'incoming');
    const options = {
      body: `${data.callerName || 'Someone'} is calling you on PulseChat...`,
      icon: data.callerAvatar || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: `call-${data.callId}`,
      renotify: true,
      requireInteraction: true,
      // Repeating ring vibration pattern like Telegram & WhatsApp
      vibrate: [1000, 500, 1000, 500, 1000, 500, 1000, 500, 1000, 500],
      data: {
        url: callUrl,
        callId: data.callId,
        type: 'incoming_call',
        callData: data
      },
      actions: [
        { action: 'answer', title: '📞 Answer' },
        { action: 'decline', title: '❌ Decline' }
      ]
    };

    event.waitUntil(
      (async () => {
        // Automatically focus any open PulseChat tab/window and open call modal
        const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            client.postMessage({
              type: 'INCOMING_CALL_POPUP',
              callData: data
            });
            if ('focus' in client) {
              client.focus().catch(() => { });
            }
          }
        }
        await self.registration.showNotification(title, options);
      })()
    );
  } else {
    const title = data.title || 'PulseChat';
    const options = {
      body: data.body || 'You have a new message',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/chat' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Notification Click Event (Handles Answer, Decline, and Tap to open)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const callData = notificationData.callData || (notificationData.callId ? { callId: notificationData.callId } : null);

  if (event.action === 'decline') {
    // User declined call directly from notification
    event.waitUntil(
      (async () => {
        const callId = notificationData.callId || (callData && callData.callId);
        if (callId) {
          try {
            await fetch(`/api/users/call/${encodeURIComponent(callId)}/decline`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason: 'declined' })
            });
          } catch (e) {
            console.warn('[SW] Error notifying server of declined call:', e);
          }
        }

        // Notify open window clients so local ringing stops immediately
        const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            client.postMessage({
              type: 'INCOMING_CALL_DECLINED',
              callId
            });
          }
        }
      })()
    );
    return;
  }

  const isAnswer = event.action === 'answer';
  const isCall = Boolean(callData && callData.callId);
  const targetUrl = isCall
    ? buildCallUrl(callData, isAnswer ? 'answer' : 'incoming')
    : (notificationData.url || '/chat');

  event.waitUntil(
    (async () => {
      // If user tapped 'Answer', notify backend immediately to halt caller's ringback
      if (isAnswer && callData && callData.callId) {
        try {
          fetch(`/api/users/call/${encodeURIComponent(callData.callId)}/answer`, {
            method: 'POST'
          }).catch(() => {});
        } catch (e) {
          // Non-blocking
        }
      }

      const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const appClient = windowClients.find((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch (e) {
          return false;
        }
      });

      if (appClient) {
        // Send action message to existing window
        appClient.postMessage({
          type: 'INCOMING_CALL_ACTION',
          callId: callData ? callData.callId : null,
          action: isAnswer ? 'answer' : 'incoming',
          callData
        });

        // If not already in /chat, navigate to targetUrl
        try {
          const clientUrl = new URL(appClient.url);
          if (!clientUrl.pathname.startsWith('/chat')) {
            await appClient.navigate(targetUrl).catch(() => {});
          }
        } catch (err) {
          // ignore
        }

        if ('focus' in appClient) {
          await appClient.focus().catch(() => {});
        }
      } else if (clients.openWindow) {
        await clients.openWindow(targetUrl);
      }
    })()
  );
});

