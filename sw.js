// Service Worker for Kameti Web App (Always network-first live sync)
const CACHE_NAME = 'kameti-cache-v10.0.2-fresh';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // A network request can still use the browser's HTTP cache. Revalidate
  // same-origin app files so installed PWAs receive fixes on reload.
  const sameOrigin = new URL(event.request.url).origin === self.location.origin;
  event.respondWith(sameOrigin && event.request.method === 'GET'
    ? fetch(event.request, { cache: 'no-cache' })
    : fetch(event.request));
});
