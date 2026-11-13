const CACHE_NAME = 'sanctuary-pulse-v19';
const AUDIO_CACHE_NAME = 'sanctuary-audio-vault-v19';

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
];

function isCacheableStaticAsset(url) {
  const path = url.pathname;
  // Never cache Vite dev modules, source files, HMR clients, or API responses
  if (
    path.startsWith('/api/') ||
    path.startsWith('/src/') ||
    path.startsWith('/@vite') ||
    path.startsWith('/@react-refresh') ||
    path.startsWith('/@id/') ||
    path.startsWith('/@fs/') ||
    path.startsWith('/node_modules/') ||
    path.includes('hot-update') ||
    url.searchParams.has('t')
  ) {
    return false;
  }
  return (
    path === '/' ||
    path === '/manifest.json' ||
    path.startsWith('/assets/') ||
    path.endsWith('.png') ||
    path.endsWith('.jpg') ||
    path.endsWith('.jpeg') ||
    path.endsWith('.svg') ||
    path.endsWith('.webp') ||
    path.endsWith('.woff2')
  );
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== AUDIO_CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept dynamic /api/ or Vite dev module endpoints with the service worker
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // Only handle navigation & cacheable static assets; let dev modules bypass SW cleanly
  if (request.mode !== 'navigate' && !isCacheableStaticAsset(url)) {
    return;
  }

  // Network-First with runtime caching for production assets and offline shell fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic' &&
          isCacheableStaticAsset(url)
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const fallback = await caches.match('/');
          if (fallback) return fallback;
        }
        return Response.error();
      })
  );
});
