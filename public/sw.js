// Minimal service worker for PWA install prompt
const CACHE_NAME = 'pb-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy — let the app work normally
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
