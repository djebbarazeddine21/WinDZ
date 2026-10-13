// WinDZ Self-Cleaning Service Worker
// Automatically purges all cached Vite modules and unregisters to prevent React hook collisions
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Do not intercept any fetch requests: ensure direct network access for all assets
self.addEventListener('fetch', () => {
  // Let network handle directly
});
