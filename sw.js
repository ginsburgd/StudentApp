// sw.js - Service Worker for Ramaz Challenge & Spinner
const CACHE_VERSION = 'v1';
const CACHE_NAME = `ramaz-cache-${CACHE_VERSION}`;

// List of assets to cache at install time. Add any other assets needed for offline.
const PRECACHE_ASSETS = [
  '/',
  'index.html',
  'assets/css/styles.css',
  'assets/js/app.js',
  'assets/js/challenge.js',
  'assets/js/spinner.js',
  'assets/js/storage.js',
  'assets/sounds/tada.mp3',
  'assets/img/icon.svg',
  'manifest.webmanifest',
  'data/config.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle GET requests for same-origin resources
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) {
    return;
  }
  // Special handling for config.json: network-first then cache
  if (req.url.endsWith('/data/config.json')) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          // Update cache with fresh copy
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return response;
        })
        .catch(() => caches.match(req))
    );
    return;
  }
  // For other requests: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req)
          .then((response) => {
            // Store in cache for offline use
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});