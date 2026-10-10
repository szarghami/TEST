const CACHE_NAME = 'autoyar-cache-v4';
const APP_SCOPE = '/app/';

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

const CRAWLER_USER_AGENTS = [
  /Googlebot/i,
  /Bingbot/i,
  /Slurp/i,
  /DuckDuckBot/i,
  /Baiduspider/i,
  /YandexBot/i,
  /GPTBot/i,
  /ChatGPT-User/i,
  /PerplexityBot/i,
  /ClaudeBot/i,
  /anthropic-ai/i,
  /Bytespider/i,
  /Applebot/i
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        try {
          await cache.addAll(localUrlsToCache);
        } catch (err) {
          console.warn('Failed to cache some local assets:', err);
        }
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
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Never cache external third-party API or Supabase auth/data calls
  if (event.request.url.includes('supabase.co')) return;

  const userAgent = event.request.headers.get('user-agent') || '';
  const isBot = CRAWLER_USER_AGENTS.some(regex => regex.test(userAgent));

  // Crawler Passthrough: Bypass Service Worker cache completely for search and AI crawlers
  if (isBot) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
