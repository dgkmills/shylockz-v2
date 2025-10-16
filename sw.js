const CACHE_NAME = 'shylockz-cache-v2'; // Bumped version to ensure update
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/apexcharts',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // --- CHANGE: Network-first strategy for API calls ---
  // If the request is for our serverless function, always try the network first.
  // This ensures we get live data, not cached data.
  if (requestUrl.pathname.startsWith('/.netlify/functions/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If the network fails (e.g., offline), we can optionally serve a cached response if one exists.
        // For now, we'll just let it fail to make it clear there's no connection.
        console.error('API fetch failed, and no cache fallback for API calls.');
      })
    );
    return;
  }

  // For all other requests (app shell, fonts, etc.), use the cache-first strategy.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Serve from cache
        }
        return fetch(event.request); // Fetch from network
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
