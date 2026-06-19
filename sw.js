const CACHE = 'stack-v2';
const ASSETS = ['./'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('./')))
  );
});

// Message from app
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = e.data;
    self.registration.showNotification(title || 'STACK', {
      body: body || "Time to check your habits!",
      icon: './icon.png',
      badge: './icon.png',
      tag: tag || 'stack-reminder',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: self.location.origin + self.location.pathname }
    });
  }

  // Schedule a notification at a specific timestamp
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATION') {
    const { id, title, body, fireAt } = e.data;
    const delay = fireAt - Date.now();
    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        self.registration.showNotification(title || 'STACK', {
          body: body || "Time to check your habits!",
          icon: './icon.png',
          tag: id || 'stack-reminder',
          renotify: true,
          vibrate: [200, 100, 200],
          data: { url: self.location.origin + self.location.pathname }
        });
      }, delay);
    }
  }
});

// Notification click
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(e.notification.data?.url || './');
    })
  );
});

// Periodic background sync for reminders (where supported)
self.addEventListener('periodicsync', e => {
  if (e.tag === 'stack-reminder-check') {
    e.waitUntil(checkAndFireReminders());
  }
});

// Push event (for future push integration)
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || '⚡ STACK', {
      body: data.body || 'Check your habits.',
      icon: './icon.png',
      tag: 'stack-push',
      vibrate: [200, 100, 200],
    })
  );
});

async function checkAndFireReminders() {
  // Read schedule from all clients
  const clientList = await clients.matchAll({ includeUncontrolled: true });
  // Just show a generic reminder if we can't read state
  self.registration.showNotification('⚡ STACK', {
    body: "Time to log your habits. Stay on track.",
    icon: './icon.png',
    tag: 'stack-bg-reminder',
    renotify: true,
    vibrate: [200, 100, 200],
  });
}
