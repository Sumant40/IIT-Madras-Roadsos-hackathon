const CACHE_NAME = 'roadsos-cache-v2';
const API_CACHE = 'roadsos-api-v2';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

function nearbyCacheKey(request) {
  try {
    const url = new URL(request.url);
    if (!url.pathname.includes('/emergency/nearby')) return null;
    return request.clone().text().then((body) => {
      const parsed = JSON.parse(body);
      const lat = Math.round(parsed.lat * 1000) / 1000;
      const lng = Math.round(parsed.lng * 1000) / 1000;
      const types = (parsed.types || []).sort().join(',');
      const accident = parsed.accident_mode ? '1' : '0';
      return `${url.origin}/emergency/nearby?lat=${lat}&lng=${lng}&types=${types}&accident=${accident}`;
    });
  } catch {
    return Promise.resolve(null);
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  if (url.includes('/emergency/nearby') && event.request.method === 'POST') {
    event.respondWith(
      nearbyCacheKey(event.request).then((cacheKey) => {
        if (!cacheKey) {
          return fetch(event.request);
        }
        return fetch(event.request)
          .then(response => {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => cache.put(cacheKey, clone));
            return response;
          })
          .catch(() => caches.match(cacheKey));
      })
    );
    return;
  }

  if (url.includes('/emergency/country')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(API_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, API_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});
