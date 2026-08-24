// Service Worker for Kameti Web App (Always network-first live sync)
const CACHE_NAME = 'kameti-cache-v10-fresh';

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
  event.respondWith(fetch(event.request));
});
