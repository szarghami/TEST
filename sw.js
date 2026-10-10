const CACHE_NAME = 'autoyar-cache-v3';
const localUrlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-maskable-192x192.png',
  '/icon-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.png'
];

const externalUrlsToCache = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        // Cache critical local assets first
        try {
          await cache.addAll(localUrlsToCache);
        } catch (err) {
          console.warn('Failed to cache some local assets:', err);
        }
        // Cache external assets safely
        await Promise.allSettled(
          externalUrlsToCache.map(url => 
            cache.add(new Request(url, { mode: 'cors' })).catch(err => {
              console.warn(`Optional cache failed for ${url}:`, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') return;
  // Don't cache Supabase API calls (or other external dynamic APIs)
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Stale-while-revalidate strategy
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fetch failed (e.g., offline), return cachedResponse or fallback
        return cachedResponse;
      });

      // Return cached response immediately if available, otherwise network
      return cachedResponse || fetchPromise;
    })
  );
});
