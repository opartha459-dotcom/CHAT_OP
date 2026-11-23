// PulseChat Service Worker for PWA Installation and Offline Fallback
const CACHE_NAME = "pulsechat-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Cache each asset separately so ONE missing file doesn't cancel everything
      await Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn("[SW] Failed to precache", asset, err);
          }),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin http(s) requests (skips chrome-extension://, CDNs, etc.)
  if (url.origin !== self.location.origin) return;

  // Bypass API, Socket.io, Uploads, and Range requests (audio/video streaming)
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/socket.io") ||
    url.pathname.startsWith("/uploads") ||
    req.headers.has("range")
  ) {
    return;
  }

  // Key navigations by pathname so /chat?callId=... doesn't create endless cache entries
  const isNavigation = req.mode === "navigate";
  const cacheKey = isNavigation ? url.pathname : req;

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(req);

        // Don't cache redirected responses (they break navigation when served from cache)
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic" &&
          !networkResponse.redirected
        ) {
          const responseToCache = networkResponse.clone();
          // waitUntil keeps the SW alive until caching finishes
          event.waitUntil(
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(cacheKey, responseToCache))
              .catch(() => {}),
          );
        }
        return networkResponse;
      } catch (err) {
        const cached = await caches.match(cacheKey);
        if (cached) return cached;

        if (
          isNavigation ||
          (req.headers.get("accept") || "").includes("text/html")
        ) {
          const fallback = await caches.match("/");
          if (fallback) return fallback;
        }

        // Never resolve with undefined: respondWith() would throw a TypeError
        return Response.error();
      }
    })(),
  );
});

function buildCallUrl(d, action = "incoming") {
  if (!d || !d.callId) return "/chat";
  const params = new URLSearchParams();
  params.set("callId", d.callId);
  params.set("action", action);
  if (d.callerName) params.set("callerName", d.callerName);
  if (d.callerAvatar) params.set("callerAvatar", d.callerAvatar);
  if (d.callerId) params.set("callerId", d.callerId);
  if (d.callType) params.set("callType", d.callType);
  if (d.conversationId) params.set("conversationId", d.conversationId);
  if (d.isGroup) params.set("isGroup", "1");
  return `/chat?${params.toString()}`;
}

async function getAppWindowClients() {
  const windowClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  return windowClients.filter((client) => {
    try {
      return new URL(client.url).origin === self.location.origin;
    } catch (e) {
      return false;
    }
  });
}

// Push Notification Event (Handles incoming calls and messages when app/browser is closed)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "Incoming activity" };
  }

  if (data.type === "incoming_call") {
    const isVideo = data.callType === "video";
    const title = `📞 Incoming ${isVideo ? "Video" : "Voice"} Call`;
    const callUrl = buildCallUrl(data, "incoming");
    const options = {
      body: `${data.callerName || "Someone"} is calling you on PulseChat...`,
      icon: data.callerAvatar || "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: `call-${data.callId}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [1000, 500, 1000, 500, 1000, 500, 1000, 500, 1000, 500],
      data: {
        url: callUrl,
        callId: data.callId,
        type: "incoming_call",
        callData: data,
      },
      actions: [
        { action: "answer", title: "📞 Answer" },
        { action: "decline", title: "❌ Decline" },
      ],
    };

    event.waitUntil(
      (async () => {
        // Tell any open tab so it can show the call modal.
        // NOTE: client.focus() is NOT allowed from a push event (needs a user gesture),
        // so it is removed here. Focusing happens in notificationclick instead.
        const appClients = await getAppWindowClients();
        for (const client of appClients) {
          client.postMessage({
            type: "INCOMING_CALL_POPUP",
            callData: data,
          });
        }
        // Always show a notification (browsers require this for every push)
        await self.registration.showNotification(title, options);
      })(),
    );
  } else if (data.type === "call_cancelled") {
    // Caller hung up / call timed out: stop ringing and replace the ringing notification
    event.waitUntil(
      (async () => {
        const appClients = await getAppWindowClients();
        for (const client of appClients) {
          client.postMessage({
            type: "INCOMING_CALL_CANCELLED",
            callId: data.callId,
          });
        }

        // Same tag as the ringing notification, so this REPLACES it
        await self.registration.showNotification("Missed call", {
          body: `${data.callerName || "Someone"} tried to call you`,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: `call-${data.callId}`,
          requireInteraction: false,
          renotify: false,
          silent: true,
          data: { url: "/chat" },
        });
      })(),
    );
  } else {
    const title = data.title || "PulseChat";
    const options = {
      body: data.body || "You have a new message",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/chat" },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Notification Click Event (Handles Answer, Decline, and Tap to open)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const callData =
    notificationData.callData ||
    (notificationData.callId ? { callId: notificationData.callId } : null);
  const callId =
    notificationData.callId || (callData && callData.callId) || null;
  const isCall = Boolean(callId);

  if (event.action === "decline") {
    event.waitUntil(
      (async () => {
        if (callId) {
          try {
            await fetch(
              `/api/users/call/${encodeURIComponent(callId)}/decline`,
              {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: "declined" }),
              },
            );
          } catch (e) {
            console.warn("[SW] Error notifying server of declined call:", e);
          }
        }

        // Stop local ringing in any open window
        const appClients = await getAppWindowClients();
        for (const client of appClients) {
          client.postMessage({ type: "INCOMING_CALL_DECLINED", callId });
        }
      })(),
    );
    return;
  }

  const isAnswer = event.action === "answer";
  const targetUrl = isCall
    ? buildCallUrl(callData, isAnswer ? "answer" : "incoming")
    : notificationData.url || "/chat";

  event.waitUntil(
    (async () => {
      // Notify backend to halt the caller's ringback.
      // Must be awaited, otherwise the SW can be killed before the request is sent.
      if (isAnswer && callId) {
        try {
          await fetch(`/api/users/call/${encodeURIComponent(callId)}/answer`, {
            method: "POST",
            credentials: "include",
          });
        } catch (e) {
          // Non-blocking
        }
      }

      const appClients = await getAppWindowClients();
      const appClient = appClients[0];

      if (appClient) {
        // Focus FIRST (allowed because this is a user-gesture event).
        // If we navigate first, the old client reference can become stale.
        if ("focus" in appClient) {
          await appClient.focus().catch(() => {});
        }

        if (isCall) {
          appClient.postMessage({
            type: "INCOMING_CALL_ACTION",
            callId,
            action: isAnswer ? "answer" : "incoming",
            callData,
          });
        }

        // Navigate only when needed. The URL carries the call params, so a reload is safe.
        try {
          const current = new URL(appClient.url);
          const target = new URL(targetUrl, self.location.origin);
          const needsNavigation = isCall
            ? !current.pathname.startsWith("/chat")
            : current.pathname + current.search !==
              target.pathname + target.search;

          if (needsNavigation && "navigate" in appClient) {
            await appClient.navigate(target.href).catch(() => {});
          }
        } catch (err) {
          // ignore
        }
      } else if (clients.openWindow) {
        await clients.openWindow(targetUrl);
      }
    })(),
  );
});
